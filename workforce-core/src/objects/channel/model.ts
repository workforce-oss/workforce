import { BaseConfig, ToolCall } from "../base/model.js";

export interface ChannelMessageEvent {
    channelId: string;
    senderId: string;
    messageId: string;
    message: string;
    users: string[];
    image?: string;
    taskExecutionId?: string;
    channelMessageData?: Record<string, unknown>;
    messageType?: string;
    toolCalls?: ToolCall[] | null;
}

export const ChannelMessageDataKey = "channelMessageData";

export interface MessageRequest {
    channelId: string;
    workerId: string;
    taskExecutionId: string;
    senderId: string;
    messageId: string;
    message: string;
    timestamp: number;
    image?: string;
    toolCalls?: ToolCall[] | null;
    final?: boolean;
    username?: string;
    newConversation?: boolean;
    channelMessageData?: Record<string, unknown>;
    ignoreResponse?: boolean;
    messageType?: string;
    completionFunction?: Record<string, unknown>;
}

export interface ChannelMessage {
    id: string;
    channelId: string;
    taskExecutionId: string;
    status: ChannelMessageStatus;
    request?: MessageRequest;
    channelMessageId?: string;
}

export type ChannelMessageStatus = "awaiting-response" | "response-received" | "error";

export interface ChannelSession {
    id: string;
    taskExecutionId: string;
    channelId: string;
    status: ChannelSessionStatus;
    channelThreadId?: string;
}

export type ChannelSessionStatus = "started" | "complete" | "error";


export type ChannelType = typeof channelTypes[number];

export const channelTypes = [
    "mock",
    "slack-channel",
    "native-channel",
    "discord-channel",
] as const;

export interface ChannelConfig extends BaseConfig {
    subtype: ChannelType;
}