import { RestApi, RestApiInstanceOptions } from "./base/rest_api.js";
import { FlowConfig } from "workforce-core/model";
import { VariableSchemaValidationError, validateFlowSchema } from "workforce-core/model";

export class FlowAPI extends RestApi<FlowConfig, VariableSchemaValidationError> {
    static instance: FlowAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): FlowAPI {
        if (!FlowAPI.instance || options.accessToken !== FlowAPI.instance.accessToken) {
            FlowAPI.instance = new FlowAPI({
                basePath: options.basePath ?? "/workforce-api", 
                resource: "flows",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: validateFlowSchema
            });
        }
        return FlowAPI.instance;
    }
}