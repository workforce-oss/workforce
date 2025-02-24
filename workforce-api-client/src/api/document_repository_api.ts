import { DocumentData, DocumentRepositoryConfig, VariableSchemaValidationError, VariablesSchema } from "workforce-core/model";
import { RestApiInstanceOptions } from "./base/rest_api.js";
import { OrgSubResourceAPI, OrgSubResourceCallOptions } from "./org_api.subresource.js";

export class DocumentRepositoryAPI extends OrgSubResourceAPI<DocumentRepositoryConfig, VariableSchemaValidationError> {
    static instance: DocumentRepositoryAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): DocumentRepositoryAPI {
        if (!DocumentRepositoryAPI.instance || options.accessToken !== DocumentRepositoryAPI.instance.accessToken) {
            DocumentRepositoryAPI.instance = new DocumentRepositoryAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "document-repositories",
                objectType: "document_repository",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: VariablesSchema.validateBaseObject
            });
        }
        return DocumentRepositoryAPI.instance;
    }

    public async listDocuments(documentRepositoryId: string, options: OrgSubResourceCallOptions): Promise<DocumentData[]> {
        return await this.call<DocumentData[]>({
            options: {
                rootResources: this.rootResources(options)
            },
            subpath: `/${documentRepositoryId}/documents`, method: "GET"
        });
    }
}