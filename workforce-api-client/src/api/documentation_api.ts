import { Documentation, VariableSchemaValidationError } from "workforce-core";
import { RestApiInstanceOptions } from "./base/rest_api.js";
import { FlowSubResourceApi } from "./flow_api.subresource.js";

export class DocumentationAPI extends FlowSubResourceApi<Documentation, VariableSchemaValidationError> {
    static instance: DocumentationAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): DocumentationAPI {
        if (!DocumentationAPI.instance || options.accessToken !== DocumentationAPI.instance.accessToken) {
            DocumentationAPI.instance = new DocumentationAPI({
                basePath: options?.basePath ?? "/workforce-api",
                resource: "documentation",
                objectType: "documentation",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return DocumentationAPI.instance;
    }
}