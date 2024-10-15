import { TaskExecution } from "workforce-core/model";
import { RestApi, RestApiInstanceOptions } from "./base/rest_api.js";

export class TaskExecutionAPI extends RestApi<TaskExecution, string> {
    static instance: TaskExecutionAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): TaskExecutionAPI {
        if (!TaskExecutionAPI.instance || options.accessToken !== TaskExecutionAPI.instance.accessToken) {
            TaskExecutionAPI.instance = new TaskExecutionAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "task-executions",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return TaskExecutionAPI.instance;
    }
}