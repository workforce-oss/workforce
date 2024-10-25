import { TrackerConfig, VariableSchemaValidationError } from "workforce-core";
import { RestApiInstanceOptions } from "./base/rest_api.js";
import { FlowSubResourceApi } from "./flow_api.subresource.js";
import { SubResourceApi } from "./base/rest_api.subresource.js";
import { TicketRequest } from "workforce-core/model";

export class TrackerAPI extends FlowSubResourceApi<TrackerConfig, VariableSchemaValidationError> {
    static instance: TrackerAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): TrackerAPI {
        if (!TrackerAPI.instance || options.accessToken !== TrackerAPI.instance.accessToken) {
            TrackerAPI.instance = new TrackerAPI({
                basePath: options?.basePath ?? "/workforce-api",
                resource: "trackers",
                objectType: "tracker",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
            TrackerAPI.instance.TicketRequests = TrackerTicketRequestAPI.getInstance(options);
        }
        return TrackerAPI.instance;
    }

    TicketRequests: TrackerTicketRequestAPI;
}

export interface TrackerSubResourceCallOptions {
    orgId: string;
    flowId: string;
    trackerId: string;
    queryParams?: Record<string, string>;
}

class TrackerSubResourceApi<T, TValidationError> extends SubResourceApi<T, TValidationError, TrackerSubResourceCallOptions> {
    rootResources(options: TrackerSubResourceCallOptions): { name: string; id: string }[] {
        return [
            { name: "orgs", id: options.orgId },
            { name: "flows", id: options.flowId },
            { name: "trackers", id: options.trackerId }
        ];
    }
}

export class TrackerTicketRequestAPI extends TrackerSubResourceApi<TicketRequest, string> {
    static instance: TrackerTicketRequestAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): TrackerTicketRequestAPI {
        if (!TrackerTicketRequestAPI.instance || options.accessToken !== TrackerTicketRequestAPI.instance.accessToken) {
            TrackerTicketRequestAPI.instance = new TrackerTicketRequestAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "ticket-requests",
                objectType: "ticket-request",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return TrackerTicketRequestAPI.instance;
    }
}