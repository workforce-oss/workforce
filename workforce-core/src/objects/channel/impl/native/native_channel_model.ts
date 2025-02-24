export interface NativeChannelMessage {
    senderId: string;
    messageId: string;
    threadId: string;
    text: string;
    timestamp: number;
    displayName?: string;
    toolCalls?: NativeChannelToolCall[];
    taskExecutionId?: string;
    image?: string;
    command?: "join" | "leave" | "message";
    final_part?: boolean;
    file_names?: string[];
}

export interface NativeChannelWebRTCSessionMessage {
    senderId: string,
    messageId: string,
    threadId: string,
    
}

export interface NativeChannelToolCall {
    toolRequestId?: string;
    toolType?: string;
    name?: string;
    arguments?: Record<string, unknown>;
    call_id?: string;
    sessionId?: string;
    result?: string;
    image?: string;
    taskExecutionId?: string;
    humanState?: { name?: string, type?: string, embed?: string, directUrl?: string};
    timestamp?: number;
}