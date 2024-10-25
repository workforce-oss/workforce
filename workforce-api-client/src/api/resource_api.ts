import { ResourceConfig, ResourceVersion, VariableSchemaValidationError } from "workforce-core";
import { RestApiInstanceOptions } from "./base/rest_api.js";
import { FlowSubResourceApi } from "./flow_api.subresource.js";
import { SubResourceApi } from "./base/rest_api.subresource.js";
import { ResourceWrite } from "workforce-core/model";

export class ResourceAPI extends FlowSubResourceApi<ResourceConfig, VariableSchemaValidationError> {
    static instance: ResourceAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): ResourceAPI {
        if (!ResourceAPI.instance || options.accessToken !== ResourceAPI.instance.accessToken) {
            ResourceAPI.instance = new ResourceAPI({
                basePath: options?.basePath ?? "/workforce-api",
                resource: "resources",
                objectType: "resource",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
            ResourceAPI.instance.ResourceVersions = ResourceVersionAPI.getInstance(options);
            ResourceAPI.instance.ResourceWrites = ResourceWriteAPI.getInstance(options);
        }
        return ResourceAPI.instance;
    }

    ResourceVersions: ResourceVersionAPI;
    ResourceWrites: ResourceWriteAPI;
}

export interface ResourceSubResourceCallOptions {
    orgId: string;
    flowId: string;
    resourceId: string;
    queryParams?: Record<string, string>;
}

class ResourceSubResourceApi<T, TValidationError> extends SubResourceApi<T, TValidationError, ResourceSubResourceCallOptions> {
    rootResources(options: ResourceSubResourceCallOptions): { name: string; id: string }[] {
        return [
            { name: "orgs", id: options.orgId },
            { name: "flows", id: options.flowId },
            { name: "resources", id: options.resourceId }
        ];
    }
}

export class ResourceVersionAPI extends ResourceSubResourceApi<ResourceVersion, string> {
    static instance: ResourceVersionAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): ResourceVersionAPI {
        if (!ResourceVersionAPI.instance || options.accessToken !== ResourceVersionAPI.instance.accessToken) {
            ResourceVersionAPI.instance = new ResourceVersionAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "resource-versions",
                objectType: "resource-version",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return ResourceVersionAPI.instance;
    }
}

export class ResourceWriteAPI extends ResourceSubResourceApi<ResourceWrite, string> {
    static instance: ResourceWriteAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): ResourceWriteAPI {
        if (!ResourceWriteAPI.instance || options.accessToken !== ResourceWriteAPI.instance.accessToken) {
            ResourceWriteAPI.instance = new ResourceWriteAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "resource-writes",
                objectType: "resource-write",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return ResourceWriteAPI.instance;
    }
}