import { AudioFormat, ConversationItem, OpenAITool, Session, Voice } from "./common.js";

export type UpdateSession = {
    event_id: string,
    type: "session.update",
    session: Session
}

export type AppendInputAudioBuffer = {
    event_id: string,
    type: "input_audio_buffer.append",
    audio: string,
}

export type CommitInputAudioBuffer = {
    event_id: string,
    type: "input_audio_buffer.commit",
}

export type ClearInputAudioBuffer = {
    event_id: string,
    type: "input_audio_buffer.clear"
}

export type CreateConversationItem = {
    event_id: string;
    type: "conversation.item.create";
    previous_item_id?: string | null;
    item: ConversationItem
}

export type TruncateConversationItem = {
    event_id: string, 
    type: "conversation.item.truncate",
    item_id: string,
    content_index: number,
    audio_end_ms: number,
}

export type DeleteConversationItem = {
    event_id: string,
    type: string,
    item_id: string, 
}

// Trigger Inference
export type CreateResponse = {
    event_id: string;
    type: "response.create",
    response?: {
        modalities?: string[],
        instructions?: string,
        voice?: Voice,
        output_audio_format?: AudioFormat,
        tools?: OpenAITool[],
        tool_choice?: string,
        temperature?: number,
        max_response_output_tokens?: number | "inf",
        conversation?: "auto" | "none",
        metadata?: Record<string, unknown>,
        input?: ConversationItem[] 
    }
}

export type CancelResponse = {
    event_id: string,
    type: "response.cancel",
    response_id: string
}
