import { TaskConfig, VariableSchemaValidationError } from "workforce-core";
import { RestApi, RestApiInstanceOptions } from "./base/rest_api.js";

export class TaskAPI extends RestApi<TaskConfig, VariableSchemaValidationError> {
    static instance: TaskAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): TaskAPI {
        if (!TaskAPI.instance || options.accessToken !== TaskAPI.instance.accessToken) {
            TaskAPI.instance = new TaskAPI({
                basePath: options?.basePath ?? "/workforce-api",
                resource: "tasks",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return TaskAPI.instance;
    }
}