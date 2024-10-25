import { Anthropic } from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";
import { Observable, Subscription } from "rxjs";
import { Logger } from "../../../../logging/logger.js";
import { jsonParse } from "../../../../util/json.js";
import { isCompleteSentence } from "../../../../util/util.js";
import { TASK_COMPLETE_FUNCTION_NAME, ToolCall } from "../../../base/model.js";
import { ChatMessage, ChatRole, ChatSession, WorkerConfig } from "../../model.js";
import { AIService, InferenceState } from "./ai_service.js";
import { FunctionDocument } from "../../../../util/openapi.js";

export class AnthropicAIService implements AIService {
    private anthropic: Anthropic;
    private config: WorkerConfig;
    private logger: Logger = Logger.getInstance("AnthropicAIService");

    constructor(config: WorkerConfig) {
        this.config = config;
        this.anthropic = new Anthropic({
            apiKey: config.variables!.api_token! as string,
        });
    }

    async inference(args: {
        chatSession: ChatSession,
        functions?: FunctionDocument[],
        explainFunctions?: boolean,
        singleMessage?: boolean,
        intermediateMessageCallback?: (message: ChatMessage) => Promise<void>,
        modelOverride?: string,
        cancel?: Observable<boolean>,
        channelMessageId?: string,
        username?: string
    }): Promise<ChatMessage> {
        const { chatSession, functions, intermediateMessageCallback, modelOverride, cancel, channelMessageId} = args;
        // this.logger.debug(`inference() ${JSON.stringify(chatSession)}, ${JSON.stringify(functions)}, ${singleMessage}`);
        const tools = this.getChatTools(functions);
        // this.logger.debug(`inference() tools: ${JSON.stringify(tools, null, 2)}`);
        const abortController = new AbortController();
        const messages = this.createMessages(chatSession);
        this.logger.debug(`inference() messages: ${JSON.stringify(messages, null, 2)}`);

        const systemMessage = chatSession.messages.find(m => m.role === "system");

        const desiredMaxTokens = this.config.variables?.max_tokens ? +this.config.variables?.max_tokens : 4096;
        const maxTokens = Math.min(desiredMaxTokens, 4096);


        const stream = this.anthropic.beta.promptCaching.messages.stream({
            model: modelOverride ?? this.config.variables!.model as string,
            system: systemMessage?.text ? [
                {
                    text: systemMessage.text,
                    type: "text",
                    cache_control: { type: "ephemeral" }
                }
            ] : undefined,
            messages: messages.filter(m => m !== undefined),
            tools: tools,
            temperature: this.config.variables!.temperature ? +this.config.variables!.temperature : 0,
            max_tokens: maxTokens,
            top_p: this.config.variables!.top_p ? +this.config.variables!.top_p : 1,
            stream: true,
        }, {
            signal: abortController.signal,
            timeout: 60000 * 5,
        });

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

        stream.on("abort", () => {
            this.logger.debug(`inference() stream aborted`);
            if (!cancelled) {
                cancelled = true;
                cancelSubscription?.unsubscribe();
            }
        });

        stream.on("connect", () => {
            this.logger.debug(`inference() stream connected`);
        });

        stream.on("error", (error) => {
            this.logger.error(`inference() stream error ${JSON.stringify(error)}`);
            if (!cancelled) {
                cancelled = true;
                cancelSubscription?.unsubscribe();
            }
        });

        // This eslint rules is disabled because the for await loop is not supported by eslint
        // eslint-disable-next-line @typescript-eslint/await-thenable
        for await (const chatCompletion of stream) {
            if (cancelled) {
                this.logger.debug(`inference() cancelled`);
                break;
            }

            if (!finalResult && !done) {
                const result = this.handleCompletion({
                    data: chatCompletion,
                    chatSession,
                    state,
                    cancelled,
                    completionFunctions: tools,
                    channelMessageId: actualChannelMessageId,
                    partialResponseCallback: intermediateMessageCallback,
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
                        this.logger.debug(`${JSON.stringify(chatCompletion)}`);
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
        data: Anthropic.Beta.PromptCaching.Messages.RawPromptCachingBetaMessageStreamEvent,
        chatSession: ChatSession,
        state: InferenceState,
        cancelled: boolean,
        completionFunctions: Anthropic.Tool[] | undefined,
        channelMessageId: string,
        partialResponseCallback?: (partial: ChatMessage) => Promise<void>
    }): ChatMessage | "done" | undefined {
        const { data, chatSession, state, cancelled, completionFunctions, channelMessageId } = args;
        if (cancelled) {
            this.logger.debug(`inference() cancelled`);
            return "done";
        }

        if (data.type === "message_start") {
            state.role = "worker";
            state.inputTokens = data.message.usage.input_tokens;
            state.tokens = data.message.usage.input_tokens;
            state.cacheWriteTokens = data.message.usage.cache_creation_input_tokens ?? 0;
            state.cacheHitTokens = data.message.usage.cache_read_input_tokens ?? 0;
            this.logger.debug(`handleCompletion inputTokens: ${state.inputTokens}`);
            this.logger.debug(`handleCompletion cacheWriteTokens: ${state.cacheWriteTokens}`);
            this.logger.debug(`handleCompletion cacheHitTokens: ${state.cacheHitTokens}`);
            return;
        }
        

        // This is the final message
        if (data.type === "message_delta") {
            state.tokens += data.usage.output_tokens;
            state.outputTokens = data.usage.output_tokens;

            switch (data.delta.stop_reason) {
                case "max_tokens":
                    this.logger.debug(`inference() max tokens reached`);
                    return "done";
                case "end_turn":
                    this.logger.debug(`inference() end turn`);
                    return "done";
                case "stop_sequence":
                    this.logger.debug(`inference() stop sequence hit: ${data.delta.stop_sequence}`);
                    return "done";
                case "tool_use":
                    this.logger.debug(`inference() tool use`);
                    return this.createToolResponse(state, channelMessageId, chatSession.id);
                default:
                    return "done";
            }
        }

        if (data.type === "message_stop") {
            this.logger.debug(`inference() message stop`);
            return "done";
        }

        if (data.type === "content_block_start") {
            this.logger.debug(`inference() content block start`);
            if (data.content_block.type === "text") {
                appendToSentence(state, data.content_block.text);
            } else if (data.content_block.type === "tool_use") {
                this.logger.debug(`inference() tool use`);
                state.currentToolCallId = data.content_block.id;
                this.logger.debug(`inference() tool call id: ${state.currentToolCallId}`);
                this.logger.debug(`inference() tool call name: ${data.content_block.name}`);

                if (!state.toolCalls[state.currentToolCallId]) {
                    state.toolCalls[state.currentToolCallId] = {
                        call_id: data.content_block.id,
                        name: data.content_block.name,
                        arguments: {},
                        timestamp: new Date().getTime(),
                    }
                    state.isCompletionFunction = this.isMessageCompletionFunction(data.content_block.name, completionFunctions ?? []);
                }

                if (state.isCompletionFunction && state.currentToolCallId) {
                    if (!state.messageFunctionMessageStarted) {
                        const argString = state.toolCallArgStrings[state.currentToolCallId] ?? "";
                        state.messageFunctionMessageStarted = this.messageFunctionStarted(argString);
                        appendToSentence(state, this.getCurrentMessageFunctionText(argString));
                    } else {
                        appendToSentence(state, state.toolCallArgStrings[state.currentToolCallId] ?? "");
                    }
                }
            }
            return;
        }

        if (data.type === "content_block_delta") {
            if (data.delta.type === "text_delta") {
                appendToSentence(state, data.delta.text);
            } else if (data.delta.type === "input_json_delta") {
                if (state.currentToolCallId) {
                    const args = data.delta.partial_json;
                    if (!state.toolCallArgStrings[state.currentToolCallId]) {
                        state.toolCallArgStrings[state.currentToolCallId] = "";
                    }
                    state.toolCallArgStrings[state.currentToolCallId] += args;
                }

                if (state.currentToolCallId && state.isCompletionFunction) {
                    appendToSentence(state, this.getCurrentMessageFunctionText(state.toolCallArgStrings[state.currentToolCallId] ?? ""));
                }
            }
            return;
        }

        if (data.type === "content_block_stop") {
            this.logger.debug(`inference() content block stop`);
            state.currentMessageIndex++;
            state.sentences.push("");
            if (state.currentToolCallId) {
                this.logger.debug(`inference() tool_call: ${state.currentToolCallId} ${state.toolCallArgStrings[state.currentToolCallId]}`);
                if (!state.toolCallArgStrings[state.currentToolCallId] || //trimmed
                    state.toolCallArgStrings[state.currentToolCallId].trim().length === 0) {
                    state.toolCallArgStrings[state.currentToolCallId] = "{}";
                }
                state.currentToolCallId = undefined;
            }
            return;
        }



    }

    private createMessages(chatSession: ChatSession): (Anthropic.Beta.PromptCaching.Messages.PromptCachingBetaMessageParam | undefined)[] {
        // We want to make sure empty(falsey) messages are also filtered out, which is why we use the || operator
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        const messages = chatSession.messages.filter(m => m.text || m.toolCalls).flatMap((message) => {
            const role = this.mapChatRoleToAnthropicRole(message.role);
            if (role === "system") {
                return undefined;
            } else if (role === "user") {
                const content: (Anthropic.Beta.PromptCaching.PromptCachingBetaTextBlockParam | Anthropic.Beta.PromptCaching.PromptCachingBetaImageBlockParam)[] = [];
                if (message.text) {
                    content.push({
                        type: "text",
                        text: message.text,
                    });
                }
                if (message.image) {
                    content.push({
                        type: "image",
                        source: {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": message.image,
                        }
                    });
                }
                return {
                    role: role,
                    content: content,
                } as Anthropic.Beta.PromptCaching.Messages.PromptCachingBetaMessageParam;
            } else if (role === "assistant") {
                const content = [];
                if (message.text) {
                    content.push({
                        type: "text",
                        text: message.text,
                    });
                }
                if (message.image) {
                    content.push({
                        type: "image",
                        source: {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": message.image,
                        }
                    });
                }
                if (message.toolCalls) {
                    content.push(...message.toolCalls.map((tc) => this.createChatCompletionRequestMessageToolCall(tc)));
                }
                return {
                    role: role,
                    content: content,
                } as Anthropic.Beta.PromptCaching.Messages.PromptCachingBetaMessageParam;

            } else if (role === "tool") {
                const messages = message.toolCalls?.map((tc) => {
                    const content = [];
                    if (tc.result) {
                        content.push({
                            type: "text",
                            text: tc.result,
                        });
                    }
                    if (tc.image) {
                        content.push({
                            type: "image",
                            source: {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": tc.image,
                            }
                        });
                    }
                    return {
                        tool_use_id: tc.call_id,
                        type: "tool_result",
                        content: content,
                    } as (Anthropic.Beta.PromptCaching.PromptCachingBetaToolResultBlockParam);
                }) ?? [];
                return {
                    role: "user",
                    content: messages,

                } as Anthropic.Beta.PromptCaching.Messages.PromptCachingBetaMessageParam;
            }
        }).filter(m => m !== undefined);

        // we have to trail the cache back a bit to ensure that the last message is ephemeral
        // iterate backwards through messages to find the second to last user message and third to last user message, and set the cache control to ephemeral

        const userMessageCount = messages.filter(m => m?.role === "user").length;

        if (userMessageCount > 1) {
            let userMessageCount = 0;
            for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i]?.role === "user") {
                    userMessageCount++;
                    if (userMessageCount > 3) {
                        break;
                    }
                    if (userMessageCount === 2 || userMessageCount === 3) {
                        const userMessage = messages[i];
                        if (userMessage.content && userMessage.content.length >= 1) {
                            const last = userMessage.content[userMessage.content.length - 1] as Anthropic.Beta.PromptCaching.Messages.PromptCachingBetaTextBlockParam | Anthropic.Beta.PromptCaching.Messages.PromptCachingBetaImageBlockParam | Anthropic.Beta.PromptCaching.Messages.PromptCachingBetaToolUseBlockParam | Anthropic.Beta.PromptCaching.Messages.PromptCachingBetaToolResultBlockParam;
                            last.cache_control = { type: "ephemeral" };
                        }
                    }
                    
                }
            }

        }

        return messages;
    }

    private createToolResponse(state: InferenceState, channelMessageId: string, chatSessionId: string): ChatMessage {
        if (!state.toolCallArgStrings || Object.keys(state.toolCallArgStrings).length === 0) {
            throw new Error("function_argstrings is undefined");
        } else if (!state.role) {
            state.role = "worker";
        }

        for (const [id, argString] of Object.entries(state.toolCallArgStrings)) {
            this.logger.debug(`inference() tool_call: ${id} ${argString}`);
            const toolCall = state.toolCalls[id];
            if (!toolCall) {
                throw new Error(`Tool call with id ${id} not found`);
            }
            toolCall.arguments = jsonParse(argString) ?? {};
        }

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
    private messageFunctionStarted(functionArgstring: string): boolean {
        return functionArgstring.includes('message": "');
    }

    private getCurrentMessageFunctionText(functionArgstring: string): string {
        const messageStartIndex = functionArgstring.indexOf('message": "');
        if (messageStartIndex === -1) {
            return "";
        }
        return functionArgstring.substring(messageStartIndex + 10, functionArgstring.length - 1);
    }

    private isMessageCompletionFunction(functionName: string, functions: Anthropic.Tool[]): boolean {
        if (functions.length === 0) {
            return false;
        }
        if (functionName !== TASK_COMPLETE_FUNCTION_NAME) {
            return false;
        }
        for (const f of functions) {
            if (f.name !== TASK_COMPLETE_FUNCTION_NAME) {
                continue;
            }
            if (f.input_schema?.properties) {
                for (const key of Object.keys(f.input_schema.properties as Record<string, unknown>)) {
                    if (key.startsWith("message")) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private createChatCompletionRequestMessageToolCall(
        functionCall?: ToolCall
    ): Anthropic.ToolUseBlock | undefined {
        if (functionCall) {
            return {
                type: "tool_use",
                id: functionCall.call_id ?? randomUUID(),
                name: functionCall.name,
                input: functionCall.arguments,
            };
        }
    }

    private getChatTools(
        functions?: FunctionDocument[]
    ): Anthropic.Beta.PromptCaching.PromptCachingBetaTool[] | undefined {
        if (functions) {
            const completionFunctions: Anthropic.Beta.PromptCaching.PromptCachingBetaTool[] = [];
            for (const f of functions) {
                completionFunctions.push({
                    name: f.name,
                    description: f.description,
                    input_schema: f.parameters as Anthropic.Beta.PromptCaching.PromptCachingBetaTool.InputSchema
                });
            }
            if (completionFunctions.length > 0) {
                completionFunctions[completionFunctions.length - 1].cache_control = { type: "ephemeral" };
            }
            return completionFunctions;
        } else {
            return undefined;
        }
    }

    private mapChatRoleToAnthropicRole(role: ChatRole): string {
        switch (role) {
            case "user":
                return "user";
            case "worker":
                return "assistant";
            case "tool":
                return "tool";
            case "system":
                return "system";
            default:
                return "user";
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
            "claude-3-5-sonnet-20240620": {
                inputTokenPrice: 3 / 1000000,
                outputTokenPrice: 15 / 1000000,
                cacheWriteTokenPrice: 3.75 / 1000000,
                cacheHitTokenPrice: 0.3 / 1000000,
            },
            "claude-3-opus-20240229": {
                inputTokenPrice: 15 / 1000000,
                outputTokenPrice: 75 / 1000000,
                cacheWriteTokenPrice: 15 / 1000000,
                cacheHitTokenPrice: 75 / 1000000,
            },
            "claude-3-haiku-20240307": {
                inputTokenPrice: 0.25 / 1000000,
                outputTokenPrice: 1.25 / 1000000,
                cacheWriteTokenPrice: 0.25 / 1000000,
                cacheHitTokenPrice: 1.25 / 1000000,
            },
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