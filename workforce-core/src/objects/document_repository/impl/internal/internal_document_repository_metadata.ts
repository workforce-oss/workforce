import { DocumentRepositoryConfig } from "../../model.js";
import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { openAIModels } from "../lib/embeddings/embedding_models.js";

export class InternalDocumentRepositoryMetadata {
    static defaultConfig(orgId: string): DocumentRepositoryConfig {
        return {
            id: crypto.randomUUID(),
            orgId,
            type: "document_repository",
            subtype: "internal-document-repository",
            name: "Internal Document Repository",
            description: "Internal Document Repository",
            documentChunkStrategy: "section",
            variables: {
                model: "text-embedding-3-small",
                model_api_key: "",
            }
        }
    }

    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "document_repository";
        const subtype = "internal-document-repository";
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
        return new VariablesSchema(schema, type, subtype);

    }
}