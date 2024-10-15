import { Configuration } from "../../../../config/configuration.js";
import { Logger } from "../../../../logging/logger.js";
import { AuthData } from "./openapi_types.js";

export const authTypes = [
    "anonymous",
    "basic",
    "bearer_token",
    "api_key",
    "mtls",
    "oauth2_implicit",
    "oauth2_password",
    "oauth2_client_credentials",
    "oauth2_authorization_code",
    "oidc",
] as const;

export type AuthType = typeof authTypes[number];

export class OpenAPIAuthHelper {
    static authCache = new Map<string, AuthData>();

    static selectAuthType(openApiDocument: {
        components?: Record<string, unknown>,
        security?: Record<string, string[]>[],
    }, variables: Record<string, unknown>): { authType: AuthType, authData: Record<string, unknown> } {
        const schemes = openApiDocument.components?.securitySchemes as Record<string,{
            type: string,
            scheme?: string,
            bearerFormat?: string,
            flows?: Record<string, unknown>,
            openIdConnectUrl?: string,
            in?: string,
            name?: string,
        }> | undefined;
        const security = openApiDocument.security;

        if (security) {
            for (const scheme of security) {
                for (const [key] of Object.entries(scheme)) {
                    if (schemes?.[key]) {
                        const type = schemes[key].type;
                        if (type === "oauth2") {
                            if (schemes[key].flows?.implicit) {
                                if (this.checkVariables("oauth2_implicit", variables)) {
                                    return { authType: "oauth2_implicit", authData: {} };
                                }
                            }
                            if (schemes[key].flows?.password) {
                                if (this.checkVariables("oauth2_password", variables)) {
                                    return { authType: "oauth2_password", authData: {} };
                                }
                            } if (schemes[key].flows?.clientCredentials) {
                                if (this.checkVariables("oauth2_client_credentials", variables)) {
                                    return { authType: "oauth2_client_credentials", authData: schemes[key].flows.clientCredentials as Record<string, unknown> };
                                }
                            } if (schemes[key].flows?.authorizationCode) {
                                if (this.checkVariables("oauth2_authorization_code", variables)) {
                                    return { authType: "oauth2_authorization_code", authData: schemes[key].flows.authorizationCode as Record<string, unknown> };
                                }
                            }
                        } else if (type === "openIdConnect") {
                            if (this.checkVariables("oidc", variables)) {
                                return { authType: "oidc", authData: { openIdConnectUrl: schemes[key].openIdConnectUrl } };
                            }
                        } else if (type === "http") {
                            let scheme = schemes[key].scheme;
                            if (!scheme) {
                                scheme = "basic";
                            } else {
                                scheme = scheme.toLowerCase();
                            }
                            if (scheme === "basic") {
                                if (this.checkVariables("basic", variables)) {
                                    return { authType: "basic", authData: {} };
                                }
                            } if (scheme === "bearer") {
                                if (this.checkVariables("bearer_token", variables)) {
                                    return { authType: "bearer_token", authData: {} };
                                }
                            }
                        } else if (type === "apiKey") {
                            if (this.checkVariables("api_key", variables)) {
                                return { authType: "api_key", authData: { in: schemes[key].in, name: schemes[key].name } };
                            }
                        } else if (type === "mutualTLS") {
                            if (this.checkVariables("mtls", variables)) {
                                return { authType: "mtls", authData: {} };
                            }
                        }

                    }
                }
            }
        }

        return { authType: "anonymous", authData: {} };
    }

    static getAuthFromCache(key: string): AuthData | undefined {
        return this.authCache.get(key);
    }

    static setAuthToCache(key: string, authData: AuthData) {
        this.authCache.set(key, authData);
    }

    static clearAuthFromCache(key: string) {
        this.authCache.delete(key);
    }

    static checkVariables(authType: AuthType, variables?: Record<string, unknown>): boolean {
        if (!variables) {
            return false;
        }
        switch (authType) {
            case "anonymous":
                return true;
            case "basic":
                return Object.keys(variables).includes("username") && Object.keys(variables).includes("password");
            case "bearer_token":
                return Object.keys(variables).includes("bearer_token");
            case "api_key":
                return Object.keys(variables).includes("api_key");
            case "mtls":
                return Object.keys(variables).includes("mtls_cert") && Object.keys(variables).includes("mtls_key") && Object.keys(variables).includes("mtls_ca");
            case "oauth2_implicit":
                return Object.keys(variables).includes("client_id");
            case "oauth2_password":
                return Object.keys(variables).includes("client_id") && Object.keys(variables).includes("client_secret") && Object.keys(variables).includes("username") && Object.keys(variables).includes("password");
            case "oauth2_client_credentials":
                return Object.keys(variables).includes("client_id") && Object.keys(variables).includes("client_secret");
            case "oauth2_authorization_code":
                return Object.keys(variables).includes("client_id") && Object.keys(variables).includes("client_secret");
            case "oidc":
                return Object.keys(variables).includes("client_id") && Object.keys(variables).includes("client_secret");
            default:
                return false;
        }
    }

    static async getAuth(openApiDocument: Record<string, unknown>, variables: Record<string, unknown>): Promise<AuthData> {
        const { authType, authData } = this.selectAuthType(openApiDocument, variables);
        Logger.getInstance("OpenAPIAuthHelper").debug(`getAuth() authType=${authType}`);
        switch (authType) {
            case "anonymous":
                return { header: "", headerValue: "" };
            case "basic":
                return this.getAuthForBasicAuth(authData, variables);
            case "bearer_token":
                return this.getAuthForBearerToken(authData, variables);
            case "api_key":
                return this.getAuthForApiKey(authData, variables);
            case "mtls":
                return this.getAuthForMtls(authData, variables);
            case "oauth2_implicit":
                return this.getAuthForOauth2Implicit(authData, variables);
            case "oauth2_password":
                return this.getAuthForOauth2Password(authData, variables);
            case "oauth2_client_credentials":
                return this.getAuthForOauth2ClientCredentials(authData, variables);
            case "oauth2_authorization_code":
                return this.getAuthForOauth2AuthorizationCode(authData, variables);
            case "oidc":
                return this.getAuthForOidc(authData, variables);
            default:
                throw new Error("Unknown auth type.");

        }
    }

    static getAuthForBasicAuth(authData: Record<string, unknown>, variables: Record<string, unknown>): { header: string, headerValue: string } {
        const username = variables?.username as string | undefined;
        const password = variables?.password as string | undefined;
        if (!username || !password) {
            throw new Error("Username or password not provided.");
        }
        const encoded = Buffer.from(`${username}:${password}`).toString("base64");
        return { header: "Authorization", headerValue: `Basic ${encoded}` };
    }

    static getAuthForBearerToken(authData: Record<string, unknown>, variables: Record<string, unknown>):{ header: string, headerValue: string } {
        const bearerToken = variables?.bearer_token as string | undefined;
        if (!bearerToken) {
            throw new Error("Bearer token not provided.");
        }
        return { header: "Authorization", headerValue: `Bearer ${bearerToken}` };
    }

    static getAuthForApiKey(authData: Record<string, unknown>, variables: Record<string, unknown>): { header: string, headerValue: string } {
        const apiKeyHeader = authData.in as string | undefined;
        const apiKey = variables?.api_key as string | undefined;
        if (!apiKey || !apiKeyHeader) {
            throw new Error("API key or API key header not provided.");
        }
        return {header: apiKeyHeader, headerValue: apiKey };
    }

    static getAuthForMtls(authData: Record<string, unknown>, variables: Record<string, unknown>):{ cert: string, key: string, ca: string } {
        const cert = variables?.mtls_cert as string | undefined;
        const key = variables?.mtls_key as string | undefined;
        const ca = variables?.mtls_ca as string | undefined;
        if (!cert || !key || !ca) {
            throw new Error("Certificate, key, or CA not provided.");
        }
        return { cert, key, ca };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static getAuthForOauth2Implicit(authData: Record<string, unknown> , variables: Record<string, unknown>): { header: string, headerValue: string } {
        
        throw new Error("Implicit flow not supported.")
    }

    static async getAuthForOauth2Password(authData: Record<string, unknown>, variables: Record<string, unknown>): Promise<{ header: string, headerValue: string }> {
        const tokenUrl = authData.tokenUrl as string | undefined;
        if (!tokenUrl) {
            throw new Error("Token URL not provided.");
        }
        const username = variables?.username as string | undefined;
        const password = variables?.password as string | undefined;
        const clientId = variables?.client_id as string | undefined;
        const clientSecret = variables?.client_secret as string | undefined;

        if (!username || !password || !clientId || !clientSecret) {
            throw new Error("Username, password, client ID, or client secret not provided.");
        }

        const body = new URLSearchParams();
        body.append("grant_type", "password");
        body.append("username", username);
        body.append("password", password);
        body.append("client_id", clientId);
        body.append("client_secret", clientSecret);

        const resp = await fetch(tokenUrl, {
            method: "POST",
            body: body,
        });

        const json = await resp.json() as Record<string, unknown>;

        if (json.error) {
            throw new Error(json.error as string);
        }

        const accessToken = json.access_token as string | undefined;
        if (!accessToken) {
            throw new Error("Access token not provided.");
        }

        return { header: "Authorization", headerValue: `Bearer ${accessToken}` };

    }

    static async getAuthForOauth2ClientCredentials(authData: Record<string, unknown>, variables: Record<string, unknown>): Promise<{ header: string, headerValue: string }> {
        const tokenUrl = authData.tokenUrl as string | undefined;
        if (!tokenUrl) {
            throw new Error("Token URL not provided.");
        }
        const clientId = variables?.client_id as string | undefined;
        const clientSecret = variables?.client_secret as string | undefined;

        if (!clientId || !clientSecret) {
            throw new Error("Client ID or client secret not provided.");
        }

        const body = new URLSearchParams();
        body.append("grant_type", "client_credentials");
        body.append("client_id", clientId);
        body.append("client_secret", clientSecret);

        const resp = await fetch(tokenUrl, {
            method: "POST",
            body: body,
        });

        const json = await resp.json() as Record<string, unknown>;

        if (json.error) {
            throw new Error(json.error as string);
        }

        const accessToken = json.access_token as string | undefined;
        if (!accessToken) {
            throw new Error("Access token not provided.");
        }

        return { header: "Authorization", headerValue: `Bearer ${accessToken}` };
    }

    static getAuthForOauth2AuthorizationCode(authData: Record<string, unknown>, variables: Record<string, unknown>): { authType: string, tokenUrl: string, authorizationUrl: string, state: string, scope: string } {
        const tokenUrl = authData.tokenUrl as string | undefined;
        if (!tokenUrl) {
            throw new Error("Token URL not provided.");
        }
        const authorizeUrl = authData.authorizationUrl as string | undefined;
        if (!authorizeUrl) {
            throw new Error("Authorization URL not provided.");
        }
        const clientId = variables?.client_id as string | undefined;

        if (!clientId) {
            throw new Error("Client ID not provided.");
        }

        let scopes = "";
        if (authData.scopes) {
            scopes = Object.keys(authData.scopes).join(" ");
        }

        const { url, state, scope } = this.generateAuthorizeUrl(authorizeUrl, Configuration.BaseUrl, clientId, scopes);
        return { authType: "oauth2_authorization_code", tokenUrl, authorizationUrl: url, state, scope };
    }

    static generateAuthorizeUrl(authorizeUrl: string, serverBaseUrl: string, clientId: string, baseScopes: string): { url: string, state: string, scope: string } {
        const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        const redirectUri = `${serverBaseUrl}/workforce-api/auth/callback`;
        const scope = `openid ${baseScopes}`;
        const body = new URLSearchParams();
        body.append("response_type", "code");
        body.append("client_id", clientId);
        body.append("redirect_uri", redirectUri);
        body.append("scope", scope);
        body.append("state", state);

        // if google, add prompt=consent select_account
        if (authorizeUrl.includes("google")) {
            body.append("prompt", "consent select_account");
        }

        const url = `${authorizeUrl}?${body.toString()}`;

        return { url, state, scope };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static getAuthForOidc(openApiDocument: Record<string, unknown>, variables: Record<string, unknown>): { header: string, headerValue: string } {
        throw new Error("OIDC flow not supported.")
    }
}