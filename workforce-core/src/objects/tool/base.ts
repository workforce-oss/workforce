import { jsonStringify } from "../../util/json.js";
import { FunctionDocuments } from "../../util/openapi.js";
import { BaseObject } from "../base/base.js";
import { HumanState, ToolState } from "../base/model.js";
import { ToolStateCache } from "./cache.state.js";
import { ToolStateDb } from "./db.state.js";
import { ToolConfig, ToolRequest, ToolResponse } from "./model.js";

export abstract class Tool<TConfig extends ToolConfig> extends BaseObject<TConfig> {
	abstract execute(
		request: ToolRequest,
	): Promise<ToolResponse>;

	private _stateCache?: ToolStateCache;

	get stateCache(): ToolStateCache {
		if (!this._stateCache) {
			throw new Error("Tool.stateCache not initialized");
		}
		return this._stateCache;
	}

	protected displayName = "Tool";

	async initializeStateCache(): Promise<void> {
		this._stateCache = await ToolStateCache.for(this.config.id!);
	}

	abstract initSession(
		taskExecutionId?: string,
		workerId?: string,
		channelId?: string,
	): Promise<void>;

	abstract getTaskOutput(taskExecutionId?: string): Promise<string | undefined>;

	protected async updateState(args: {
		taskExecutionId: string,
		machineState?: Record<string, unknown>,
		humanState?: HumanState,
	}): Promise<void> {
		const { machineState, humanState, taskExecutionId } = args
		const created = await ToolStateDb.create({
			toolId: this.config.id!,
			taskExecutionId: taskExecutionId,
			machineState: jsonStringify(machineState),
			humanState: jsonStringify(humanState),
		}).catch((err: Error) => {
			this.logger.error(`Error creating state for taskExecutionId=${taskExecutionId} toolId=${this.config.id} error=${err}`);
			return undefined;
		});
		if (!created) {
			this.logger.warn(`Error saving state to db for taskExecutionId=${taskExecutionId} toolId=${this.config.id}`);
		}
		this.logger.debug(`Created state for taskExecutionId=${taskExecutionId} toolId=${this.config.id}`);
		const toolState: ToolState<Record<string, unknown>> = {
			toolId: this.config.id!,
			timestamp: Date.now(),
			taskExecutionId,
			machineState,
			humanState
		};
		await this._stateCache?.taskExecutionIdsToToolState.set(taskExecutionId, jsonStringify(toolState));
	}

	public getState(args: {
		currentState?: ToolState<Record<string, unknown>>;
		taskExecutionId?: string;
		channelId?: string;
		channelThreadId?: string;
		workerId?: string;
	}): Promise<ToolState<Record<string, unknown>> | undefined> {
		return Promise.resolve(args.currentState);
	}

	abstract workCompleteCallback(taskExecutionId: string): Promise<void>;

	public topLevelObjectKey(): string {
		return `execute_${this.config.name}`;
	}

	schema(): Promise<FunctionDocuments> {
		return Promise.resolve({
			functions: [],
		});
	}

	public async hasFunction(functionName: string): Promise<boolean> {
		const schema = await this.schema();
		if (!schema.functions) {
			return false;
		}
		return (
			(schema.functions).findIndex((func) => {
				return func.name === functionName;
			}) >= 0
		);
	}
}
