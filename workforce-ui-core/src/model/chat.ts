import { ToolCall } from "workforce-core/model";

export interface ChatBoxSession {
    sessionId?: string;
    messages?: ChatBoxMessage[];
}

export interface ChatBoxMessage {
    message?: string;
    messageId?: string;
    senderId?: string;
    sessionId?: string;
    timestamp?: number;
    final?: boolean;
    toolCalls?: ToolCall[];
    senderName?: string;
    taskName?: string;
    taskExecutionId?: string;
}