
export class Configuration {
    // Common

    
    static getProcess(): Record<string, string | undefined> { /* eslint-disable @typescript-eslint/no-unused-vars */
        try {
            return process.env ?? {};
        } catch (e) {
            return {};
        }
    }

    static get InstanceId(): string {
        return this.getProcess()?.INSTANCE_ID ?? "";
    }

    static get NodeEnv(): string {
        return this.getProcess()?.NODE_ENV ?? "";
    }

    static get EnvName(): string {
        return this.getProcess()?.ENV_NAME ?? "";
    }

    static get LogLevel(): string {
        return this.getProcess()?.LOG_LEVEL ?? "info";
    }

    static get Port(): number {
        return parseInt(this.getProcess()?.PORT ?? "0");
    }

    static get BaseUrl(): string {
        return this.getProcess()?.BASE_URL ?? "";
    }

    static get Component(): string {
        return this.getProcess()?.COMPONENT ?? "";
    }

    static get ComponentName(): string {
        return this.getProcess()?.COMPONENT_NAME ?? "local";
    }

    // Google
    static get GoogleProjectId(): string {
        return this.getProcess()?.GOOGLE_PROJECT_ID ?? "";
    }

    // ADMIN
    static get AdminEmail(): string {
        return this.getProcess()?.ADMIN_EMAIL ?? "";
    }
    
    static get AdminUsername(): string {
        return this.getProcess()?.ADMIN_USERNAME ?? "";
    }

    static get AdminPassword(): string {
        return this.getProcess()?.ADMIN_PASSWORD ?? "";
    }

    // Auth

    static get EnableLocalAuth(): boolean {
        return this.getProcess()?.ENABLE_LOCAL_AUTH === "true";
    }

    static get LocalAuthLoginUrl(): string {
        return this.getProcess()?.LOCAL_AUTH_LOGIN_URL ?? "http://localhost:3000/workforce-ui/login";
    }

    static get OAuth2IssuerUri(): string {
        return this.getProcess()?.OAUTH2_ISSUER_URI ?? "";
    }

    static get OAuth2JwksUri(): string {
        return this.getProcess()?.OAUTH2_JWKS_URI ?? "";
    }

    static get OAuth2Audience(): string {
        return this.getProcess()?.OAUTH2_AUDIENCE ?? "";
    }

    static get OAuth2ClientId(): string {
        return this.getProcess()?.OAUTH2_CLIENT_ID ?? "";
    }

    static get OAuth2ClientSecret(): string {
        return this.getProcess()?.OAUTH2_CLIENT_SECRET ?? "";
    }

    // Identity
    static get IdentityManagerType(): string {
        return this.getProcess()?.IDENTITY_MANAGER_TYPE ?? "local"
    }

    // Keycloak Identity

    static get KeycloakBaseUrl(): string {
        return this.getProcess()?.KEYCLOAK_BASE_URL ?? "";
    }

    static get KeycloakRealmName(): string {
        return this.getProcess()?.KEYCLOAK_REALM_NAME ?? "";
    }

    static get KeycloakClientId(): string {
        return this.getProcess()?.KEYCLOAK_ADMIN_CLIENT_ID ?? "";
    }

    static get KeycloakUsername(): string {
        return this.getProcess()?.KEYCLOAK_ADMIN_USERNAME ?? "";
    }

    static get KeycloakPassword(): string {
        return this.getProcess()?.KEYCLOAK_ADMIN_PASSWORD ?? "";
    }

    // Database

    static get DbConnectionString(): string {
        return this.getProcess()?.DB_CONNECTION_STRING ?? "";
    }

    // Broker

    static get BrokerMode(): string {
        return this.getProcess()?.BROKER_MODE ?? "";
    }

    static get BrokerUri(): string {
        return this.getProcess()?.BROKER_URI ?? "";
    }

    static get BrokerUsername(): string {
        return this.getProcess()?.BROKER_USERNAME ?? "";
    }

    static get BrokerPassword(): string {
        return this.getProcess()?.BROKER_PASSWORD ?? "";
    }

    // Cache
    static get CacheMode(): string {
        return this.getProcess()?.CACHE_MODE ?? "";
    }

    static get CacheUri(): string {
        return this.getProcess()?.CACHE_URI ?? "";
    }

    static get CacheUsername(): string {
        return this.getProcess()?.CACHE_USERNAME ?? "";
    }

    static get CachePassword(): string {
        return this.getProcess()?.CACHE_PASSWORD ?? "";
    }

    // Vector DB

    static get VectorDbHost(): string {
        return this.getProcess()?.VECTOR_DB_HOST ?? "localhost";
    }

    static get VectorDbPort(): number {
        return parseInt(this.getProcess()?.VECTOR_DB_PORT ?? "5000");
    }

    static get VectorDbGrpcHost(): string | undefined {
        return this.getProcess()?.VECTOR_DB_GRPC_HOST;
    }

    static get VectorDbGrpcPort(): number | undefined {
        const port = this.getProcess()?.VECTOR_DB_GRPC_PORT;
        if (!port) {
            return undefined;
        }
        return parseInt(port);
    }

    static get VectorDbScheme(): string {
        return this.getProcess()?.VECTOR_DB_SCHEME ?? "http";
    }

    static get VectorDbApiKey(): string {
        return this.getProcess()?.VECTOR_DB_API_KEY ?? "";
    }





    // Services

    static get SecretServiceUri(): string {
        return this.getProcess()?.SECRET_SERVICE_URI ?? "";
    }

    static get NlmIngestorHost(): string {
        return this.getProcess()?.NLM_INGESTOR_HOST ?? "localhost:5010";
    }

    static get StorageApiUri(): string {
        return this.getProcess()?.STORAGE_API_URI ?? "";
    }

    static get GithubApiToken(): string {
        return this.getProcess()?.GITHUB_API_TOKEN ?? "";
    }


    // Keys

    static get EncryptionPrivateKey(): string {
        return this.getProcess()?.ENCRYPTION_PRIVATE_KEY ?? "";
    }

    static get EncryptionPublicKey(): string {
        return this.getProcess()?.ENCRYPTION_PUBLIC_KEY ?? "";
    }

    static get EncryptionKeyPassword(): string {
        return this.getProcess()?.ENCRYPTION_KEY_PASSWORD ?? "";
    }

    static get SecretServicePublicKey(): string {
        return this.getProcess()?.SECRET_SERVICE_PUBLIC_KEY ?? "";
    }

    static get WorkforceApiPublicKey(): string {
        return this.getProcess()?.WORKFORCE_API_PUBLIC_KEY ?? "";
    }

    static get WorkforceEnginePublicKey(): string {
        return this.getProcess()?.WORKFORCE_ENGINE_PUBLIC_KEY ?? "";
    }

    static get StorageApiPublicKey(): string {
        return this.getProcess()?.STORAGE_API_PUBLIC_KEY ?? "";
    }

    // URLS
    static get ChatScriptUrl(): string {
        return this.getProcess()?.CHAT_SCRIPT_URL ?? "";
    }
}