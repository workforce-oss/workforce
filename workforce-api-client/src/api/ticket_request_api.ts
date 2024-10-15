import { TicketRequest } from "workforce-core/model";
import { RestApi, RestApiInstanceOptions } from "./base/rest_api.js";

export class TicketRequestAPI extends RestApi<TicketRequest, string> {
    static instance: TicketRequestAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): TicketRequestAPI {
        if (!TicketRequestAPI.instance || options.accessToken !== TicketRequestAPI.instance.accessToken) {
            TicketRequestAPI.instance = new TicketRequestAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "ticket-requests",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return TicketRequestAPI.instance;
    }
}