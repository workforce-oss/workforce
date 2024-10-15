import { RestApi, RestApiInstanceOptions } from "./base/rest_api.js";
import { CredentialConfig, VariablesSchema } from "workforce-core/model";
import { VariableSchemaValidationError } from "workforce-core/model";

export class CredentialAPI extends RestApi<CredentialConfig, VariableSchemaValidationError> {
    static instance: CredentialAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): CredentialAPI {
        if (!CredentialAPI.instance || options.accessToken !== CredentialAPI.instance.accessToken) {
            CredentialAPI.instance = new CredentialAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "credentials",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: VariablesSchema.validateBaseObject
            });
        }
        return CredentialAPI.instance;
    }
}