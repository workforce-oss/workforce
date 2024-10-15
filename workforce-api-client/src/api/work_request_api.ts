import { WorkRequestData } from "workforce-core/model";
import { RestApi, RestApiInstanceOptions } from "./base/rest_api.js";

export class WorkRequestAPI extends RestApi<WorkRequestData, string> {
    static instance: WorkRequestAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): WorkRequestAPI {
        if (!WorkRequestAPI.instance || options.accessToken !== WorkRequestAPI.instance.accessToken) {
            WorkRequestAPI.instance = new WorkRequestAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "work-requests",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return WorkRequestAPI.instance;
    }
}