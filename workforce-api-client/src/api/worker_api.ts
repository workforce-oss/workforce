import { RestApi, RestApiInstanceOptions } from "./base/rest_api.js";
import { ChatSession, WorkerConfig, WorkRequestData } from "workforce-core/model";
import { VariablesSchema } from "workforce-core/model";
import { VariableSchemaValidationError } from "workforce-core/model";
import { OrgSubResourceAPI } from "./org_api.subresource.js";
import { SubResourceApi } from "./base/rest_api.subresource.js";

export class WorkerAPI extends OrgSubResourceAPI<WorkerConfig, VariableSchemaValidationError> {
    static instance: WorkerAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): WorkerAPI {
        if (!WorkerAPI.instance || options.accessToken !== WorkerAPI.instance.accessToken) {
            WorkerAPI.instance = new WorkerAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "workers",
                objectType: "worker",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: VariablesSchema.validateBaseObject
            });
        }
        WorkerAPI.instance.ChatSessions = WorkerChatSessionAPI.getInstance(options);
        WorkerAPI.instance.WorkRequests = WorkerWorkRequestAPI.getInstance(options);
        return WorkerAPI.instance;
    }

    ChatSessions: WorkerChatSessionAPI;
    WorkRequests: WorkerWorkRequestAPI;
}

export interface WorkerSubResourceCallOptions {
    orgId: string;
    workerId: string;
    queryParams?: Record<string, string>;
}

class WorkerSubResourceApi<T, TValidationError> extends SubResourceApi<T, TValidationError, WorkerSubResourceCallOptions> {
    rootResources(options: WorkerSubResourceCallOptions): { name: string; id: string }[] {
        return [
            { name: "orgs", id: options.orgId },
            { name: "workers", id: options.workerId }
        ];
    }
}

export class WorkerChatSessionAPI extends WorkerSubResourceApi<ChatSession, string> {
    static instance: WorkerChatSessionAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): WorkerChatSessionAPI {
        if (!WorkerChatSessionAPI.instance || options.accessToken !== WorkerChatSessionAPI.instance.accessToken) {
            WorkerChatSessionAPI.instance = new WorkerChatSessionAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "worker-chat-sessions",
                objectType: "worker-chat-session",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return WorkerChatSessionAPI.instance;
    }
}

export class WorkerWorkRequestAPI extends WorkerSubResourceApi<WorkRequestData, string> {
    static instance: WorkerWorkRequestAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): WorkerWorkRequestAPI {
        if (!WorkerWorkRequestAPI.instance || options.accessToken !== WorkerWorkRequestAPI.instance.accessToken) {
            WorkerWorkRequestAPI.instance = new WorkerWorkRequestAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "work-requests",
                objectType: "work-request",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return WorkerWorkRequestAPI.instance;
    }
}