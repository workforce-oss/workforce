import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { ChannelConfig } from "../../model.js";

export class SlackChannelMetadata {
    public static defaultConfig(orgId: string): ChannelConfig {
        return {
            id: crypto.randomUUID(),
            name: "Slack Channel",
            description: "Slack Channel",
            type: "slack-channel",
            orgId: orgId,
            variables: {
                channel_id: "",
            },
        }
    }

    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "channel";
        const subtype = "slack-channel";
        schema.set("app_token", {
            type: "string",
            required: true,
            description: "The Slack app token",
            sensitive: true
        });
        schema.set("channel_id", {
            type: "string",
            required: true,
            description: "The Slack channel to send messages to",
            sensitive: false
        });
        return new VariablesSchema(schema, type, subtype);
    }
}