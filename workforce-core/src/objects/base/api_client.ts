import { Configuration } from "../../config/configuration.js";
import { Logger } from "../../logging/logger.js";
import { jsonParse } from "../../util/json.js";

export class ApiClient {
    protected _token: string;
    protected _oauth2IssuerUrl: string;
    protected _oauth2ClientId: string;
    protected _oauth2ClientSecret: string;
    protected _oauth2Audience: string;
    protected logger: Logger;
    protected _tokenEndpoint: string | undefined;

    constructor(loggerName: string) {
        this.logger = Logger.getInstance(loggerName);
        this._token = "";
        this._oauth2IssuerUrl = Configuration.OAuth2IssuerUri;
        this._oauth2ClientId = Configuration.OAuth2ClientId;
        this._oauth2ClientSecret = Configuration.OAuth2ClientSecret;
        this._oauth2Audience = Configuration.OAuth2Audience;
    }

    protected async getTokenEndpoint(): Promise<string> {
        if (!this._tokenEndpoint) {
          try {
            const response = await fetch(
              `${this._oauth2IssuerUrl}/.well-known/openid-configuration`
            );
            const json = await response.json() as { token_endpoint?: string, error?: string };
            if (json.error) {
              this.logger.error(
                `getTokenEndpoint() Error getting token endpoint: ${json.error}`
              );
              throw new Error(json.error);
            }

            if (!json.token_endpoint) {
              this.logger.error(
                `getTokenEndpoint() Error getting token endpoint: no token endpoint`
              );
              throw new Error("No token endpoint");
            }

            this._tokenEndpoint = json.token_endpoint;
          } catch (err) {
            this.logger.error(
              `getTokenEndpoint() Error getting token endpoint: `, err
            );
            throw err;
          }
        }

        this.logger.debug(
          `getTokenEndpoint() Token endpoint is ${this._tokenEndpoint}`
        );
        return this._tokenEndpoint;
      }
    
      protected async authenticate(): Promise<void> {
        this.logger.debug(
          `authenticate() Authenticating with ${this._oauth2IssuerUrl}`
        );
        const tokenEndpoint = await this.getTokenEndpoint();
        const response = await fetch(`${tokenEndpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `grant_type=client_credentials&client_id=${this._oauth2ClientId}&client_secret=${this._oauth2ClientSecret}&audience=secret-service`,
        }).catch((err) => {
          this.logger.error(`authenticate() Error authenticating: ${err}`);
          throw err;
        });
        if (!response.ok) {
          this.logger.error(
            `authenticate() Authentication failed with status ${response.status}`
          );
          throw new Error(response.statusText);
        }
        const json = await response.json().catch((err) => {
          this.logger.error(`authenticate() Error parsing response: ${err}`);
          throw err;
        }) as { access_token?: string, error?: string };
        if (json.error) {
          this.logger.error(
            `authenticate() Authentication failed with error ${json.error}`
          );
          throw new Error(json.error);
        }

        if(!json.access_token) {
            this.logger.error(`authenticate() Authentication failed: no access token`);
            throw new Error("No access token");
        }

        this.logger.debug(`authenticate() json is ${JSON.stringify(json)}`);
          
        this.logger.debug(`authenticate() Authentication successful`);
        this.logger.debug(`authenticate() Token is ${json.access_token}`);
        this._token = json.access_token;
      }
    
      protected async checkAuthentication(): Promise<void> {
        if (!this._token) {
          await this.authenticate();
        } else {
          // check if token is expired
          // if expired, authenticate
          // if not expired, do nothing
          try {
            const decoded = jsonParse<{exp?: number}>(
              Buffer.from(this._token.split(".")[1], "base64").toString()
            );

            if (!decoded?.exp) {
              this.logger.error(
                `checkAuthentication() Error checking authentication: no exp`
              );
              throw new Error("No exp");
            }

            const expiresAt = new Date(decoded.exp * 1000);
            const now = new Date();
            const plusOneMinute = new Date(now.getTime() + 60000);
            if (expiresAt < plusOneMinute) {
              await this.authenticate();
            }
          } catch (err) {
            this.logger.error(
              `checkAuthentication() Error checking authentication: `, err
            );
            throw err;
          }
        }
      }
}