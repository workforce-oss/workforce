import { ChannelMessage, ChatSession, TaskExecution, ToolRequestData, WorkRequestData } from "workforce-core/model";
import { RestApiInstanceOptions } from "./base/rest_api.js";
import { OrgSubResourceAPI } from "./org_api.subresource.js";
import { SubResourceApi } from "./base/rest_api.subresource.js";

export class TaskExecutionAPI extends OrgSubResourceAPI<TaskExecution, string> {
    static instance: TaskExecutionAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): TaskExecutionAPI {
        if (!TaskExecutionAPI.instance || options.accessToken !== TaskExecutionAPI.instance.accessToken) {
            TaskExecutionAPI.instance = new TaskExecutionAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "task-executions",
                objectType: "task-execution",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
            TaskExecutionAPI.instance.ChannelMessages = TaskExecutionChannelMessageAPI.getInstance(options);
            TaskExecutionAPI.instance.ToolRequests = TaskExecutionToolRequestAPI.getInstance(options);
            TaskExecutionAPI.instance.WorkRequests = TaskExecutionWorkRequestAPI.getInstance(options);
            TaskExecutionAPI.instance.ChatSessions = TaskExecutionWorkerChatSessionAPI.getInstance(options);
        }
        return TaskExecutionAPI.instance;
    }

    ChannelMessages: TaskExecutionChannelMessageAPI;
    ToolRequests: TaskExecutionToolRequestAPI;
    WorkRequests: TaskExecutionWorkRequestAPI;
    ChatSessions: TaskExecutionWorkerChatSessionAPI;
}

export interface TaskExecutionSubResourceCallOptions {
    orgId: string;
    taskExecutionId: string;
    queryParams?: Record<string, string>;
}

export class TaskExecutionSubResourceApi<T, TValidationError> extends SubResourceApi<T, TValidationError, TaskExecutionSubResourceCallOptions> {
    rootResources(options: TaskExecutionSubResourceCallOptions): { name: string; id: string }[] {
        return [
            { name: "orgs", id: options.orgId },
            { name: "task-executions", id: options.taskExecutionId }
        ];
    }
}

export class TaskExecutionChannelMessageAPI extends TaskExecutionSubResourceApi<ChannelMessage, string> {
    static instance: TaskExecutionChannelMessageAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): TaskExecutionChannelMessageAPI {
        if (!TaskExecutionChannelMessageAPI.instance || options.accessToken !== TaskExecutionChannelMessageAPI.instance.accessToken) {
            TaskExecutionChannelMessageAPI.instance = new TaskExecutionChannelMessageAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "channel-message",
                objectType: "channel-message",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return TaskExecutionChannelMessageAPI.instance;
    }
}

export class TaskExecutionToolRequestAPI extends TaskExecutionSubResourceApi<ToolRequestData, string> {
    static instance: TaskExecutionToolRequestAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): TaskExecutionToolRequestAPI {
        if (!TaskExecutionToolRequestAPI.instance || options.accessToken !== TaskExecutionToolRequestAPI.instance.accessToken) {
            TaskExecutionToolRequestAPI.instance = new TaskExecutionToolRequestAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "tool-requests",
                objectType: "tool-request",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
               
        return TaskExecutionToolRequestAPI.instance;
    }
}

export class TaskExecutionWorkRequestAPI extends TaskExecutionSubResourceApi<WorkRequestData, string> {
    static instance: TaskExecutionWorkRequestAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): TaskExecutionWorkRequestAPI {
        if (!TaskExecutionWorkRequestAPI.instance || options.accessToken !== TaskExecutionWorkRequestAPI.instance.accessToken) {
            TaskExecutionWorkRequestAPI.instance = new TaskExecutionWorkRequestAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "work-requests",
                objectType: "work-request",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return TaskExecutionWorkRequestAPI.instance;
    }
}

export class TaskExecutionWorkerChatSessionAPI extends TaskExecutionSubResourceApi<ChatSession, string> {
    static instance: TaskExecutionWorkerChatSessionAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): TaskExecutionWorkerChatSessionAPI {
        if (!TaskExecutionWorkerChatSessionAPI.instance || options.accessToken !== TaskExecutionWorkerChatSessionAPI.instance.accessToken) {
            TaskExecutionWorkerChatSessionAPI.instance = new TaskExecutionWorkerChatSessionAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "worker-chat-sessions",
                objectType: "worker-chat-session",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return TaskExecutionWorkerChatSessionAPI.instance;
    }
}