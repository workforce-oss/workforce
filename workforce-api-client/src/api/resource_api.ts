import { ResourceConfig, VariableSchemaValidationError } from "workforce-core";
import { RestApi, RestApiInstanceOptions } from "./base/rest_api.js";

export class ResourceAPI extends RestApi<ResourceConfig, VariableSchemaValidationError> {
    static instance: ResourceAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): ResourceAPI {
        if (!ResourceAPI.instance || options.accessToken !== ResourceAPI.instance.accessToken) {
            ResourceAPI.instance = new ResourceAPI({
                basePath: options?.basePath ?? "/workforce-api",
                resource: "resources",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return ResourceAPI.instance;
    }
}