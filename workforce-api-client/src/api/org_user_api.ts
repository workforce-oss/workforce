import { VariableSchemaValidationError } from "workforce-core";
import { RestApiInstanceOptions } from "./base/rest_api.js";
import { OrgSubResourceAPI } from "./org_api.subresource.js";
import { WorkforceOrgUserRelation } from "workforce-core/model";

export class OrgUserAPI extends OrgSubResourceAPI<WorkforceOrgUserRelation, VariableSchemaValidationError> {
    static instance: OrgUserAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): OrgUserAPI {
        if (!OrgUserAPI.instance || options.accessToken !== OrgUserAPI.instance.accessToken) {
            OrgUserAPI.instance = new OrgUserAPI({
                basePath: options?.basePath ?? "/workforce-api",
                resource: "org-users",
                objectType: "org-user",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return OrgUserAPI.instance;
    }
}