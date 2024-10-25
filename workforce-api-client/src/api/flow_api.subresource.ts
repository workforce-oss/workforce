import { SubResourceApi } from "./base/rest_api.subresource.js";

export interface FlowSubResourceCallOptions {
    orgId: string;
    flowId: string;
    queryParams?: Record<string, string>;
}

export class FlowSubResourceApi<T, TValidationError> extends SubResourceApi<T, TValidationError, FlowSubResourceCallOptions> {
    rootResources(options: FlowSubResourceCallOptions): { name: string; id: string }[] {
        return [
            { name: "orgs", id: options.orgId },
            { name: "flows", id: options.flowId }
        ];
    }
}