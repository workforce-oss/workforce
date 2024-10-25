import { TaskConfig, VariableSchemaValidationError } from "workforce-core";
import { RestApiInstanceOptions } from "./base/rest_api.js";
import { FlowSubResourceApi } from "./flow_api.subresource.js";

export class TaskAPI extends FlowSubResourceApi<TaskConfig, VariableSchemaValidationError> {
    static instance: TaskAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): TaskAPI {
        if (!TaskAPI.instance || options.accessToken !== TaskAPI.instance.accessToken) {
            TaskAPI.instance = new TaskAPI({
                basePath: options?.basePath ?? "/workforce-api",
                resource: "tasks",
                objectType: "task",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return TaskAPI.instance;
    }
}