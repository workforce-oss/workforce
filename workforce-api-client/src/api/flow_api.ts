import { FlowConfig, VariableSchemaValidationError, validateFlowSchema } from "workforce-core/model";
import { RestApiInstanceOptions } from "./base/rest_api.js";
import { OrgSubResourceAPI } from "./org_api.subresource.js";

export class FlowAPI extends OrgSubResourceAPI<FlowConfig, VariableSchemaValidationError> {
    static instance: FlowAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): FlowAPI {
        if (!FlowAPI.instance || options.accessToken !== FlowAPI.instance.accessToken) {
            FlowAPI.instance = new FlowAPI({
                basePath: options.basePath ?? "/workforce-api", 
                resource: "flows",
                objectType: "flow",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: validateFlowSchema
            });
        }
        return FlowAPI.instance;
    }
}