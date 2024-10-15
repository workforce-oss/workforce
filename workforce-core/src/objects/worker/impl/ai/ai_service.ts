import { Observable } from "rxjs";
import { ChatSession, ChatMessage, ChatRole } from "../../model.js";
import { ToolCall } from "../../../base/model.js";
import { FunctionDocument } from "../../../../util/openapi.js";

export interface InferenceState {
	currentMessageIndex: number;
	role: ChatRole | undefined;
	sentences: string[];
	currentToolCallId: string | undefined;
	toolCalls: Record<string, ToolCall>;
	toolCallArgStrings: Record<string, string>;
	isCompletionFunction: boolean | undefined;
	messageFunctionMessageStarted: boolean;
	functionDescribed: boolean;
	cost: number;
    inputTokens: number;
    outputTokens: number;
	tokens: number;
    cacheWriteTokens?: number;
    cacheHitTokens?: number;
}

export interface AIService {
    inference(args: {
        chatSession: ChatSession,
        functions?: FunctionDocument[],
        explainFunctions?: boolean,
        singleMessage?: boolean,
        intermediateMessageCallback?: (message: ChatMessage) => Promise<void>,
        modelOverride?: string,
        cancel?: Observable<boolean>,
        channelMessageId?: string,
        username?: string
    }): Promise<ChatMessage>;
}