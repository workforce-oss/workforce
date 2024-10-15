import { RestApi, RestApiInstanceOptions } from "./base/rest_api.js";
import { WorkerConfig } from "workforce-core/model";
import { VariablesSchema } from "workforce-core/model";
import { VariableSchemaValidationError } from "workforce-core/model";

export class WorkerAPI extends RestApi<WorkerConfig, VariableSchemaValidationError> {
    static instance: WorkerAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): WorkerAPI {
        if (!WorkerAPI.instance || options.accessToken !== WorkerAPI.instance.accessToken) {
            WorkerAPI.instance = new WorkerAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "workers",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: VariablesSchema.validateBaseObject
            });
        }
        return WorkerAPI.instance;
    }
}