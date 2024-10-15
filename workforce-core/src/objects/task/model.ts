import { FunctionDocument } from "../../util/openapi.js";
import { BaseConfig, ToolCall } from "../base/model.js";

export type TaskFunctionProperty = Record<string, unknown>;

export interface TaskExecutionRequest {
	taskId: string;
	taskExecutionId: string;
	orgId: string;
	users: string[];
    channelId?: string;
	parentTaskExecutionId?: string;
	taskName?: string;
	inputs?: Record<string, string>;
	completionFunction?: FunctionDocument;
	costLimit?: number;
}

export interface TaskExecutionResponse {
	taskId: string;
	taskExecutionId: string;
	orgId: string;
	users: string[];
	result: ToolCall | string;
	workerId: string;
}

export interface TaskExecution {
	taskId: string;
	id: string;
	timestamp: number;
	taskName?: string;
	orgId?: string;
	users?: string[];
	parentTaskId?: string;
	inputs?: Record<string, string>;
	outputs?: Record<string, string>;
	status?: string;
	costLimit?: number;
	// message?: string;
}

export type TaskType = (typeof taskTypes)[number];

export type TaskExecutionStatus = "started" | "complete" | "error";

export const taskTypes = ["mock", "simple-task", "structured-task"] as const;

export interface ToolReference {
	name: string;

	id?: string;
	/**
	 * Optional resource to store the output of the tool.
	 * When using the API, this is name, but internally it gets converted to id.
	 */
	output?: string;
}

export interface Subtask {
	name: string;
	id?: string;
	async?: string;
}

// export interface DocumentReference {
// 	/**
// 	 * The repository to use for the document.
// 	 * When using the API, this is name, but internally it gets converted to id.
// 	 */
// 	repository: string;

// 	/**
// 	 * The list of documents from the repository to use.
// 	 * If this is empty, then all documents are used.
// 	 * When using the API, these are names, but internally they get converted to ids.
// 	 */
// 	documents?: string[];
// }

export interface TaskConfig extends BaseConfig {
	subtype: TaskType;

	/**
	 * The list of skills needed for this task.
	 * This is used to match workers to tasks.
	 */
	requiredSkills?: string[];

	/**
	 * The default channel to use for communication.
	 * When using the API, this is name, but internally it gets converted to id.
	 */
	defaultChannel?: string;

	/**
	 * The id of the tracker to use for execution.
	 * When using the API, this is name, but internally it gets converted to id.
	 */
	tracker?: string;

	/**
	 * The id of the resource to use for execution.
	 * When using the API, these use names, but internally they get converted to ids.
	 */
	documentation?: string[];

	/**
	 * The list of tools needed for this task.
	 * When using the API, these are name, but internally they get converted to ids.
	 */
	tools?: ToolReference[];

	/**
	 * Triggers associated with this task.
	 * When using the API, this is name, but internally it gets converted to id.
	 */
	triggers?: string[];

	/**
	 * The inputs for this task.
	 * This is a map of input name to object.
	 * When using the API, these are names, but internally they get converted to ids.
	 */
	inputs?: Record<string, string | string[]>;

	/**
	 * The outputs for this task.
	 * This is a flat list of objects.
	 * When using the API, these are names, but internally they get converted to ids.
	 */
	outputs?: string[];

	/**
	 * The cost limit for this task.
	 * Task execution will stop if the cost exceeds this limit.
	 */
	costLimit?: number;

	/**
	 * Subtasks that can be executed in parallel
	 * When using the API, these are names, but internally they get converted to ids.
	 */

	subtasks?: Subtask[];
}
