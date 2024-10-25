import { Channel } from "../base.js";
import { DiscordChannel } from "../impl/discord/discord_channel.js";
import { MockChannel } from "../impl/mock/mock_channel.js";
import { NativeChannel } from "../impl/native/native_channel.js";
import { SlackChannel } from "../impl/slack/slack_channel.js";
import { ChannelConfig } from "../model.js";

export class ChannelFactory {
    static create(config: ChannelConfig, onFailure: (objectId: string, error: string) => void): Channel {
        switch (config.type) {
            case "mock-channel":
                return new MockChannel(config, onFailure);
            case "slack-channel":
                return new SlackChannel(config, onFailure);
            case "native-channel":
                return new NativeChannel(config, onFailure);
            case "discord-channel":
                return new DiscordChannel(config, onFailure);
            default:
                throw new Error(`ChannelFactory.create() unknown channel type ${config.type as string}`);
        }
    }
}