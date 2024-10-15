import { ToolRequestData } from "workforce-core/model";
import { RestApi, RestApiInstanceOptions } from "./base/rest_api.js";

export class ToolRequestAPI extends RestApi<ToolRequestData, string> {
    static instance: ToolRequestAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): ToolRequestAPI {
        if (!ToolRequestAPI.instance || options.accessToken !== ToolRequestAPI.instance.accessToken) {
            ToolRequestAPI.instance = new ToolRequestAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "tool-requests",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
               
        return ToolRequestAPI.instance;
    }
}