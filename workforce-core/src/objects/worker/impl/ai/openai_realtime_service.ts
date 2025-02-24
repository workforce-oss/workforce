import OpenAI from "openai";
import { FunctionDocument } from "../../../../util/openapi.js";
import { ChatSession, ChatMessage, WorkerConfig, WorkRequest } from "../../model.js";
import { AIService } from "./ai_service.js";
import { Logger } from "../../../../logging/logger.js";
import { ToolCall } from "../../../../model.js";
import { Subject } from "rxjs";
import { ChannelBroker } from "../../../channel/broker.js";

export class OpenAIRealtimeService implements AIService {

    private openai: OpenAI;
    private config: WorkerConfig;
    private logger: Logger = Logger.getInstance("OpenAIRealtimeService");

    private initializedSessions = new Set();

    private webRTCBaseURL = "https://api.openai.com/v1/realtime";

    constructor(config: WorkerConfig) {
        this.config = config;
        if (!config.variables?.api_token) {
            throw new Error("api_token is required for OpenAIRealtimeService");
        }

        this.openai = new OpenAI({
            apiKey: config.variables.api_token as string,
        });

        this.config = config;

        this.logger.info("OpenAIRealtimeService initialized");
    }

    inference(args: {
        chatSession: ChatSession;
        workRequest: WorkRequest;
        toolSchemas: Record<string, ToolCall[]>;
        messageOutputSubject: Subject<ChatMessage>;
        maxTokenCount: number;
        currentTokenCount?: number;
        compressionMethod?: string;
        channelBroker?: ChannelBroker;
        singleMessage?: boolean;
        intermediateCallback?: (message: ChatMessage) => Promise<void>;
        username?: string;
        criticEnabled?: boolean;
    }): Promise<ChatMessage> {
        if (!this.initializedSessions.has(args.chatSession.id)) {
            this.initializedSessions.add(args.chatSession.id);
            for (let i = 0; i < args.chatSession.messages.length; i++) {
                if (i === 0) {
                    continue;
                }
                if (args.intermediateCallback) {
                    args.intermediateCallback(args.chatSession.messages[i]).catch((e: Error) => {
                        this.logger.warn("Error invoking intermediate callback", e);
                    })
                }
                
            }
        }
        return Promise.resolve(args.chatSession.messages[args.chatSession.messages.length - 1]);
    }

    async realtimeSession(args: { taskExecutionId: string, systemMessage: string, functions?: FunctionDocument[]; explainFunctions?: boolean; modelOverride?: string; username?: string; }): Promise<{ sessionId: string; workerId: string, token: string; baseUrl: string; model: string; }> {
        const { taskExecutionId, systemMessage, functions, modelOverride } = args;

        const userTemperature = this.config.variables?.temperature as number | undefined ?? 0;

        const temperature =  Math.min(1.2, Math.max(0.6, userTemperature));

        const response = await this.openai.post("/realtime/sessions", {
            body: {
                model: modelOverride ?? this.config.variables?.model,
                modalities: ["audio", "text"],
                instructions: systemMessage,
                voice: "alloy",
                input_audio_format: "pcm16",
                output_audio_format: "pcm16",
                input_audio_transcription: {
                    model: "whisper-1"
                },
                turn_detection: {
                  type: "server_vad",  
                },
                tools: functions?.map((f) => {
                    return {
                        type: "function",
                        name: f.name,
                        description: f.description ?? f.summary ?? null,
                        parameters: f.parameters
                    }
                }),
                tool_choice: "auto",
                temperature,
                max_response_output_tokens: Math.min(4096, this.config.variables?.max_tokens as number | undefined ?? 4096)
            }
        });

        const token = (response as {
            client_secret: {
                value: string,
                expires_at: number
            }
        }).client_secret.value;

        return {
            token,
            sessionId: taskExecutionId,
            workerId: this.config.id!,
            baseUrl: this.webRTCBaseURL,
            model: modelOverride ?? this.config.variables?.model as string
        }
    }


}