import { ResourceWrite } from "workforce-core/model";
import { RestApi, RestApiInstanceOptions } from "./base/rest_api.js";

export class ResourceWriteAPI extends RestApi<ResourceWrite, string> {
    static instance: ResourceWriteAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): ResourceWriteAPI {
        if (!ResourceWriteAPI.instance || options.accessToken !== ResourceWriteAPI.instance.accessToken) {
            ResourceWriteAPI.instance = new ResourceWriteAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "resource-writes",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return ResourceWriteAPI.instance;
    }
}