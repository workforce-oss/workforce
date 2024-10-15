import { randomUUID } from "crypto";
import { CompletionCreateParams } from "groq-sdk/resources/chat/index.js";
import OpenAI from "openai";
import { ChatCompletionAssistantMessageParam, ChatCompletionChunk, ChatCompletionMessage, ChatCompletionMessageParam, ChatCompletionMessageToolCall, ChatCompletionSystemMessageParam, ChatCompletionTool, ChatCompletionToolMessageParam } from "openai/resources/chat/completions";
import { Observable, Subscription } from "rxjs";
import { Logger } from "../../../../logging/logger.js";
import { jsonParse } from "../../../../util/json.js";
import { FunctionDocument } from "../../../../util/openapi.js";
import { isCompleteSentence } from "../../../../util/util.js";
import { TASK_COMPLETE_FUNCTION_NAME, ToolCall } from "../../../base/model.js";
import { ChatMessage, ChatRole, ChatSession, WorkerConfig } from "../../model.js";
import { AIService, InferenceState } from "./ai_service.js";

export class OpenAIService implements AIService {
	private openai: OpenAI;
	private config: WorkerConfig;
	private logger: Logger = Logger.getInstance("OpenAIService");

	constructor(config: WorkerConfig) {
		this.logger.debug(`constructor() ${JSON.stringify(config)}`);

		if (!config.variables?.api_token) {
			throw new Error("api_token is required");
		}

		this.openai = new OpenAI({
			apiKey: config.variables.api_token as string,
		});
		this.config = config;
	}
	async inference(args: {
		chatSession: ChatSession,
		functions: FunctionDocument[] | undefined,
		explainFunctions?: boolean,
		singleMessage?: boolean,
		intermediateMessageCallback?: (partial: ChatMessage) => Promise<void>,
		modelOverride?: string,
		cancel?: Observable<boolean>,
		channelMessageId?: string,
		username?: string
	}
	): Promise<ChatMessage> {
		const { chatSession, functions, singleMessage, intermediateMessageCallback, modelOverride, cancel, channelMessageId, username } = args;

		this.logger.debug(`inference() ${JSON.stringify(chatSession)}, ${JSON.stringify(functions)}, ${singleMessage}`);
		const completionFunctions = this.getChatTools(functions);
		const abortController = new AbortController();
		const messages = this.createMessages(chatSession);
		this.logger.debug(`inference() messages: ${JSON.stringify(messages, null, 2)}`);

		const desiredMaxTokens = this.config.variables!.max_tokens ? +this.config.variables!.max_tokens : 4096;
		//clamp max tokens to 4096
		const maxTokens = Math.min(desiredMaxTokens, 4096);

		const stream = await this.openai.chat.completions.create(
			{
				model: modelOverride ?? this.config.variables!.model as string,
				messages: messages,
				tools: completionFunctions,
				temperature: this.config.variables!.temperature ? +this.config.variables!.temperature : 0,
				max_tokens: maxTokens,
				top_p: this.config.variables!.top_p ? +this.config.variables!.top_p : 1,
				stream: true,
				stream_options: {
					include_usage: true,
				},
			},
			{
				signal: abortController.signal,
				timeout: 60000 * 5,
			}
		);
		this.logger.debug(`inference() stream created`);
		let cancelled = false;

		let cancelSubscription: Subscription | undefined = undefined;

		cancelSubscription = cancel?.subscribe({
			next: (value) => {
				if (value) {
					this.logger.debug(`inference() canceling inference`);
					cancelled = true;
					abortController.abort();
					cancelSubscription?.unsubscribe();
				}
			},
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
			tokens: 0,
		}
		const actualChannelMessageId = channelMessageId ?? randomUUID().toString();
		let done = false;
		let finalResult: ChatMessage | undefined;

		// This eslint rules is disabled because the for await loop is not supported by eslint
		// eslint-disable-next-line @typescript-eslint/await-thenable
		for await (const chatCompletion of stream) {
			if (cancelled) {
				this.logger.debug(`inference() cancelled`);
				break;
			}

			if (!finalResult && !done && chatCompletion.choices.length > 0) {
				const data = chatCompletion.choices[0].delta;

				const result = this.handleCompletion({
					data,
					chatSession,
					state,
					cancelled,
					completionFunctions,
					channelMessageId: actualChannelMessageId,
					partialResponseCallBack: intermediateMessageCallback,
					explainFunctions: args.explainFunctions,
					finishReason: chatCompletion.choices[0].finish_reason,
					username
				});
				if (result === "done") {
					if (cancelled) {
						this.logger.debug(`inference() cancelled`);
						this.logger.debug(`inference() completion: ${JSON.stringify(chatCompletion)}`);
						state.sentences.push("There was an error processing your request and it was cancelled.");
					}
					done = true;
				} else if (result) {
					finalResult = result;
				}
			}

			if (chatCompletion.usage) {
				const usage = chatCompletion.usage;
				state.cost += this.costEstimate({ inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens, model: this.config.variables!.model as string });
				state.tokens += usage.total_tokens;
				this.logger.debug(`inference() cost: ${state.cost}`);
			}
		}

		if (finalResult) {
			finalResult.cost = state.cost;
			finalResult.tokens = state.tokens;
			return finalResult;
		}


		if (!state.role) {
			state.role = "worker";
		}

		this.logger.debug(`inference() sentences: ${JSON.stringify(state.sentences)}`);
		const chatMessage: ChatMessage = {
			id: randomUUID(),
			channelMessageId: actualChannelMessageId,
			sessionId: chatSession.id,
			username: args.username,
			text: state.sentences.join(""),
			role: state.role,
			timestamp: new Date().getTime(),
			done: true,
			cancelled: cancelled,
			cost: state.cost,
			tokens: state.tokens,
		};
		this.logger.debug(`inference() chatMessage: ${JSON.stringify(chatMessage)}`);
		return chatMessage;
	}

	private handleCompletion(args: {
		data: ChatCompletionMessage | ChatCompletionChunk.Choice.Delta,
		chatSession: ChatSession,
		state: InferenceState,
		cancelled: boolean,
		completionFunctions: ChatCompletionTool[] | undefined,
		channelMessageId: string,
		explainFunctions?: boolean,
		partialResponseCallBack?: (partial: ChatMessage) => Promise<void>,
		finishReason?: string | null,
		username?: string
	}): ChatMessage | "done" | undefined {
		const { data, chatSession, state, cancelled, completionFunctions, channelMessageId, partialResponseCallBack, finishReason, username } = args;
		if (cancelled) {
			this.logger.debug(`inference() cancelled`);
			return "done";
		}
		if (data?.role && !state.role) {
			state.role = this.mapOpenAIRoleToChatRole(data.role);
		}

		if (data?.tool_calls) {
			this.handleToolCalls(data, state, completionFunctions);
		} else if (data?.content) {
			appendToSentence(state, data.content);
		} else if (!data) {
			this.logger.debug(`inference() delta is undefined`);
		} else {
			this.logger.debug(`inference() delta has no values: ${JSON.stringify(data)}`);
		}

		if (finishReason === "tool_calls") {
			this.logger.debug(`inference() completion.choices[0].finish_reason === "function_call"`);
			return this.createToolResponse(state, channelMessageId ?? randomUUID().toString(), chatSession.id);
		}

		if (finishReason === "stop") {
			this.logger.debug(`inference() completion.choices[0].finish_reason === "stop"`);
			return "done";
		}

		if (state.sentences.length < state.currentMessageIndex + 1) {
			state.sentences.push("");
		}

		if (isCompleteSentence(state.sentences[state.currentMessageIndex])) {
			if (!state.role) {
				state.role = "worker";
			}

			this.logger.debug(
				`inference() complete sentence: ${state.sentences[state.currentMessageIndex]}`
			);
			if (!partialResponseCallBack) {
				this.logger.debug(`inference() partialResponseCallBack is undefined`);
			}
			partialResponseCallBack?.({
				id: randomUUID(),
				channelMessageId: channelMessageId ?? randomUUID().toString(),
				sessionId: chatSession.id,
				username: username,
				role: state.role,
				text: state.sentences[state.currentMessageIndex],
				timestamp: new Date().getTime(),
				done: false,
				cost: state.cost,
				tokens: state.tokens,
			}).then(() => {
				this.logger.debug(`inference() partialResponseCallBack success`);
			})
				.catch((e) => {
					this.logger.error(`inference() partialResponseCallBack error: ${e}`);
				});
			state.currentMessageIndex++;
			state.sentences.push("");
		}


	}

	private createMessages(chatSession: ChatSession): ChatCompletionMessageParam[] {
		// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
		return chatSession.messages.filter(m => m.text || m.toolCalls).flatMap((message) => {
			const role = this.mapChatRoleToOpenAIRole(message.role);
			if (role === "system") {
				return {
					role: "system",
					content: message.text,
				} as ChatCompletionSystemMessageParam;
			} else if (role === "user") {
				return {
					role: "user",
					content: message.text,
					name: message.username,
				} as ChatCompletionMessageParam;
			} else if (role === "assistant") {
				const chatMessage = {
					role: "assistant",
					content: message.text,
					name: message.username,
				} as ChatCompletionAssistantMessageParam;

				const toolCalls = message.toolCalls?.map((toolCall) => {
					return this.createChatCompletionRequestMessageToolCall(toolCall);
				});

				if (toolCalls) {
					chatMessage.tool_calls = toolCalls as ChatCompletionMessageToolCall[];
				}
				return chatMessage;
			} else if (role === "tool") {
				return message.toolCalls?.map((toolCall) => {
					return {
						role: "tool",
						tool_call_id: toolCall.call_id,
						name: toolCall.name,
						content: toolCall.result,
					} as ChatCompletionToolMessageParam;
				});
			}
		}).filter((message) => message !== undefined) as ChatCompletionMessageParam[];
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
			role: state.role ?? "worker",
			text: (state.sentences && state.sentences.length > 0) ? state.sentences.join("") : undefined,
			toolCalls: Object.values(state.toolCalls),
			timestamp: new Date().getTime(),
			done: true,
			cost: state.cost,
			tokens: state.tokens,
		};

	}

	private handleToolCalls(data: ChatCompletionMessage | ChatCompletionChunk.Choice.Delta, state: InferenceState, completionFunctions?: CompletionCreateParams.Tool[]) {
		if (!data.tool_calls) {
			return;
		}

		for (const toolCall of data.tool_calls) {

			if (toolCall.function) {
				if (toolCall.function.name && toolCall.id) {
					// if (describeFunctions) {
					// 	this.describeFunctionCall(toolCall.function.name, chatSession, randomUUID(), partialResponseCallBack);
					// }
					state.currentToolCallId = toolCall.id;
					if (!state.toolCalls[toolCall.id]) {
						this.logger.debug(`inference() tool_call.function.name: ${toolCall.function.name}`);
						state.toolCalls[toolCall.id] = {
							name: toolCall.function.name,
							arguments: {},
							call_id: toolCall.id,
						};
						state.isCompletionFunction = this.isMessageCompletionFunction(toolCall.function.name, completionFunctions);
					}
				}

				if (state.currentToolCallId && toolCall.function.arguments) {
					const args = toolCall.function.arguments || "";
					state.toolCallArgStrings[state.currentToolCallId] = state.toolCallArgStrings[state.currentToolCallId] || "";
					state.toolCallArgStrings[state.currentToolCallId] += args;
				}

				if (state.isCompletionFunction && state.currentToolCallId) {

					if (!state.messageFunctionMessageStarted) {
						const argString = state.toolCallArgStrings[state.currentToolCallId];
						this.logger.debug(
							`inference() checking for message start. functionArgstring: ${argString}`
						);
						state.messageFunctionMessageStarted = this.messageFunctionStarted(argString ?? "");
						appendToSentence(state, this.getCurrentMessageFunctionText(argString ?? ""));
					} else {
						appendToSentence(state, state.toolCallArgStrings[state.currentToolCallId]);
						if (!state.role) {
							state.role = "worker";
						}

					}

					//TODO: Add support for describing tool calls
				}
			}
		}
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

	private isMessageCompletionFunction(functionName: string, functions?: CompletionCreateParams.Tool[]): boolean {
		if (!functions || functions.length === 0) {
			return false;
		}
		if (functionName !== TASK_COMPLETE_FUNCTION_NAME) {
			return false;
		}
		for (const f of functions) {
			if (f.function?.name !== TASK_COMPLETE_FUNCTION_NAME) {
				continue;
			}
			if (f.function?.parameters?.properties) {
				for (const key of Object.keys(f.function?.parameters.properties)) {
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
	): ChatCompletionMessageToolCall | undefined {
		if (functionCall) {
			return {
				type: "function",
				id: functionCall.call_id ?? randomUUID(),
				function: {
					name: functionCall.name,
					arguments: JSON.stringify(functionCall.arguments),
				}
			};
		} else {
			return undefined;
		}
	}

	private getChatTools(
		functions?: FunctionDocument[]
	): ChatCompletionTool[] | undefined {
		if (functions) {
			const completionFunctions: ChatCompletionTool[] = [];
			for (const f of functions) {
				if (f.parameters) {
					completionFunctions.push({
						type: "function",
						function: {
							name: f.name,
							description: f.description,
							parameters: f.parameters as unknown as Record<string, unknown>,
						},
					});
				}
			}
			return completionFunctions;
		} else {
			return undefined;
		}
	}

	private mapChatRoleToOpenAIRole(role: ChatRole) {
		switch (role) {
			case "user":
				return "user";
			case "worker":
				return "assistant";
			case "system":
				return "system";
			case "tool":
				return "tool";
			default:
				return "user";
		}
	}

	private mapOpenAIRoleToChatRole(role: string | undefined): ChatRole {
		switch (role) {
			case "user":
				return "user";
			case "assistant":
				return "worker";
			case "system":
				return "system";
			case "tool":
				return "tool";
			default:
				return "worker";
		}
	}

	public costEstimate(args: { inputTokens: number; outputTokens: number, model: string; }): number {
		const { inputTokens, outputTokens, model } = args;
		const { inputTokenPrice, outputTokenPrice } = this.getPricePerToken(model);
		const cost = (inputTokens * inputTokenPrice) + (outputTokens * outputTokenPrice);
		this.logger.debug(`costEstimate() cost: ${cost}`);
		return cost;

	}

	private getPricePerToken(model: string): { inputTokenPrice: number, outputTokenPrice: number } {
		const modelTokens: Record<string, { inputTokenPrice: number, outputTokenPrice: number }> = {
			"gpt-4o": {
				inputTokenPrice: 5 / 1000000,
				outputTokenPrice: 15 / 1000000,
			},
			"gpt-4-turbo": {
				inputTokenPrice: 10 / 1000000,
				outputTokenPrice: 30 / 1000000,
			},
			"gpt-4-32k": {
				inputTokenPrice: 60 / 1000000,
				outputTokenPrice: 120 / 1000000,
			},
			"gpt-4-0125-preview": {
				inputTokenPrice: 10 / 1000000,
				outputTokenPrice: 30 / 1000000,
			},
			"gpt-3.5-turbo": {
				inputTokenPrice: 0.50 / 1000000,
				outputTokenPrice: 1.50 / 1000000,
			},
			"gpt-3.5-turbo-instruct": {
				inputTokenPrice: 1.50 / 1000000,
				outputTokenPrice: 2.00 / 1000000,
			},
		};
		if (modelTokens[model]) {
			return modelTokens[model];
		}
		return { inputTokenPrice: 0, outputTokenPrice: 0 };
	}
}

function appendToSentence(state: InferenceState, text: string): void {
    const lengthDeficit = state.currentMessageIndex - state.sentences.length + 1;
    for (let i = 0; i < lengthDeficit; i++) {
        state.sentences.push("");
    }
    state.sentences[state.currentMessageIndex] += text;
}
