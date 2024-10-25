import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { ToolConfig } from "../../model.js";

export class OpenAPIChannelToolMetadata {
    public static defaultConfig(orgId: string): ToolConfig {
        return {
            id: crypto.randomUUID(),
            name: "OpenAPI Channel Tool",
            description: "A tool that calls an OpenAPI service and sends the response to a channel.",
            type: "openapi-channel-tool",
            orgId: orgId,
            variables: {},
        }
    }
    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "tool";
        const subtype = "openapi-channel-tool";
        schema.set("schema_url", {
            type: "string",
            description: "A URL to a valid OpenAPI schema.",
        });
        schema.set("raw_schema", {
            type: "string",
            multiline: true,
            description: "A valid OpenAPI schema.",
        });
        return new VariablesSchema(schema, type, subtype);
    }
}