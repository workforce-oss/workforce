import { randomUUID } from "crypto";
import { Subject } from "rxjs";
import { Logger } from "../../../../logging/logger.js";
import { BrokerManager } from "../../../../manager/broker_manager.js";
import { ToolCall } from "../../../base/model.js";
import { VariablesSchema } from "../../../base/variables_schema.js";
import { Worker } from "../../base.js";
import { ChatMessage, ChatSession, WorkRequest, WorkerConfig } from "../../model.js";
import { MockWorkerMetadata } from "./mock_worker_metadata.js";

export class MockWorker extends Worker {

	logger = Logger.getInstance("MockWorker");
	maxIterations = 25;
	currentIteration = 0;

	constructor(config: WorkerConfig) {
		super(config, () => undefined);

	}

	public static defaultConfig(orgId: string): WorkerConfig {
		return MockWorkerMetadata.defaultConfig(orgId);
	}

	inference(
		args: {
			chatSession: ChatSession;
			workRequest: WorkRequest;
			toolSchemas: Record<string, ToolCall[]>;
			messageOutputSubject: Subject<ChatMessage>;
			singleMessage?: boolean;
			intermediateCallback?: (message: ChatMessage) => Promise<void>;
		},
	): Promise<void> {
		const { chatSession, workRequest} = args;
		const response: ChatMessage = {
			id: randomUUID(),
			role: "worker",
			sessionId: chatSession.id,
			senderId: workRequest.workerId,
			done: true,
			timestamp: Date.now(),
		};
		if (chatSession.messages[chatSession.messages.length - 1]?.text?.includes(this.config.variables?.subtask_message as string) && this.config.variables?.subtask_tool_call) {
			this.logger.debug(`inference() mock response: subtask_function`);
			response.toolCalls = [this.config.variables?.subtask_tool_call as ToolCall];
		} else if (chatSession.messages[chatSession.messages.length - 1]?.text?.includes(this.config.variables?.final_message as string) && this.config.variables?.output) {
			this.logger.debug(`inference() mock response: final_message`);
			response.toolCalls = [this.config.variables?.output as ToolCall];
		} else {
			response.text = `worker-response-${this.currentIteration}`;
		}
		this.currentIteration++;

		this.logger.debug(`inference() mock response: ${JSON.stringify(response)}`);
		args.messageOutputSubject.next(response);
		// if (!response.toolCalls) {
		// 	setTimeout(() => {
		// 		this.sendNextMessage(workRequest).catch((e) => {
		// 			this.logger.error(`inference() Chat session ${workRequest.taskId} failed with error ${e}`);
		// 		});
		// 	}, 200);
		// }
		return Promise.resolve();
	}

	private async sendNextMessage(workRequest: WorkRequest): Promise<void> {
		if (workRequest.channelId && this.config.variables?.messageCount) {
			let currentIteration = 0;
			this.logger.debug(`sendNextMessage() Chat session ${workRequest.taskId} simulated response iteration ${currentIteration}`);
			currentIteration++;
			await BrokerManager.channelBroker
				.message({
					channelId: workRequest.channelId,
					workerId: workRequest.workerId,
					taskExecutionId: workRequest.taskExecutionId,
					timestamp: Date.now(),
					senderId: workRequest.channelId,
					messageId: randomUUID(),
					message: workRequest.input.prompt as string,
				})
				.catch((e) => {
					this.logger.error(`sendNextMessage() Chat message for task ${workRequest.taskId} failed with error ${e}`);
				});
		}

	}

	work(workRequest: WorkRequest): Promise<void> {
		return super.work(workRequest).catch((e) => {
			this.logger.error(`work() Chat session ${workRequest.taskId} failed with error ${e}`);
		});
		// if (workRequest.channelId && this.config.variables?.messageCount) {
		// 	try {
		// 		this.logger.debug(`work() Chat session ${workRequest.taskId} started`);
		// 		let currentIteration = 0;
		// 		while (currentIteration < this.config.variables?.messageCount ?? this.maxIterations) {
		// 			this.logger.debug(`work() Chat session ${workRequest.taskId} simulated response iteration ${currentIteration}`);
		// 			currentIteration++;
		// 			await BrokerManager.channelBroker
		// 				.message({
		// 					channelId: workRequest.channelId,
		// 					workerId: workRequest.workerId,
		// 					taskExecutionId: workRequest.taskExecutionId,
		// 					timestamp: Date.now(),
		// 					senderId: workRequest.channelId,
		// 					messageId: randomUUID(),
		// 					message: workRequest.input.prompt,
		// 				})
		// 				.catch((e) => {
		// 					this.logger.error(`work() Chat session ${workRequest.taskId} failed with error ${e}`);
		// 				});
		// 			await new Promise((resolve) => setTimeout(resolve, 200));
		// 		}
		// 		this.logger.debug(`work() Chat session ${workRequest.taskId} ended`);
		// 	} catch (e) {
		// 		this.logger.error(`work() Chat session ${workRequest.taskId} failed with error ${e}`);
		// 	}
		// }
	}

	static variablesSchema(): VariablesSchema {
		return MockWorkerMetadata.variablesSchema();
	}

	public destroy(): Promise<void> {
		// nothing to do
		return Promise.resolve();
	}
}
