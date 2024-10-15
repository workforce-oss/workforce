import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { ChannelConfig } from "../../model.js";

export class NativeChannelMetadata {
    public static defaultConfig(orgId: string): ChannelConfig {
        return {
            id: crypto.randomUUID(),
            name: "Native Channel",
            description: "Native Channel",
            type: "channel",
            subtype: "native-channel",
            orgId: orgId,
            variables: {
                channel_name: "",
                anonymous_access: false,
                oauth2_issuer_uri: "",
                oauth2_claims: "",
            },
        }
    }

    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "channel";
        const subtype = "native-channel";
        schema.set("channel_name", {
            type: "string",
            required: true,
            description: "A unique name for the channel",
            sensitive: false
        });
        schema.set("anonymous_access", {
            type: "boolean",
            required: false,
            description: "Allow anonymous access to the channel",
            sensitive: false
        });
        schema.set("voice_enabled", {   
            type: "boolean",
            required: false,
            description: "Enable voice input for the channel",
            sensitive: false,
            advanced: true
        });
        schema.set("oauth2_issuer_uri", {
            type: "string",
            required: false,
            description: "Tokens from this issuer will be accepted",
            sensitive: false
        });
        schema.set("oauth2_audience", {
            type: "string",
            required: false,
            description: "The audience for the token",
            sensitive: false
        });
        schema.set("oauth2_claims", {
            type: "string",
            required: false,
            description: "A JSON object containing the claims to be verified",
            sensitive: false,
            multiline: true
        });
        schema.set("openai_token", {
            type: "string",
            required: false,
            description: "OpenAI API token",
            sensitive: true
        });
        return new VariablesSchema(schema, type, subtype);
    }
}