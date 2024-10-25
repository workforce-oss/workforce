import { BaseConfig } from "../base/model.js";

export const channelUserCredentialTypes = [
    "worker-slack-token",
    "worker-discord-token",
    "worker-native-token",
] as const;

export type ChannelUserCredentialType = typeof channelUserCredentialTypes[number];

export interface ChannelUserCredential extends BaseConfig {
    type: ChannelUserCredentialType;
}