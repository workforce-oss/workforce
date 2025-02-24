import { ObjectSubtype, ObjectType } from "./factory/types.js";

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

export type WorkforceImage =
    | {
        type: "url";
        data: string;
    }
    | {
        type: "base64";
        mediaType: string;
        data: string;
    };

export type WorkforceFile = 
    | {
        name: string;
        type: "url";
        data: string;
    }
    | {
        name: string;
        type: "base64";
        mediaType: string;
        data: string;
    };

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

export interface CustomObject {
    id?: string;
    orgId: string;
    spaceId?: string;
    name: string;
    description: string;
    baseUrl: string;
    objectType: ObjectType;
    typeName: string;
    securityScheme?: Record<string, unknown>;
    variablesSchema?: CustomObjectVariablesSchema;
}

export interface CustomObjectVariablesSchema {
    required?: string[];
    properties?: Record<string, CustomObjectVariablesSchemaElement>;
}

export interface CustomObjectVariablesSchemaElement {
    type: "string" | "number" | "boolean" | "object" | "array";
    description?: string;
    default?: string | number | boolean | Record<string, unknown> | [];
    enum?: string[];
    min?: number;
    max?: number;
    "x-workforce-multiline"?: boolean;
    "x-workforce-sensitive"?: boolean;
    "x-workforce-required-for"?: {
        name: string;
        option: string;
    }[],
    "x-workforce-optional-for"?: {
        name: string;
        option: string;
    }[],
    "x-workforce-hidden"?: boolean;
    "x-workforce-advanced"?: boolean;
}

export interface ObjectError {
    objectId: string;
    error: Error;
}