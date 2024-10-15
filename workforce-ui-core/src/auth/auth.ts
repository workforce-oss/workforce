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

    tokenExpiryTimeout: any;

    refreshTokenCallback: ((session: AuthSession) => void) | undefined;

    private constructor(issuerUri: string, clientId: string, scope: string) {
        this.issuerUri = issuerUri;
        this.client_id = clientId;
        this.scope = scope;
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
        const response = await fetch(`${this.issuerUri}/.well-known/openid-configuration`).catch((err) => {
            console.error(err);
            throw new Error("Failed to fetch OpenID configuration");
        });
        if (!response.ok || response.status !== 200) {
            console.error(response);
            throw new Error("Failed to fetch OpenID configuration");
        }
        const json = await response.json().catch((err) => {
            console.error(err);
            console.error(response);
            throw new Error("Failed to parse OpenID configuration");
        });
        this.token_endpoint = json.token_endpoint;
        this.authorization_endpoint = json.authorization_endpoint;
    }

    private async handleRedirect(): Promise<void> {

        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        if (!code || !state) {
            throw new Error("Invalid code or state");
        }
        if (state !== localStorage.getItem("state")) {
            throw new Error("Invalid state");
        }
        // remove the code and state from the URL
        // it may have other query parameters, so we need to remove only the code and state
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("code");
        newUrl.searchParams.delete("state");

        window.history.replaceState({}, document.title, newUrl);

        const tokenUrl = this.token_endpoint;
        const clientId = this.client_id;
        const grantType = "authorization_code";
        const codeVerifier = localStorage.getItem("codeVerifier");
        if (!codeVerifier) {
            throw new Error("Code verifier not found");
        }
        const codeChallenge = await Auth.generateCodeChallengeFromVerifier(codeVerifier);
        const codeChallengeMethod = "S256";
        const body = `client_id=${clientId}&grant_type=${grantType}&code=${code}&redirect_uri=${window.location.href.split("?")[0]}&code_verifier=${codeVerifier}&code_challenge=${codeChallenge}&code_challenge_method=${codeChallengeMethod}&audience=https://api/`;

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
        const json = await response.json();
        if (json.error) {
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
        if (this.tokenExpiryTimeout) {
            clearTimeout(this.tokenExpiryTimeout);
        }
        this.tokenExpiryTimeout = setTimeout(() => {
            console.log("Refreshing token");
            Auth.refreshToken();
        }, (session.auth.expiresIn * 1000) - 60000);

        this.session = session;
        localStorage.setItem("session", JSON.stringify(session));
    }

    public static init(issuerUri: string, client_id: string): void {
        if (!Auth.instance) {
            Auth.instance = new Auth(issuerUri, client_id, "openid offline_access");
        }
    }

    public static async refreshToken(): Promise<void> {
        if (!Auth.instance) {
            throw new Error("Auth not initialized");
        }
        if (!Auth.instance.session) {
            console.error("refreshToken: Session not initialized");
            Auth.instance.session = await Auth.session();
            Auth.instance.refreshTokenCallback?.(Auth.instance.session);
        }
        const tokenUrl = Auth.instance.token_endpoint;
        const clientId = Auth.instance.client_id;
        const grantType = "refresh_token";
        const refreshToken = Auth.instance.session.auth.refreshToken;
        const body = `client_id=${clientId}&grant_type=${grantType}&refresh_token=${refreshToken}`;

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
        if (response.status !== 200) {
            console.error("Failed to refresh token", response.status);
            //we need  to re-authenticate
            Auth.instance.session = undefined;
            localStorage.removeItem("session");
            Auth.instance.session = await Auth.session();
            Auth.instance.refreshTokenCallback?.(Auth.instance.session);
            return;
        }
        const json = await response.json();
        if (json.error) {
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
        if (Auth.instance.tokenExpiryTimeout) {
            clearTimeout(Auth.instance.tokenExpiryTimeout);
        }
        Auth.instance.session = session;
        Auth.instance.tokenExpiryTimeout = setTimeout(() => {
            console.log("Refreshing token");
            this.refreshToken();
        }, (session.auth.expiresIn * 1000) - 60000);

        localStorage.setItem("session", JSON.stringify(session));
        Auth.instance.refreshTokenCallback?.(Auth.instance.session);
    }

    public static setRefreshTokenCallback(callback: (session: AuthSession) => void): void {
        if (!Auth.instance) {
            throw new Error("Auth not initialized");
        }
        Auth.instance.refreshTokenCallback = callback;
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

    public static getOrgId(): string {
        if (!Auth.instance) {
            throw new Error("Auth not initialized");
        }
        if (!Auth.instance.session) {
            throw new Error("Session not initialized");
        }
        const accessToken = Auth.instance.session.auth.accessToken;
        const payload = accessToken.split(".")[1];
        const json = JSON.parse(atob(payload));
        return json.orgId;
    }

    public static async session(): Promise<AuthSession | undefined> {
        if (!Auth.instance) {
            console.error("Auth not initialized");
            throw new Error("Auth not initialized");
        }
        if (Auth.instance.session) {
            const session = Auth.instance.session;
            const now = new Date();
            const issuedAt = new Date(session.auth.issuedAt);
            const expiresAt = new Date(issuedAt.getTime() + (session.auth.expiresIn * 1000));
            if (now > expiresAt) {
                console.log("session expired", now, expiresAt);
                await this.refreshToken();
            }
            console.log(`session valid until ${expiresAt}`);
            return Auth.instance.session;
        } else if (!Auth.instance.token_endpoint || !Auth.instance.authorization_endpoint) {
            console.log("no session, fetching openid configuration");
            await Auth.instance.fetchOpenIdConfiguration();
        }

        // check if we have a session in local storage
        const sessionString = localStorage.getItem("session");
        if (sessionString) {
            const session = JSON.parse(sessionString) as AuthSession;
            Auth.instance.session = session;
            const now = new Date();
            const issuedAt = new Date(session.auth.issuedAt);
            const expiresAt = new Date(issuedAt.getTime() + (session.auth.expiresIn * 1000));
            if (now < expiresAt) {
                console.log(`session valid until ${expiresAt}`);
            } else {
                // refresh the token
                console.log("session expired", now, expiresAt);
                await this.refreshToken();
            }

            return Auth.instance.session;
        }

        if (Auth.instance && window.location.href.includes("code=")) {
            console.log("handling redirect");
            await Auth.instance.handleRedirect();
            return Auth.instance.session;
        } else {
            console.log("no session, redirecting to authorization endpoint");
            // go to the authorization endpoint to perform authorization code flow
            const codeVerifier = Auth.generateCodeVerifier();
            localStorage.setItem("codeVerifier", codeVerifier);
            const codeChallenge = await Auth.generateCodeChallengeFromVerifier(codeVerifier);
            const state = Auth.generateState();
            localStorage.setItem("state", state);
            const codeChallengeMethod = "S256";
            const redirectUri = encodeURIComponent(window.location.href);
            const responseType = "code";
            const scope = Auth.instance.scope;
            const authorizationUrl = Auth.instance.authorization_endpoint;
            const clientId = Auth.instance.client_id;
            const url = `${authorizationUrl}?client_id=${clientId}&response_type=${responseType}&scope=${scope}&redirect_uri=${redirectUri}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=${codeChallengeMethod}`;
            console.log(url);

            //navigate to the authorization endpoint
            window.location.href = url;

            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (Auth.instance && Auth.instance.session) {
                        resolve(Auth.instance.session);
                    } else {
                        reject("Timeout");
                    }
                }, 5000);
            });
        }
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
        window.crypto.getRandomValues(array);
        return Array.from(array, this.dec2hex).join("");
    }
    private static sha256(plain: string) {
        // returns promise ArrayBuffer
        const encoder = new TextEncoder();
        const data = encoder.encode(plain);
        return window.crypto.subtle.digest("SHA-256", data);
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