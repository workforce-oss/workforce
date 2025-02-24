import { ToolCall, WorkforceFile, WorkforceImage } from "../../../base/model.js";
import { ChannelConfig } from "../../model.js";

export interface CustomChannelEventBase {
    eventId: string;
    timestamp: number;
    eventType: string;
    channelId: string;
    senderId?: string;
    taskExecutionId?: string;
}


export type CustomChannelEventTypes =
    {
        eventType: "message_part" | "message_end" | "message";
        messageId: string;
        threadId: string;
        text?: string;
        displayName?: string;
        toolCalls?: ToolCall[] | null;
        images?: WorkforceImage[];
        files?: WorkforceFile[];
    }
    | {
        eventType: "new_session";
        threadId: string;
    }
    | {
        eventType: "join",
        workerId: string,
        token: string,
        threadId?: string,
        username?: string,
    }
    | {
        eventType: "leave";
        workerId: string;
        threadId?: string;
    }
    | {
        eventType: "destroy";
    }
    | {
        eventType: "error";
        error: string;
        threadId?: string;
    }
    | {
        eventType: "register";
        config: ChannelConfig;
    }

export type CustomChannelEvent = CustomChannelEventBase & CustomChannelEventTypes;

export type CustomChannelEventType<T extends CustomChannelEvent["eventType"]> = Extract<CustomChannelEvent, { eventType: T }>;

export type CustomChannelRegisterEvent = CustomChannelEventType<"register">;

export type CustomChannelMessageEvent = CustomChannelEventType<"message_part" | "message_end" | "message">;
export type CustomChannelJoinEvent = CustomChannelEventType<"join">;
export type CustomChannelLeaveEvent = CustomChannelEventType<"leave">;
export type CustomChannelErrorEvent = CustomChannelEventType<"error">;
export type CustomChannelDestroyEvent = CustomChannelEventType<"destroy">;
export type CustomChannelNewSessionEvent = CustomChannelEventType<"new_session">;
