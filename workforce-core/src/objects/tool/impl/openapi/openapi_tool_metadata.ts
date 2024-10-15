import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { ToolConfig } from "../../model.js";

export class OpenAPIToolMetadata {
    public static defaultConfig(orgId: string): ToolConfig {
        return {
            id: crypto.randomUUID(),
            name: "OpenAPI Tool",
            description: "A tool that calls an OpenAPI service.",
            type: "tool",
            subtype: "openapi-tool",
            orgId: orgId,
            variables: {},
        }
    }

    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "tool";
        const subtype = "openapi-tool";
        schema.set("schema_url", {
            type: "string",
            description: "A URL to a valid OpenAPI schema.",
        });
        schema.set("raw_schema", {
            type: "string",
            multiline: true,
            description: "A valid OpenAPI schema.",
        });
        schema.set("custom_headers", {
            type: "string",
            description: "Custom headers to include in the request. Provide a JSON object.",
            multiline: true,
            sensitive: true,
        });
        schema.set("username", {
            type: "string",
            description: "The username to use for basic authentication.",
            sensitive: true,
        });
        schema.set("password", {
            type: "string",
            description: "The password to use for basic authentication.",
            sensitive: true,
        });
        schema.set("bearer_token", {
            type: "string",
            description: "The bearer token to use for bearer token authentication.",
            sensitive: true,
        });
        schema.set("api_key", {
            type: "string",
            description: "The API key to use for API key authentication.",
            sensitive: true,
        });
        schema.set("mtls_cert", {
            type: "string",
            description: "The certificate to use for mTLS authentication.",
            multiline: true,
            sensitive: true,
        });
        schema.set("mtls_key", {
            type: "string",
            description: "The key to use for mTLS authentication.",
            multiline: true,
            sensitive: true,
        });
        schema.set("mtls_ca", {
            type: "string",
            description: "The CA to use for mTLS authentication.",
            multiline: true,
            sensitive: true,
        });
        schema.set("client_id", {
            type: "string",
            description: "The client ID to use for Oauth2 authentication.",
            sensitive: true,
        });
        schema.set("client_secret", {
            type: "string",
            description: "The client secret to use for Oauth2 authentication.",
            sensitive: true,
        });
        schema.set("scopes", {
            type: "string",
            description: "The scope to use for Oauth2 authentication. Provide a comma-separated list of scopes.",
            sensitive: true,
        });
        schema.set("oauth2_audience", {
            type: "string",
            description: "The audience to use for Oauth2 authentication.",
            sensitive: true,
        });
         
        return new VariablesSchema(schema, type, subtype);
    }

}