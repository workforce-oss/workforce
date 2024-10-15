import { getRandomValues, subtle } from 'crypto';
import * as vscode from 'vscode';

export type AuthSession = {
    auth: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        tokenType: string;
        issuedAt: Date;
    },
}

export class Auth {
    session: AuthSession | undefined;
    static instance: Auth | undefined;
    issuerUri: string;
    token_endpoint?: string;
    authorization_endpoint?: string;
    client_id: string;
    scope: string;
    state: string = "";
    codeVerifier: string = "";
    context: vscode.ExtensionContext;

    logoutCallBack: (() => void) | undefined;

    private constructor(issuerUri: string, clientId: string, scope: string, context: vscode.ExtensionContext) {
        this.issuerUri = issuerUri;
        this.client_id = clientId;
        this.scope = scope;
        this.context = context;
    }

    GetVsCodeUri(): string {
        return `vscode://${this.context.extension.id}/auth`;
    }

    public setLogoutCallBack(callback: () => void): void {
        this.logoutCallBack = callback;
    }

    private async fetchOpenIdConfiguration(): Promise<void> {
        if (!this.issuerUri) {
            throw new Error("Issuer URI not set");
        }
        if (!this.client_id) {
            throw new Error("Client ID not set");
        }
        if (!this.scope) {
            throw new Error("Scope not set");
        }
        if (this.token_endpoint && this.authorization_endpoint) {
            return;
        }
        const response = await fetch(`${this.issuerUri}/.well-known/openid-configuration`);
        const json = await response.json() as { token_endpoint: string, authorization_endpoint: string };
        this.token_endpoint = json.token_endpoint;
        this.authorization_endpoint = json.authorization_endpoint;
    }



    public async handleRedirect(uri: string, channel: vscode.OutputChannel): Promise<void> {
        channel.appendLine(`Redirect URI: ${uri}`);
        const queryParts = uri.split("?");
        if (queryParts.length < 2) {
            throw new Error("Invalid redirect URI");
        }

        const queryValues = queryParts[1].split("&");
        const queryMap: { [key: string]: string } = {};
        queryValues.forEach((value) => {
            const parts = value.split("=");
            queryMap[parts[0]] = parts[1];
        });

        const code = queryMap["code"];
        const state = queryMap["state"];

        if (!code || !state) {
            throw new Error("Invalid code or state");
        }
        if (state !== this.state) {
            throw new Error("Invalid state");
        }

        const tokenUrl = this.token_endpoint;
        const clientId = this.client_id;
        const grantType = "authorization_code";
        const codeVerifier = this.codeVerifier;
        if (!codeVerifier) {
            throw new Error("Code verifier not found");
        }
        const codeChallenge = await Auth.generateCodeChallengeFromVerifier(codeVerifier);
        const codeChallengeMethod = "S256";
        const body = `client_id=${clientId}&grant_type=${grantType}&code=${code}&redirect_uri=${this.GetVsCodeUri()}&code_verifier=${codeVerifier}&code_challenge=${codeChallenge}&code_challenge_method=${codeChallengeMethod}&audience=workforce-api`;

        const headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        };
        if (!tokenUrl) {
            throw new Error("Token URL not set");
        }
        const response = await fetch(tokenUrl, {
            method: "POST",
            headers: headers,
            body: body
        });
        const json = await response.json() as { access_token: string, refresh_token: string, expires_in: number, token_type: string, error: string };
        if (json.error) {
            channel.appendLine(JSON.stringify(json, null, 2));
            console.error(JSON.stringify(json, null, 2));
            throw new Error(json.error);
        }

        const session: AuthSession = {
            auth: {
                accessToken: json.access_token,
                refreshToken: json.refresh_token,
                expiresIn: json.expires_in,
                tokenType: json.token_type,
                issuedAt: new Date()
            },
        };
        this.session = session;
        this.context.secrets.store("session", JSON.stringify(session));

    }

    public static init(issuerUri: string, client_id: string, context: vscode.ExtensionContext): void {
        if (!Auth.instance) {
            Auth.instance = new Auth(issuerUri, client_id, "openid", context);
        }
    }

    public static getUserId(): string {
        if (!Auth.instance) {
            throw new Error("Auth not initialized");
        }
        if (!Auth.instance.session) {
            throw new Error("Session not initialized");
        }
        const accessToken = Auth.instance.session.auth.accessToken;
        const payload = accessToken.split(".")[1];
        const json = JSON.parse(atob(payload));
        return json.sub;
    }

    public static async logout(): Promise<void> {
        if (!Auth.instance) {
            throw new Error("Auth not initialized");
        }
        Auth.instance.session = undefined;
        Auth.instance.context.secrets.store("session", "");
        if (Auth.instance.logoutCallBack) {
            Auth.instance.logoutCallBack();
        }
    }

    public static async session(): Promise<AuthSession | undefined> {
        if (!Auth.instance) {
            throw new Error("Auth not initialized");
        }
        if (Auth.instance.session) {
            return Auth.instance.session;
        } else if (!Auth.instance.token_endpoint || !Auth.instance.authorization_endpoint) {
            await Auth.instance.fetchOpenIdConfiguration();
        }

        // check if we have a session in local storage
        const sessionString = await Auth.instance.context.secrets.get("session");
        if (!sessionString) {
            return;
        }
        const session = JSON.parse(sessionString) as AuthSession | undefined;
        console.log(session);
        console.log(JSON.stringify(session, null, 2));
        if (session) {
            const now = new Date();
            const issuedAt = new Date(session.auth.issuedAt);
            const expiresAt = new Date(issuedAt.getTime() + session.auth.expiresIn * 1000);
            if (now < expiresAt) {
                Auth.instance.session = session;
                return session;
            } else {
                await Auth.logout();
            }
        } else {
            await Auth.logout();
        }
    }


    static async GetAuthUrl(): Promise<string> {
        if (!Auth.instance) {
            throw new Error("Auth not initialized");
        }
        // go to the authorization endpoint to perform authorization code flow
        const codeVerifier = Auth.generateCodeVerifier();
        Auth.instance.codeVerifier = codeVerifier;
        const codeChallenge = await Auth.generateCodeChallengeFromVerifier(codeVerifier);
        const state = Auth.generateState();
        Auth.instance.state = state;
        const codeChallengeMethod = "S256";

        const redirectUri = Auth.instance.GetVsCodeUri();
        const responseType = "code";
        const scope = Auth.instance.scope;
        const authorizationUrl = Auth.instance.authorization_endpoint;
        const clientId = Auth.instance.client_id;
        const url = `${authorizationUrl}?client_id=${clientId}&response_type=${responseType}&scope=${scope}&redirect_uri=${redirectUri}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=${codeChallengeMethod}`;
        console.log(url);
        return url;
    }


    private static generateState(): string {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }


    // GENERATING CODE VERIFIER
    private static dec2hex(dec: number) {
        return ("0" + dec.toString(16)).substr(-2);
    }

    private static generateCodeVerifier() {
        var array = new Uint32Array(56 / 2);
        getRandomValues(array);
        return Array.from(array, this.dec2hex).join("");
    }
    private static sha256(plain: string) {
        // returns promise ArrayBuffer
        const encoder = new TextEncoder();
        const data = encoder.encode(plain);
        return subtle.digest("SHA-256", data);
    }

    private static base64urlencode(a: ArrayBuffer) {
        var str = "";
        var bytes = new Uint8Array(a);
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            str += String.fromCharCode(bytes[i]);
        }
        return btoa(str)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
    }

    private static async generateCodeChallengeFromVerifier(v: string) {
        var hashed = await this.sha256(v);
        var base64encoded = this.base64urlencode(hashed);
        return base64encoded;
    }
}