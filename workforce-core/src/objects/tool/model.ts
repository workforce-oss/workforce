import { BaseConfig, ToolCall as ToolCall } from "../base/model.js";

export interface ToolResponse {
    toolId: string;
    requestId: string;
    success: boolean;
    timestamp: number;
    taskExecutionId: string;
    updateChannelId?: string;
    machine_message?: string;
    machine_state?: Record<string, unknown>;
    machine_image?: string;
    human_state?: { name?: string, type?: string, embed?: string, directUrl?: string};
    image?: string;
}
 
export interface ToolRequest {
    toolId: string;
    requestId: string;
    toolCall: ToolCall;
    taskExecutionId: string;
    timestamp: number;
    workerId: string;
    workerChannelUserConfig?: Record<"mock" | "slack-channel" | "native-channel" | "discord-channel", string> | undefined
    channelThreadId?: string;
    channelId?: string;
    machine_state?: Record<string, unknown>;
}

export interface ToolSchema {
    tools: ToolCall[];
}

export interface ToolRequestData {
    id: string;
    toolId: string;
    taskExecutionId: string;
    status: ToolRequestStatus;
    request?: ToolRequest;
    response?: ToolResponse;
}

export type ToolRequestStatus = "awaiting-response" | "response-received" | "error";

export type ToolType = typeof toolTypes[number];

export const toolTypes = [
    "mock",
    "web-service-tool",
    "template-tool",
    "openapi-tool",
    "openapi-channel-tool",
    "excalidraw-tool",
    "google-drive-tool",
    "google-slides-tool",
    "coding-tool",
    "trello-ticket-tool",
    "github-board-ticket-tool",
    "message-channel-tool",
] as const;

export interface ToolConfig extends BaseConfig {
    subtype: ToolType;

    /*
     * This the channel the tool may use for communication
     * with other tools or the user.
     * This is an id in the database, but a name in the API.
    */
    channel?: string;
}