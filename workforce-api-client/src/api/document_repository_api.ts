import { DocumentData, DocumentRepositoryConfig, VariableSchemaValidationError, VariablesSchema } from "workforce-core/model";
import { RestApi, RestApiInstanceOptions } from "./base/rest_api.js";

export class DocumentRepositoryAPI extends RestApi<DocumentRepositoryConfig, VariableSchemaValidationError> {
    static instance: DocumentRepositoryAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): DocumentRepositoryAPI {
        if (!DocumentRepositoryAPI.instance || options.accessToken !== DocumentRepositoryAPI.instance.accessToken) {
            DocumentRepositoryAPI.instance = new DocumentRepositoryAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "document-repositories",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: VariablesSchema.validateBaseObject
            });
        }
        return DocumentRepositoryAPI.instance;
    }

    public async listDocuments(documentRepositoryId: string): Promise<DocumentData[]> {
        return await this.call<DocumentData[]>({ subpath: `/${documentRepositoryId}/documents`, method: "GET" });
    }
}