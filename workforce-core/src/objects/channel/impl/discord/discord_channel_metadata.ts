import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { ChannelConfig } from "../../model.js";

export class DiscordChannelMetadata {
    public static defaultConfig(orgId: string): ChannelConfig {
        return {
            id: crypto.randomUUID(),
            name: "Discord Channel",
            description: "Discord Channel",
            type: "channel",
            subtype: "discord-channel",
            orgId: orgId,
            variables: {
                channel_id: "",
            },
        }
    }

    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "channel";
        const subtype = "discord-channel";
        schema.set("channel_id", {
            type: "string",
            required: true,
            description: "The Discord channel to send messages to",
            sensitive: false
        });

        schema.set("bot_token", {
            type: "string",
            required: true,
            description: "The Discord bot token",
            sensitive: true
        });

        return new VariablesSchema(schema, type, subtype);
    }
}