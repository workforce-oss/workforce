import { DocumentRepositoryConfig } from "../../model.js";
import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { openAIModels } from "../lib/embeddings/embedding_models.js";

export class GitDocumentRepositoryMetadata {
    static defaultConfig(orgId: string): DocumentRepositoryConfig {
        return {
            id: crypto.randomUUID(),
            orgId,
            type: "document_repository",
            subtype: "git-document-repository",
            name: "Git Document Repository",
            description: "Git Document Repository",
            documentChunkStrategy: "section",
            variables: {
                model: "text-embedding-3-small",
                model_api_key: "",
                repo: "",
                file_regex: "",
                access_token: "",
                owner: "",
                branch: "main",
            }
        }
    }

    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "document_repository";
        const subtype = "git-document-repository";
        schema.set("model", {
            type: "array",
            required: true,
            description: "The name of the model to use for embedding.",
            default: "text-embedding-3-small",
            options: [
                ...openAIModels
            ],

        });
        schema.set("model_api_key", {
            type: "string",
            required: true,
            description: "The API key for the model.",
            sensitive: true,
        });
        schema.set("repo", {
            type: "string",
            required: true,
            description: "The name(slug) of the Github repository to use."
        });
        schema.set("file_regex", {
            type: "string",
            required: true,
            description: "The regex to use to match the files in the repository."
        });
        schema.set("access_token", {
            type: "string",
            description: "The token to use for authentication.",
            sensitive: true,
        });
        schema.set("owner", {
            type: "string",
            required: true,
            description: "The name(slug) of owner of the Github repository."
        });
        schema.set("branch", {
            type: "string",
            description: "The branch name.",
            default: "main",
        });
        return new VariablesSchema(schema, type, subtype);

    }
}