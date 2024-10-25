import { VariablesSchema } from "../../base/variables_schema.js";
import { DiscordChannelMetadata } from "../impl/discord/discord_channel_metadata.js";
import { MockChannelMetadata } from "../impl/mock/mock_channel_metadata.js";
import { NativeChannelMetadata } from "../impl/native/native_channel_metadata.js";
import { SlackChannelMetadata } from "../impl/slack/slack_channel_metadata.js";
import { ChannelConfig, ChannelType } from "../model.js";

export class ChannelConfigFactory {
    static defaultConfigFor(orgId: string, subtype: ChannelType): ChannelConfig {
        switch (subtype) {
            case "mock-channel":
                return MockChannelMetadata.defaultConfig(orgId);
            case "slack-channel":
                return SlackChannelMetadata.defaultConfig(orgId);
            case "native-channel":
                return NativeChannelMetadata.defaultConfig(orgId);
            case "discord-channel":
                return DiscordChannelMetadata.defaultConfig(orgId);
            default:
                throw new Error(`ChannelFactory.defaultConfigFor() unknown channel type ${subtype as string}`);
        }
    }

    static variablesSchemaFor(config: ChannelConfig): VariablesSchema {
        switch (config.type) {
            case "mock-channel":
                return MockChannelMetadata.variablesSchema();
            case "slack-channel":
                return SlackChannelMetadata.variablesSchema();
            case "native-channel":
                return NativeChannelMetadata.variablesSchema();
            case "discord-channel":
                return DiscordChannelMetadata.variablesSchema();
            default:
                throw new Error(`ChannelFactory.variablesSchemaFor() unknown channel type ${config.type as string}`);
        }
    }


}