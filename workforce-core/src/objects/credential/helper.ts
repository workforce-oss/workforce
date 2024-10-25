import { EncryptionService } from "../../crypto/encryption_service.js";
import { Logger } from "../../logging/logger.js";
import { SecretServiceClient } from "../../secrets/client.js";
import { jsonParse } from "../../util/json.js";
import { ObjectType } from "../base/factory/types.js";
import { BaseConfig } from "../base/model.js";
import { CredentialDb } from "./db.js";
import { CredentialConfig } from "./model.js";

export class CredentialHelper {
  private logger = Logger.getInstance("CredentialHelper");

  private static _instance: CredentialHelper;
  private _client: SecretServiceClient;
  private _secretCache = new Map<string, string>();

  private constructor() {
    this._client = new SecretServiceClient();
  }

  public static get instance(): CredentialHelper {
    if (!CredentialHelper._instance) {
      CredentialHelper._instance = new CredentialHelper();
    }
    return CredentialHelper._instance;
  }

  public async mergeCredential<T extends BaseConfig>(model: T, objectType: ObjectType): Promise<T> {
    if (!model.credential && objectType !== "credential") {
      return model;
    }
    let credentialId = model.credential;
    if (!credentialId || credentialId === "") {
      credentialId = model.id;
    }

    const credential = await CredentialDb.findByPk(credentialId);
    if (!credential) {
      this.logger.debug(
        `mergeCredential() Credential for ${model.type}/${model.name}: ${credentialId} not found.`
      );
      return model;
    }
    const secret = await this._client.getSecret(credential.secretId);
    if (!secret) {
      this.logger.debug(
        `mergeCredential() Secret for ${model.type}/${model.name}: ${credentialId} not found.`
      );
      return model;
    }

    let decrypted = this._secretCache.get(secret);

    if (!decrypted) {
      decrypted = EncryptionService.getInstance().decrypt(secret);

      if (!decrypted) {
        this.logger.error(
          `mergeCredential() Failed to decrypt secret for ${model.type}/${model.name}: ${credentialId}`
        );
        return model;
      } else {
        this._secretCache.set(secret, decrypted);
      }
    }

    try {
      const parsed = jsonParse<Record<string, unknown>>(decrypted);

      if (objectType === "credential") {
        // We are using a trick to avoid the secretId in the credential object
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { secretId, ...rest } = model as CredentialConfig;
        return {
          ...rest,
          variables: {
            ...rest.variables,
            ...parsed,
          },
        } as T;
      }
      return {
        ...model,
        variables: {
          ...model.variables,
          ...parsed,
        },
      };
    } catch (error) {
      this.logger.error(
        `mergeCredential() Failed to parse decrypted secret for ${model.type}/${model.name}: ${credentialId}`
      );
      throw error;
    }
  }

  public async getCredentialIdForName(orgId: string, name: string): Promise<string | undefined> {
    const credential = await CredentialDb.findOne({
      where: {
        orgId,
        name,
      },
    });
    if (!credential) {
      return undefined;
    }
    return credential.id;
  }

  public async replaceCredentialNameWithId(model: BaseConfig, orgId: string): Promise<void> {
    if (!model.credential) {
      this.logger.debug(
        `replaceCredentialNameWithId() no credential in spec for ${model.type}/${model.name}.`
      );
      return;
    }
    const credential = await CredentialDb.findOne({
      where: {
        orgId,
        name: model.credential,
      },
    });
    if (!credential) {
      throw new Error(
        `Credential for ${model.type}/${model.name}: ${model.credential} not found.`
      );
    }
    model.credential = credential.id;
  }

  public async getCredentialNameForId(id: string): Promise<string | undefined> {
    const credential = await CredentialDb.findByPk(id);
    if (!credential) {
      return undefined;
    }
    return credential.name;
  }

  public async replaceCredentialIdWithName(model: BaseConfig): Promise<void> {
    if (!model.credential) {
      return;
    }
    const credential = await CredentialDb.findByPk(model.credential);
    if (!credential) {
      this.logger.debug(
        `replaceCredentialIdWithName() Credential for ${model.type}/${model.name}: ${model.credential} not found.`
      );
      model.credential = undefined;
      return;
    }
    model.credential = credential.name;
  }

  public async getSecret(credentialId: string): Promise<Record<string, unknown> | undefined> {
    const credential = await CredentialDb.findByPk(credentialId);
    if (!credential) {
      this.logger.debug(`getSecret() Credential for ${credentialId} not found.`);
      return undefined;
    }
    if (credential.type.startsWith("mock")) {
      return jsonParse(credential.variables ?? "{}");
    }
    const secret = await this._client.getSecret(credential.secretId);
    if (!secret) {
      this.logger.debug(
        `getSecret() Secret for ${credentialId} not found.`
      );
      return undefined;
    }
    const decrypted = EncryptionService.getInstance().decrypt(secret);
    if (!decrypted) {
      this.logger.error(
        `getSecret() Failed to decrypt secret for ${credentialId}`
      );
      return undefined;
    }
    try {
      const parsed = jsonParse<Record<string, unknown>>(decrypted);
      return parsed;
    } catch (error) {
      this.logger.error(
        `getSecret() Failed to parse decrypted secret for ${credentialId}`
      );
      throw error;
    }
  }

  public async storeSecrets(
    config: CredentialConfig
  ): Promise<CredentialConfig> {
    const encrypted = EncryptionService.getInstance().encrypt(
      JSON.stringify(config.variables ?? {}),
      "secret-service"
    );
    const secretId = await this._client.storeSecret(
      encrypted,
      config.orgId,
      config.secretId
    );
    if (!secretId) {
      throw new Error("Failed to store secrets");
    }
    const cleaned: CredentialConfig = {
      ...config,
      secretId,
    };
    return cleaned;
  }

  public async deleteSecrets(config: CredentialConfig): Promise<void> {
    if (!config.secretId) {
      return;
    }
    await this._client.deleteSecret(config.secretId);
  }
}
