import { ObjectSubtype } from "./factory/types.js";

export const TASK_COMPLETE_FUNCTION_NAME = "complete_task";
export const SUBTASK_SUMMARY_FUNCTION_NAME = "provide_summary";

export interface ToolCall {
    name: string;
    arguments: Record<string, unknown>;
    timestamp?: number;
    call_id?: string;
    sessionId?: string;
    result?: string;
    image?: string;
    humanState?: HumanState;
    toolRequestId?: string;
    toolType?: string;
}

export interface ToolState<TMachineState> {
    toolId: string;
    taskExecutionId: string;
    timestamp: number;
    humanState?: HumanState;
    machineState?: TMachineState;
    machineImage?: string;
}

export interface HumanState {
    name?: string;
    type?: string;
    embed?: string;
    directUrl?: string;
}

export interface BaseConfig {
    id?: string;
    orgId: string;
    flowId?: string;
    name: string;
    description: string;
    type: ObjectSubtype;
    credential?: string;
    variables?: Record<string, unknown>;
}

export interface ObjectError {
    objectId: string;
    error: Error;
}