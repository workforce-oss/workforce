import { ResourceVersion } from "workforce-core/model";
import { RestApi, RestApiInstanceOptions } from "./base/rest_api.js";

export class ResourceVersionAPI extends RestApi<ResourceVersion, string> {
    static instance: ResourceVersionAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): ResourceVersionAPI {
        if (!ResourceVersionAPI.instance || options.accessToken !== ResourceVersionAPI.instance.accessToken) {
            ResourceVersionAPI.instance = new ResourceVersionAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "resource-versions",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return ResourceVersionAPI.instance;
    }
}