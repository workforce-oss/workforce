import { CredentialConfig, VariableSchemaValidationError, VariablesSchema } from "workforce-core/model";
import { RestApiInstanceOptions } from "./base/rest_api.js";
import { OrgSubResourceAPI } from "./org_api.subresource.js";

export class CredentialAPI extends OrgSubResourceAPI<CredentialConfig, VariableSchemaValidationError> {
    static instance: CredentialAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): CredentialAPI {
        if (!CredentialAPI.instance || options.accessToken !== CredentialAPI.instance.accessToken) {
            CredentialAPI.instance = new CredentialAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "credentials",
                objectType: "credential",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: VariablesSchema.validateBaseObject
            });
        }
        return CredentialAPI.instance;
    }
}