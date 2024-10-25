import { FunctionDocument } from "../../util/openapi.js";
import { BaseConfig, ToolCall } from "../base/model.js";
import { ChannelType } from "../channel/model.js";
import { ToolReference } from "../task/model.js";

export interface WorkResponse {
	workerId: string;
	taskId: string;
	taskExecutionId: string;
	timestamp: number;
	output: ToolCall | string;
}

export interface PartialResponse {
	workerId: string;
	taskId: string;
	taskExecutionId: string;
	output: string;
}

export interface WorkRequest {
	workerId: string;
	taskId: string;
	taskExecutionId: string;
	timestamp: number;
	completionFunction?: FunctionDocument;
	channelId?: string;
	tools?: ToolReference[];
	documentation?: string[];
	costLimit?: number;
	input: Record<string, unknown>;

}

export interface ChatSession {
	id: string;
	taskExecutionId: string;
	messages: ChatMessage[];
	channelId?: string;
}

export interface ChatMessage {
	id: string;
	sessionId: string;
	role: ChatRole;
	timestamp: number;
	username?: string;
	senderId?: string;
	text?: string;
	state?: Record<string, unknown> | string;
	image?: string;
	done?: boolean;
	toolCalls?: ToolCall[];
	channelMessageId?: string;
	cancelled?: boolean;
	tokens?: number;
	cost?: number;
}

export interface Skill {
	id?: string;
	orgId: string;
	name: string;
	description?: string;
}

export interface WorkRequestData {
	id: string;
	workerId: string;
	taskExecutionId: string;
	status: WorkRequestStatus;
	request?: WorkRequest;
	response?: WorkResponse;
	toolSchemas?: Record<string, ToolCall[]>;
	cost?: number;
	tokens?: number;
	activeSubtasks?: string[];
}

export type ChatRole = "user" | "worker" | "system" | "tool";

export type WorkerRole = "worker" | "critic";

export type WorkerType = (typeof workerTypes)[number];

export type WorkRequestStatus = "queued" | "in-progress" | "complete" | "error";

export const workerTypes = ["mock-worker", "ai-worker", "human-worker"] as const;

export interface WorkerConfig extends BaseConfig {
	type: WorkerType;

	/**
	 * Map of channel types to credentials.
	 * When using the API, this is name, but internally it gets converted to id.
	 */
	channelUserConfig?: Record<ChannelType, string>;

	/**
	 * List of skills the worker has.
	 */
	skills?: string[];

	/**
	 * wipLimit is the number of tasks a worker can have in progress at a time.
	 */
	wipLimit?: number;
}
