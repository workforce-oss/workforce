import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { ToolConfig } from "../../model.js";

export class WebServiceToolMetadata {
    public static defaultConfig(orgId: string): ToolConfig {
        return {
            id: crypto.randomUUID(),
            name: "Web Service Tool",
            description: "A tool that calls a web service.",
            type: "web-service-tool",
            orgId: orgId,
            variables: {
                url: "",
                method: "GET",
            },
        };
    }

    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "tool";
        const subtype = "web-service-tool";
        schema.set("url", {
            type: "string",
            required: true,
            description: "The URL of the web service."
        });
        schema.set("method", {
            type: "string",
            description: "The HTTP method to use. Defaults to GET.",
            default: "GET",
        });
        schema.set("schema_url", { 
            type: "string",
            required: true,
            description: "A URL to a json schema with the request body schema.  Required if method is POST or PUT.",
        });
        schema.set("visualizer_url", {
            type: "string",
            required: false,
            description: "A URL to a visualizer.",
        });
        schema.set("action_caption_webhook_base_url", {
            type: "string",
            required: false,
            description: "The base URL to use for action caption webhooks.",
        });
        schema.set("username", {
            type: "string",
            description: "The username to use for basic authentication.",
        });
        schema.set("password", {
            type: "string",
            description: "The password to use for basic authentication.",
            sensitive: true,
        });
        schema.set("bearer_token", {
            type: "string",
            description: "Bearer token to use for Oauth2 authentication.",
            sensitive: true,
        });
        schema.set("client_id", {
            type: "string",
            description: "The client ID to use for Oauth2 Client Credentials authentication.",
            sensitive: true,
        });
        schema.set("client_secret", {
            type: "string",
            description: "The client secret to use for Oauth2 Client Credentials authentication.",
            sensitive: true,
        });
        schema.set("scope", {
            type: "string",
            description: "The scope to use for Oauth2 Client Credentials authentication.",
            sensitive: true,
        });

        return new VariablesSchema(schema, type, subtype);
    }
}