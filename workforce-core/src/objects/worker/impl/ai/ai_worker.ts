import { BehaviorSubject, Subject } from "rxjs";
import { Logger } from "../../../../logging/logger.js";
import { BrokerManager } from "../../../../manager/broker_manager.js";
import { ToolCall } from "../../../base/model.js";
import { VariablesSchema } from "../../../base/variables_schema.js";
import { ChannelBroker } from "../../../channel/broker.js";
import { DocumentRepository } from "../../../document_repository/base.js";
import { Worker } from "../../base.js";
import { ChatMessage, ChatSession, WorkRequest, WorkerConfig } from "../../model.js";
import { AIService } from "./ai_service.js";
import { AIServiceFactory } from "./ai_service_factory.js";
import { AIWorkerMetadata } from "./ai_worker_metadata.js";
import { ToolImageHelper } from "../../base.tool_image_helper.js";
import { jsonStringify } from "../../../../util/json.js";
import { FunctionDocument } from "../../../../util/openapi.js";
export class AIWorker extends Worker {
	logger = Logger.getInstance("AIWorker");

	private aiService: AIService;
	private explainFunctions = false;

	constructor(config: WorkerConfig) {
		super(config, () => undefined);
		this.aiService = AIServiceFactory.create(config);
		const explainFunctions = config.variables?.explain_functions as boolean | undefined;
		this.explainFunctions = explainFunctions ?? false;
	}

	public static defaultConfig(orgId: string): WorkerConfig {
		return AIWorkerMetadata.defaultConfig(orgId);
	}


	public async inference(
		args: {
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
		},
		cancel?: BehaviorSubject<boolean>
	): Promise<void> {
		const { chatSession, workRequest, toolSchemas, messageOutputSubject, singleMessage, intermediateCallback, username } = args;
		const functions: FunctionDocument[] = [];
		if (workRequest.completionFunction) {
			functions.push(workRequest.completionFunction);
		}
		if (!singleMessage) {
			for (const functionList of Object.values(toolSchemas)) {
				functions.push(...functionList);
			}
		}
		if (workRequest.documentation) {
			functions.push(DocumentRepository.functionSchema());
		}
		const task = BrokerManager.taskBroker.getObject(workRequest.taskId);
		if (task?.config.subtasks) {
			const subTaskFunctions = await task.getSubtaskFunctionSchema();
			if (subTaskFunctions) {
				functions.push(...subTaskFunctions);
			}

		}
		this.logger.debug(
			`inference() singleMessage: ${singleMessage}, explainFunctions: ${this.explainFunctions}, functions: ${functions.length}`
		);

		if (!intermediateCallback) {
			this.logger.debug(`inference() no intermediate callback`);
		}

		const state = await BrokerManager.toolBroker.getState({ taskExecutionId: workRequest.taskExecutionId, channelId: chatSession.channelId, workerId: this.config.id });

		if (state) {
			this.logger.debug(`inference() state: ${JSON.stringify(state)}`);
			const lastMessage = chatSession.messages[chatSession.messages.length - 1];
			if (lastMessage && state?.machineState) {
				if (lastMessage.toolCalls) {
					lastMessage.toolCalls[lastMessage.toolCalls.length - 1].result += `\n\n${JSON.stringify(state.machineState, null, 2)}`;
				} else {
					lastMessage.text += `\n\n${JSON.stringify(state.machineState, null, 2)}`;
				}
			}
			if (lastMessage && state.machineImage) {
				if (lastMessage.toolCalls) {
					lastMessage.toolCalls[lastMessage.toolCalls.length - 1].image = state.machineImage;
				} else {
					lastMessage.image = state.machineImage;
				}
			}
		} else {
			this.logger.debug(`inference() no state found`);
		}

		if (args.maxTokenCount && args.currentTokenCount) {
			await this.compressChat({
				chatSession,
				tokenCount: args.currentTokenCount,
				maxTokenCount: args.maxTokenCount,
				compressionMethod: args.compressionMethod,
			});
		}

		// Quick hack to add tool image URLs to the last message
		if (chatSession.messages.length > 0) {
			const lastMessage = chatSession.messages[chatSession.messages.length - 1];
			const toolImageData = await ToolImageHelper.getAllImageUrls({ taskExecutionId: workRequest.taskExecutionId });
			if (toolImageData.length > 0) {
				const toolImageInstructions = `The following images were created in tasks related to the current task, and are available at the following URLs:\n\n${jsonStringify(toolImageData)}`
				lastMessage.text = `${toolImageInstructions}\n\n${lastMessage.text}`;
			}
		}

		cancel?.next(false);

		const result = await this.aiService.inference({
			chatSession,
			functions,
			explainFunctions: this.explainFunctions,
			singleMessage,
			intermediateMessageCallback: intermediateCallback,
			modelOverride: undefined,
			cancel,
			channelMessageId: undefined,
			username,
		});
		messageOutputSubject.next(result);
	}

	private formatCacheKeyMessage(key: ChatMessage): Record<string, unknown> {
		return {
			text: key.text,
			state: key.state,
			username: key.username,
			role: key.role,
			done: key.done,
			cancelled: key.cancelled,
			toolCalls: key.toolCalls?.map((tc) => {
				return {
					args: tc.arguments,
					result: tc.result,
					name: tc.name,
				};
			}),
		};

	}

	public async compressChat(args: { chatSession: ChatSession, tokenCount: number, maxTokenCount: number, compressionMethod?: string }): Promise<void> {
		const { chatSession, tokenCount, maxTokenCount, compressionMethod } = args;
		// if we are at 75% of the token count, compress the messages
		if (tokenCount < maxTokenCount * 0.75) {
			this.logger.debug(`compressChat() tokenCount=${tokenCount} is less than 75% of maxTokenCount=${maxTokenCount}`);
			return;
		}

		if (!compressionMethod || compressionMethod === "none") {
			this.logger.debug(`compressChat() no compression method specified`);
			return;
		}

		const messages = chatSession.messages;


		if (compressionMethod === "trim_middle") {
			this.logger.debug(`compressChat() compressionMethod=trim_middle, messages.length=${messages.length}`);
			this.truncateMiddle({ chatSession, tokenCount, maxTokenCount });
			this.logger.debug(`compressChat() compressionMethod=trim_middle, messages.length=${chatSession.messages.length}`);
		}
		return Promise.resolve();
	}

	private truncateMiddle(args: { chatSession: ChatSession, tokenCount: number, maxTokenCount: number }): void {
		const { chatSession, } = args;
		const messages = chatSession.messages;
		const newMessages = [];
		// if we have 3 or fewer messages, we can't compress
		if (messages.length <= 3) {
			return;
		}

		// find the middle message
		const middle = Math.floor(messages.length / 2);

		// if the middle message is an assistant or tool message, we should prune backwards until we find a user message, pruning everything including the user message
		// then, we should prune forwards until we find a user message, and prune everything, not including the user message

		// if the middle message is a user message, we should prune backwards until we find an assistant message, pruning everything including the assistant message

		const middleMessage = messages[middle];

		if (middleMessage.role === "user") {
			// prune backwards until we find an assistant message
			let i = middle - 1;
			while (i >= 0) {
				if (messages[i].role === "worker" || messages[i].role === "tool") {
					break;
				}
				i--;
			}

			// prune forwards until we find an assistant message
			let j = middle + 1;
			while (j < messages.length) {
				if (messages[j].role === "worker" || messages[j].role === "tool") {
					break;
				}
				j++;
			}

			// prune the messages
			for (let k = 0; k < i; k++) {
				newMessages.push(messages[k]);
			}
			for (let k = j; k < messages.length; k++) {
				newMessages.push(messages[k]);
			}
		} else {
			// prune backwards until we find a user message
			let i = middle - 1;
			while (i >= 0) {
				if (messages[i].role === "user") {
					break;
				}
				i--;
			}

			// prune forwards until we find a user message
			let j = middle + 1;
			while (j < messages.length) {
				if (messages[j].role === "user") {
					break;
				}
				j++;
			}

			// prune the messages
			for (let k = 0; k < i; k++) {
				newMessages.push(messages[k]);
			}
			for (let k = j; k < messages.length; k++) {
				newMessages.push(messages[k]);
			}
		}

		chatSession.messages = newMessages;
	}




	static variablesSchema(): VariablesSchema {
		return AIWorkerMetadata.variablesSchema();
	}

	public async destroy(): Promise<void> {
		// Nothing to do
	}
}
