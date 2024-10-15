import { Logger } from "../../../../logging/logger.js";
import { VariablesSchema } from "../../../base/variables_schema.js";
import { WorkerBroker } from "../../../worker/broker.js";
import { Task } from "../../base.js";
import { TaskConfig, TaskExecutionRequest } from "../../model.js";
import { SimpleTaskMetadata } from "./simple_task_metadata.js";
import { ChannelMessageDataKey, ChannelType } from "../../../channel/model.js";

export class SimpleTask extends Task {
	logger = Logger.getInstance("SimpleTask");

	constructor(config: TaskConfig, onFailure: (objectId: string, error: string) => void) {
		super(config, onFailure);
	}

	public static defaultConfig(orgId: string): TaskConfig {
		return SimpleTaskMetadata.defaultConfig(orgId);
	}

	public execute(
		taskExecution: TaskExecutionRequest,
		workerBroker: WorkerBroker,
		channelType?: ChannelType,
		onError?: (error: Error) => void
	): void {
		workerBroker
			.getWorkerWithSkillsAndChannel(this.config.orgId, this.config.requiredSkills ?? [], channelType)
			.then((workerId) => {
				if (!workerId) {
					throw new Error(
						`No worker found for task ${this.config.name} with skills ${JSON.stringify(this.config.requiredSkills)}`,
					);
				}
				const promptTemplate = this.config.variables?.prompt_template as string | undefined;

				if (!promptTemplate) {
					throw new Error(`No prompt_template found for task ${this.config.name}`);
				}

				const systemMessageTemplate = this.config.variables?.system_message_template as string | undefined ?? "";

				const prompt = this.templateVars(promptTemplate, taskExecution.inputs ?? {});
				const systemMessage = this.templateVars(
					systemMessageTemplate,
					taskExecution.inputs ?? {}
				);
				let channelMessageData = undefined;
				if (taskExecution.inputs?.[ChannelMessageDataKey]) {
					channelMessageData = taskExecution.inputs[ChannelMessageDataKey];
				}
				workerBroker.request({
					workerId: workerId,
					taskId: taskExecution.taskId,
					taskExecutionId: taskExecution.taskExecutionId,
					timestamp: Date.now(),
					input: { prompt: prompt, systemMessage: systemMessage, [ChannelMessageDataKey]: channelMessageData },
					completionFunction: taskExecution.completionFunction,
					documentation: this.config.documentation,
					tools: this.config.tools,
					channelId: taskExecution.channelId,
					costLimit: this.config.costLimit,
				});
			})
			.catch((error: Error) => {
				this.logger.error(`Error executing task ${this.config.name}: ${error}`);
				if (onError) {
					onError(error);
				}
			});
	}

	static variablesSchema(): VariablesSchema {
		return SimpleTaskMetadata.variablesSchema();
	}

	public async destroy(): Promise<void> {
		// nothing to do
	}
	public topLevelObjectKey(): string {
		return "tasks";
	}
	public validateObject(): Promise<boolean> {
		return Promise.resolve(true);
	}
}
