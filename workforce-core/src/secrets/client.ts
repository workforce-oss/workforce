import { Configuration } from "../config/configuration.js";
import { ApiClient } from "../objects/base/api_client.js";

export class SecretServiceClient extends ApiClient {
  private _apiUrl: string;

  constructor() {
    super("SecretServiceClient");
    this._apiUrl = Configuration.SecretServiceUri;

  }

  public async getSecret(id: string): Promise<string | undefined> {
    await this.checkAuthentication();
    const response = await fetch(`${this._apiUrl}/secrets/${id}`, {
      headers: {
        Authorization: `Bearer ${this._token}`,
        Accept: "application/json",
      },
    });
    if (response.status === 404) {
      this.logger.debug(`getSecret() Secret ${id} not found`);
      return undefined;
    } else if (!response.ok) {
      this.logger.error(
        `getSecret() Error getting secret ${id}: ${response.statusText}`
      );
      throw new Error(response.statusText);
    }
    const json = await response.json() as { data: string; error: string };
    if (json.error) {
      throw new Error(json.error);
    }
    return json.data;
  }
  public async storeSecret(
    data: string,
    orgId: string,
    secretId?: string
  ): Promise<string | undefined> {
    await this.checkAuthentication();

    const method = secretId ? "PUT" : "POST";

    const url = secretId
      ? `${this._apiUrl}/secrets/${secretId}`
      : `${this._apiUrl}/secrets`;
    this.logger.debug(
      `storeSecret() Storing secret for org ${orgId} at ${url}`
    );
    const response = await fetch(url, {
      method: method,
      headers: {
        Authorization: `Bearer ${this._token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: secretId,
        data,
        orgId,
      }),
    }).catch((e) => {
      this.logger.error(`storeSecret() Error storing secret: ${e}`);
      throw e;
    });

    if (!response.ok) {
      this.logger.error(
        `storeSecret() Error storing secret: ${JSON.stringify(response)}`
      );
      throw new Error(response.statusText);
    }
    const json = await response.json() as { id: string; error: string };
    if (json.error) {
      this.logger.error(`storeSecret() Error storing secret: ${json.error}`);
      throw new Error(json.error);
    }
    return json.id;
  }

  public async deleteSecret(id: string): Promise<void> {
    await this.checkAuthentication();
    const response = await fetch(`${this._apiUrl}/secrets/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this._token}`,
        Accept: "application/json",
      },
    });
    const json = await response.json() as { error: string };
    if (json.error) {
      throw new Error(json.error);
    }
  }
}
