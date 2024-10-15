import { Documentation, VariableSchemaValidationError } from "workforce-core";
import { RestApi, RestApiInstanceOptions } from "./base/rest_api.js";

export class DocumentationAPI extends RestApi<Documentation, VariableSchemaValidationError> {
    static instance: DocumentationAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): DocumentationAPI {
        if (!DocumentationAPI.instance || options.accessToken !== DocumentationAPI.instance.accessToken) {
            DocumentationAPI.instance = new DocumentationAPI({
                basePath: options?.basePath ?? "/workforce-api",
                resource: "documentation",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return DocumentationAPI.instance;
    }
}