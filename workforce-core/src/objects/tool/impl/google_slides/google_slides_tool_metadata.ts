import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { ToolConfig } from "../../model.js";

export class GoogleSlidesToolMetadata {
    public static defaultConfig(orgId: string): ToolConfig {
        return {
            id: crypto.randomUUID(),
            name: "Google Slides Tool",
            description: "A tool that interacts with Google Slides.",
            type: "google-slides-tool",
            orgId: orgId,
            variables: {},
        }
    }

    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "tool";
        const subtype = "google-slides-tool";
        schema.set("client_id", {
            type: "string",
            description: "The client ID for the Google Slides API.",
            sensitive: true,
        });
        schema.set("client_secret", {
            type: "string",
            description: "The client secret for the Google Slides API.",
            sensitive: true,
        });
        schema.set("oauth2_audience", {
            type: "string",
            description: "The audience for the OAuth2 token.",
            sensitive: true,
        });
        
        return new VariablesSchema(schema, type, subtype);
    }

}
