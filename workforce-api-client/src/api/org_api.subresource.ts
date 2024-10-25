import { SubResourceApi } from "./base/rest_api.subresource.js";

export interface OrgSubResourceCallOptions {
    orgId: string;
    queryParams?: Record<string, string>;
}

export class OrgSubResourceAPI<T, TValidationError> extends SubResourceApi<T, TValidationError, OrgSubResourceCallOptions> {
    rootResources(options: OrgSubResourceCallOptions): { name: string; id: string }[] {
        return [
            { name: "orgs", id: options.orgId }
        ];
    }
}