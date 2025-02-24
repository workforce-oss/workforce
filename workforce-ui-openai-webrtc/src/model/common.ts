export type Modality = "text" | "audio"

export type Voice = "alloy" | "ash" | "ballad" | "coral" | "echo" | "sage" | "shimmer" | "verse";

export type AudioFormat = "pcm16" | "g711_ulaw" | "g711_alaw"

export type OpenAITool = {
    type: "function",
    name: string,
    description: string,
    parameters: Record<string, unknown> 
 }

export type Session = {
    id: string,
    modalities: Modality[],
    model: string,
    instructions: string,
    voice: Voice,
    input_audio_format: AudioFormat,
    output_audio_format: AudioFormat,
    input_audio_transcription?: {
        model: "whisper-1"
    } | null,
    turn_detection?: {
        type: "server_vad",
        threshold?: number | null,
        prefix_padding_ms?: number | null,
        silence_duration_ms?: number | null,
        tools?: OpenAITool[],
        tool_choice?: string,
        temperatur: number,
        max_response_output_tokens: number | "inf"
    }   
}

export type ConversationItemType = "message" | "function_call" | "function_call_output"

export type ConversationItemRole = "user" | "assistant" | "system"

export type ConversationItem = {
    id: string,
    type: ConversationItemType,
    object?: "realtime.item",
    status?: "completed" | "incomplete",
    role?: ConversationItemRole,
    content?: {
        type: "input_text" | "input_audio" | "item_reference" | "text",
        text?: string,
        item_reference?: string,
        audio?: string,
        transcript?: string
    }[],
    // id of function call
    call_id?: string;
    // name of function call
    name?: string
    // arguments for function call
    arguments?: string;
    // output for function call output
    output?: string;
};