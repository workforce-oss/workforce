import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { ResourceConfig } from "../../model.js";

export class ApiResourceMetadata {
    public static defaultConfig(orgId: string): ResourceConfig {
        return {
            id: crypto.randomUUID(),
            name: "Custom Webhook",
            description: "A resource that calls a custom webhook.",
            type: "resource",
            subtype: "api-resource",
            orgId: orgId,
            variables: {},
        }
    }

    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "resource";
        const subtype = "api-resource";
        schema.set("schema_url", {
            type: "string",
            description: "A URL to a valid OpenAPI schema.",
        });
        schema.set("raw_schema", {
            type: "string",
            multiline: true,
            description: "A valid OpenAPI schema.",
        });
        schema.set("fetch_path", {
            type: "string",
            description: "The path to use for fetching data from the API.",
        });
        schema.set("fetch_method", {
            type: "string",
            description: "The HTTP method to use for fetching data from the API.",
            options: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        });
        schema.set("webhook_path", {
            type: "string",
            description: "The path that defines the webhook endpoint.",
        });
        schema.set("create_path", {
            type: "string",
            description: "The path to use for creating new objects in the API.",
        });
        schema.set("create_method", {
            type: "string",
            description: "The HTTP method to use for creating new objects in the API.",
            options: ["GET", "POST", "PUT", "PATCH", "DELETE"],
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