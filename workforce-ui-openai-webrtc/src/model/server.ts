import { ConversationItem, Session } from "./common.js";

export type OpenAIError = {
    type: string,
    message: string,
    code?: string,
    param?: string,
    event_id?: string
}

export type OpenAIErrorMessage = {
    event_id: string,
    type: "error",
    error: OpenAIError
}

export type SessionCreated = {
    event_id: string,
    type: "session.created",
    session: Session
}

export type SessionUpdated = {
    event_id: string,
    type: "session.updated",
    session: Session
}


export type ConversationCreated = {
    event_id: string,
    type: "conversation.created",
    conversation: {
        id: string,
        object: "realtime.conversation"
    }
}

export type ConversationItemCreated = {
    event_id: string,
    type: "conversation.item.created",
    previous_item_id: string,
    item: ConversationItem;
}

export type ConversationItemInputAutioTranscriptionCompleted = {
    event_id: string,
    type: "conversation.item.input_audio.transcription.completed",
    item_id: string,
    content_index: number,
    transcript: string,
}

export type ConversationItemInputAudioTranscriptionFailed = {
    event_id: string,
    type: "conversation.item.input_audio.transcription.failed",
    item_id: string,
    content_index: number,
    error: OpenAIError
}

export type ConversationItemTruncated = {
    event_id: string,
    type: "conversation.item.truncated",
    item_id: string,
    content_index: number,
    audio_end_ms: number
}

export type ConversationItemDeleted = {
    event_id: string,
    type: "conversation.item.deleted",
    item_id: string,
}

export type InputAudioBufferCommitted = {
    event_id: string,
    type: "input_audio_buffer.committed",
    previous_item_id: string,
    item_id: string
}

export type InputAudioBufferCleared = {
    event_id: string,
    type: "input_audio_buffer.cleared"
}

export type InputAudioBufferSpeechStarted = {
    event_id: string,
    type: "input_audio_buffer.speech_started",
    audio_start_ms: number,
    item_id: string
}

export type InputAudioBufferSpeechStopped = {
    event_id: string,
    type: "input_audio_buffer.speech_stopped",
    audio_end_ms: number,
    item_id: string
}

export type RealtimeResponse = {
    id: string,
    object: "response.response",
    status: "completed" | "cancelled" | "failed" | "incomplete",
    status_details: {
        type: "completed" | "cancelled" | "incomplete" | "failed",
        reason: "turn_detected" | "client_cancelled" | "max_output_tokens" | "content_filter",
        error: {
            type: string,
            code: string
        }
    },
    output: ConversationItem[],
    metadata: Record<string, unknown>,
    usage: {
        total_tokens: number,
        input_tokens: number,
        output_tokens: number,
        input_token_details: {
            cached_tokens: number,
            text_tokens: number,
            audio_tokens: number,
        },
        output_token_details: {
            text_tokens: number,
            audio_tokens: number
        }
    }
}

export type ResponseCreated = {
    event_id: string,
    type: "response.created",
    response: RealtimeResponse
}

export type ResponseDone = {
    event_id: string,
    type: "response.done",
    response: RealtimeResponse
}

export type ResponseOutputItemAdded = {
    event_id: string,
    type: "response.output_item_added",
    response_id: string,
    output_index: number,
    item: ConversationItem,
}

export type ResponseOutputItemDone = {
    event_id: string,
    type: "response.output_item.done",
    response_id: string,
    output_index: number,
    item: ConversationItem
}

export type ContentPart = {
    type: "text" | "audio",
    text?: string,
    audio?: string,
    transcript?: string
}

export type ResponseContentPartAdded = {
    event_id: string,
    type: "response.content_part.added",
    response_id: string,
    item_id: string,
    output_index: number,
    content_index: number,
    part: ContentPart
}

export type ResponseContentPartDone = {
    event_id: string, 
    type: "response.content_part.done",
    response_id: string,
    item_id: string,
    output_index: number,
    content_index: number,
    part: ContentPart
}

export type ResponseTextDelta = {
    event_id: string,
    type: "response.text.delta",
    response_id: string,
    item_id: string,
    output_index: number,
    content_index: number,
    delta: string
}

export type ResponseTextDone = {
    event_iod: string,
    type: "response.text.done",
    response_id: string,
    item_id: string,
    output_index: number,
    content_index: number,
    text: string
}

export type ResponseAudioTranscriptDelta = {
    event_id: string,
    type: "response.audio_transcript.delta",
    repsonse_id: string,
    item_id: string,
    output_index: number,
    content_index: number,
    delta: string
}

export type ResponseAudioTranscriptDone = {
    event_id: string,
    type: "response.audio_transcript.done",
    response_id: string,
    item_id: string,
    output_index: number,
    content_index: number,
    transcript: string
}

export type ResponseAudioDelta = {
    event_id: string,
    type: "response.audio.delta",
    response_id: string,
    item_id: string,
    output_index: number,
    content_index: number,
    delta: string
}

export type ResponseAudioDone = {
    event_id: string,
    type: "response.audio.done",
    response_id: string,
    item_id: string,
    output_index: number,
    content_index: number
}

export type ResponseFunctionCallArgumentsDelta = {
    event_id: string,
    type: "response.function_call.arguments.delta",
    response_id: string,
    item_id: string,
    output_index: number,
    call_id: string,
    delta: string
}

export type ResponseFunctionCallArgumentsDone = {
    event_id: string,
    type: string,
    response_id: string,
    item_id: string,
    output_index: number,
    call_id: string,
    arguments: string
}

export type RateLimitsUpdated = {
    event_id: string,
    type: "rate_limits.updated",
    rate_limits: {
        name: "requests" | "tokens",
        limit: number,
        remaining: number,
        reset_seconds: number
    }[]
}