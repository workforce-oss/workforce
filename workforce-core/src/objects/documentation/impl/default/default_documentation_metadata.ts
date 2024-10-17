import { DocumentationConfig, retrievalScopeTypes, tokenFillStrategyTypes } from "../../model.js";
import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";

export class DefaultDocumentationMetadata {

    static defaultConfig(orgId: string): DocumentationConfig {
        return {
            id: crypto.randomUUID(),
            orgId,
            type: "documentation",
            subtype: "default-documentation",
            name: "Documentation",
            description: "Documentation",
            variables: {
                desiredTokens: 512,
                maxTokens: 1024,
                retrievalScope: "section",
                tokenFillStrategy: "default",
            }
        }
    }

    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "documentation";
        const subtype = "default-documentation";
        schema.set("desiredTokens", {
            type: "number",
            required: false,
            description: "The desired number of tokens to generate.",
            default: 512,
        });
        schema.set("maxTokens", {
            type: "number",
            required: false,
            description: "The maximum number of tokens to generate.",
            default: 1024,
        });
        schema.set("retrievalScope", {
            type: "string",
            required: false,
            description: "The scope of the retrieval.",
            default: "section",
            options: [
                ...retrievalScopeTypes
            ],
        });
        schema.set("tokenFillStrategy", {
            type: "string",
            required: false,
            description: "The strategy for filling tokens.",
            default: "default",
            options: [
                ...tokenFillStrategyTypes
            ],
        });
        return new VariablesSchema(schema, type, subtype);
    }
}