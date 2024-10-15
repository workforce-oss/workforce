import { BaseConfig } from "../base/model.js";

export interface CredentialConfig extends BaseConfig {
    secretId?: string;
}