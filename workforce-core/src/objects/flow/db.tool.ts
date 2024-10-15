import { ChannelDb } from "../channel/db.js";
import { CredentialHelper } from "../credential/helper.js";
import { ToolConfig } from "../tool/model.js";

export async function mapToolNamesToIds(args: {configs: ToolConfig[], channels: ChannelDb[] | undefined}): Promise<void> {
    const {configs, channels} = args;
    for (const config of configs) {
        await CredentialHelper.instance.replaceCredentialNameWithId(config);
        if (config.channel) {
            const foundChannel = channels?.find((channel) => channel.name === config.channel);
            if (foundChannel) {
                config.channel = foundChannel.id;
            }
        }
    }
}

export async function mapToolIdsToNames(args: {configs: ToolConfig[], channels: ChannelDb[] | undefined}): Promise<void> {
    const {configs, channels} = args;
    for (const config of configs) {
        await CredentialHelper.instance.replaceCredentialIdWithName(config);
        if (config.channel) {
            const foundChannel = channels?.find((channel) => channel.id === config.channel);
            if (foundChannel) {
                config.channel = foundChannel.name;
            }
        }
    }
}