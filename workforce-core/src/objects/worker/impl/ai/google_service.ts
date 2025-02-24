import { Observable, Subscription } from "rxjs";
import { FunctionDocument } from "../../../../util/openapi.js";
import { ChatSession, ChatMessage, WorkerConfig, ChatRole } from "../../model.js";
import { AIService, InferenceState } from "./ai_service.js";
import { Content, EnhancedGenerateContentResponse, FinishReason, FunctionCallPart, FunctionDeclaration, FunctionDeclarationSchema, FunctionDeclarationsTool, FunctionResponsePart, GoogleGenerativeAI, InlineDataPart, TextPart, Tool } from "@google/generative-ai"
import { Logger } from "../../../../logging/logger.js";
import { TASK_COMPLETE_FUNCTION_NAME, ToolCall } from "../../../base/model.js";
import { jsonParse } from "../../../../util/json.js";
import { randomUUID } from "crypto";
import { isCompleteSentence } from "../../../../util/util.js";

export class GoogleAIService implements AIService {
    private google: GoogleGenerativeAI;
    private config: WorkerConfig;
    private logger: Logger = Logger.getInstance("GoogleAIService");

    constructor(config: WorkerConfig) {
        this.config = config;
        this.google = new GoogleGenerativeAI(config.variables!.api_token! as string)

    }

    async inference(args: {
        chatSession: ChatSession;
        functions?: FunctionDocument[];
        explainFunctions?: boolean;
        singleMessage?: boolean;
        intermediateMessageCallback?: (message: ChatMessage) => Promise<void>;
        modelOverride?: string;
        cancel?: Observable<boolean>;
        channelMessageId?: string;
        username?: string;
    }): Promise<ChatMessage> {
        const { chatSession, functions, intermediateMessageCallback, modelOverride, cancel, channelMessageId } = args;
        const functionDeclarations = this.getChatTools(functions);
        let tools: Tool[] | undefined = undefined;
        if (functionDeclarations && functionDeclarations.length > 0) {
            tools = [{
                functionDeclarations
            }]
        }
        const abortController = new AbortController();
        const messages = this.createMessages(chatSession);
        this.logger.debug(`inference() messages: ${JSON.stringify(messages, null, 2)}`);

        const systemMessage = chatSession.messages.find(m => m.role === "system");

        const desiredMaxTokens = this.config.variables?.max_tokens ? +this.config.variables?.max_tokens : 4096;
        const maxTokens = Math.min(desiredMaxTokens, 4096);

        const model = this.google.getGenerativeModel({
            model: modelOverride ?? this.config.variables!.model as string,
            generationConfig: {
                maxOutputTokens: maxTokens,
                temperature: this.config.variables!.temperature ? +this.config.variables!.temperature : 0,
                topP: this.config.variables!.top_p ? +this.config.variables!.top_p : 1,
            }
        })

        const stream = await model.generateContentStream({
            contents: messages,
            systemInstruction: systemMessage?.text,
            tools: tools
        }, {
            signal: abortController.signal,
            timeout: 60000 * 5
        })

        this.logger.debug(`inference() stream started`);
        let cancelled = false;
        let cancelSubscription: Subscription | undefined = undefined;

        cancelSubscription = cancel?.subscribe({
            next: (value) => {
                if (value) {
                    this.logger.debug(`inference() cancel received`);
                    cancelled = true;
                    abortController.abort();
                    cancelSubscription?.unsubscribe();
                }
            }
        });

        const state: InferenceState = {
            currentMessageIndex: 0,
            role: undefined,
            sentences: [""],
            currentToolCallId: undefined,
            toolCalls: {},
            toolCallArgStrings: {},
            isCompletionFunction: undefined,
            messageFunctionMessageStarted: false,
            functionDescribed: false,
            cost: 0,
            inputTokens: 0,
            outputTokens: 0,
            cacheWriteTokens: 0,
            cacheHitTokens: 0,
            tokens: 0,
        }

        const actualChannelMessageId = channelMessageId ?? randomUUID().toString();
        let done = false;
        let finalResult: ChatMessage | undefined;

        for await (const event of stream.stream) {
            if (cancelled) {
                this.logger.debug(`inference() cancelled`);
                break;
            }

            if (!finalResult && !done) {
                const result = this.handleCompletion({
                    data: event,
                    chatSession,
                    state,
                    cancelled,
                    completionFunctions: tools,
                    channelMessageId: actualChannelMessageId,
                    partialResponseCallback: intermediateMessageCallback
                });
                if (!state.sentences[state.currentMessageIndex]) {
                    state.sentences[state.currentMessageIndex] = "";
                }
                if (isCompleteSentence(state.sentences[state.currentMessageIndex])) {
                    intermediateMessageCallback?.({
                        id: randomUUID(),
                        channelMessageId: actualChannelMessageId,
                        sessionId: chatSession.id,
                        text: state.sentences[state.currentMessageIndex],
                        role: state.role ?? "worker",
                        timestamp: new Date().getTime(),
                        done: false,
                        cost: state.cost,
                        tokens: state.tokens,
                    }).catch((error) => {
                        this.logger.error(`inference() intermediateMessageCallback error: ${error}`);
                    });
                    state.currentMessageIndex++;
                    state.sentences.push("");
                }
                if (result === "done") {
                    if (cancelled) {
                        this.logger.debug(`inference() cancelled`);
                        this.logger.debug(`${JSON.stringify(event)}`);
                        state.sentences.push("There was an error processing your request and it was cancelled.");
                    }
                    done = true;
                } else if (result) {
                    finalResult = result;
                }
            }
        }

        state.cost = this.costEstimate({
            inputTokens: state.inputTokens,
            outputTokens: state.outputTokens,
            cacheWriteTokens: state.cacheWriteTokens,
            cacheHitTokens: state.cacheHitTokens,
            model: modelOverride ?? this.config.variables!.model as string,
        });

        if (finalResult) {
            finalResult.cost = state.cost;
            finalResult.tokens = state.tokens;
            return finalResult;
        }

        const chatMessage: ChatMessage = {
            id: randomUUID(),
            channelMessageId: actualChannelMessageId,
            sessionId: chatSession.id,
            text: state.sentences.join(""),
            role: state.role ?? "worker",
            timestamp: new Date().getTime(),
            done: true,
            cancelled: cancelled,
            cost: state.cost,
            tokens: state.tokens,
        }
        this.logger.debug(`inference() response ${JSON.stringify(chatMessage, null, 2)}`);
        return chatMessage;
    }

    private handleCompletion(args: {
        data: EnhancedGenerateContentResponse,
        chatSession: ChatSession,
        state: InferenceState,
        cancelled: boolean,
        completionFunctions: Tool[] | undefined,
        channelMessageId: string,
        partialResponseCallback?: (partial: ChatMessage) => Promise<void>
    }): ChatMessage | "done" | undefined {
        const { data, chatSession, state, cancelled, channelMessageId } = args;
        if (cancelled) {
            this.logger.debug(`inference() cancelled`);
            return "done";
        }

        const candidate = data.candidates?.[0];
        if (!candidate) {
            return undefined;
        }

        if (data.usageMetadata) {
            if (state.inputTokens === 0 && data.usageMetadata.promptTokenCount) {
                state.inputTokens = data.usageMetadata.promptTokenCount;
            }
            if (state.cacheHitTokens === 0 && data.usageMetadata.cachedContentTokenCount) {
                state.cacheHitTokens = data.usageMetadata.cachedContentTokenCount;
            }
            state.tokens = data.usageMetadata.totalTokenCount;
            state.outputTokens += data.usageMetadata.candidatesTokenCount;
            this.logger.debug(`handleCompletion inputTokens: ${state.inputTokens}`);
            this.logger.debug(`handleCompletion cacheWriteTokens: ${state.cacheWriteTokens}`);
            this.logger.debug(`handleCompletion cacheHitTokens: ${state.cacheHitTokens}`);
        }

        if (candidate.finishReason) {
            switch (candidate.finishReason) {
                case FinishReason.MAX_TOKENS:
                    this.logger.debug(`inference() max tokens reached`);
                    return "done";
                case FinishReason.STOP:
                    this.logger.debug(`inference() end turn`);
                    if (Object.keys(state.toolCalls).length > 0) {
                        return this.createToolResponse(state, channelMessageId, chatSession.id);
                    }
                    return "done";
                default:
                    return "done";
            }
        }

        for (const part of candidate.content.parts) {
            if (part.text) {
                appendToSentence(state, part.text);
            } else if (part.functionCall) {
                this.logger.debug(`inference() tool use`);
                state.currentToolCallId = randomUUID()

                state.toolCalls[state.currentToolCallId] = {
                    arguments: part.functionCall.args as Record<string, unknown> ?? {},
                    name: part.functionCall.name,
                    call_id: state.currentToolCallId
                }
                return;
            }
        }
    }

    private createToolResponse(state: InferenceState, channelMessageId: string, chatSessionId: string): ChatMessage {
        return {
            id: randomUUID(),
            channelMessageId: channelMessageId,
            sessionId: chatSessionId,
            role: "worker",
            text: (state.sentences && state.sentences.length > 0) ? state.sentences.join("") : undefined,
            toolCalls: Object.values(state.toolCalls),
            timestamp: new Date().getTime(),
            done: true,
            cost: state.cost,
            tokens: state.tokens,
        };
    }

    private isMessageCompletionFunction(functionName: string, tools: Tool[] | undefined): boolean {
        if (!tools) {
            return false;
        }
        const functionDeclartionTool: FunctionDeclarationsTool = tools[0] as FunctionDeclarationsTool;
        const functions = functionDeclartionTool.functionDeclarations;
        if (!functions || functions?.length === 0) {
            return false;
        }
        if (functionName !== TASK_COMPLETE_FUNCTION_NAME) {
            return false;
        }
        for (const f of functions) {
            if (f.name !== TASK_COMPLETE_FUNCTION_NAME) {
                continue;
            }
            if (f.parameters?.properties) {
                for (const key of Object.keys(f.parameters.properties as Record<string, unknown>)) {
                    if (key.startsWith("message")) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private createMessages(chatSession: ChatSession): Content[] {
        const messages: Content[] = chatSession.messages.filter(
            m =>
                this.mapChatRoleToGoogleRole(m.role) !== undefined
                && (m.text ?? m.toolCalls)
        ).flatMap((message) => {
            const role = this.mapChatRoleToGoogleRole(message.role)
            if (message.role === "user") {
                const parts: (TextPart | InlineDataPart)[] = [];
                if (message.text) {
                    parts.push({
                        text: message.text
                    })
                }
                if (message.image) {
                    parts.push({
                        inlineData: {
                            mimeType: "image/png",
                            data: message.image
                        }
                    })
                }
                return {
                    role,
                    parts
                } as Content
            } else if (message.role === "worker") {
                const parts: (TextPart | InlineDataPart | FunctionCallPart)[] = [];
                if (message.text) {
                    parts.push({
                        text: message.text
                    })
                }
                if (message.image) {
                    parts.push({
                        inlineData: {
                            mimeType: "image/png",
                            data: message.image
                        }
                    })
                }

                if (message.toolCalls) {
                    parts.push(...message.toolCalls.map(tc => this.createGoogleChatToolCall(tc)))
                }

                return {
                    role,
                    parts
                } as Content
            } else if (role === "tool" && message.toolCalls) {
                const parts: (InlineDataPart | FunctionResponsePart)[] = [];
                message.toolCalls.forEach(tc => {
                    if (tc.result) {
                        parts.push({
                            functionResponse: {
                                name: tc.name,
                                response: jsonParse(tc.result) ?? { response: tc.result }
                            }
                        })
                    }
                    if (tc.image) {
                        parts.push({
                            inlineData: {
                                mimeType: "image/png",
                                data: tc.image
                            }
                        })
                    }
                })
                return {
                    role,
                    parts
                }
            }
        }).filter(m => m !== undefined)

        return messages;
    }

    private createGoogleChatToolCall(toolCall: ToolCall): FunctionCallPart {
        return {
            functionCall: {
                name: toolCall.name,
                args: toolCall.arguments
            }
        }
    }

    private getChatTools(
        functions?: FunctionDocument[]
    ): FunctionDeclaration[] | undefined {
        if (functions) {
            const tools: FunctionDeclaration[] = [];
            for (const f of functions) {
                if (!f.parameters) {
                    continue;
                }
                tools.push({
                    name: f.name,
                    description: f.description,
                    parameters: f.parameters as FunctionDeclarationSchema,
                })
            }
            return tools;
        } else {
            return undefined;
        }
    }

    private mapChatRoleToGoogleRole(role: ChatRole): string | undefined {
        switch (role) {
            case "user":
                return "user"
            case "worker":
                return "model"
            case "tool":
                return "user"
            case "system":
                return undefined
        }
    }

    public costEstimate(args: { inputTokens: number, outputTokens: number, model: string, cacheWriteTokens?: number, cacheHitTokens?: number }): number {
        const { inputTokens, outputTokens, model, cacheWriteTokens, cacheHitTokens } = args;
        const { inputTokenPrice, outputTokenPrice, cacheWriteTokenPrice, cacheHitTokenPrice } = this.getPricePerToken(model);
        const cost = (inputTokens * inputTokenPrice) + (outputTokens * outputTokenPrice) + (cacheWriteTokens ? (cacheWriteTokens * cacheWriteTokenPrice) : 0) + (cacheHitTokens ? (cacheHitTokens * cacheHitTokenPrice) : 0);
        this.logger.debug(`costEstimate() ${cost}`);
        return cost;
    }

    private getPricePerToken(model: string): {
        inputTokenPrice: number,
        outputTokenPrice: number,
        cacheWriteTokenPrice: number,
        cacheHitTokenPrice: number
    } {
        const modelTokens: Record<string, {
            inputTokenPrice: number,
            outputTokenPrice: number,
            cacheWriteTokenPrice: number,
            cacheHitTokenPrice: number
        }> = {
            "gemini-1.5-pro": {
                inputTokenPrice: 1.25 / 1000000,
                outputTokenPrice: 5 / 1000000,
                cacheWriteTokenPrice: 0.3125 / 1000000,
                cacheHitTokenPrice: 0 / 1000000,
            }
        }
        if (modelTokens[model]) {
            return modelTokens[model];
        }
        return { inputTokenPrice: 0, outputTokenPrice: 0, cacheWriteTokenPrice: 0, cacheHitTokenPrice: 0 };
    }
}

function appendToSentence(state: InferenceState, text: string): void {
    const lengthDeficit = state.currentMessageIndex - state.sentences.length + 1;
    for (let i = 0; i < lengthDeficit; i++) {
        state.sentences.push("");
    }
    state.sentences[state.currentMessageIndex] += text;
}
