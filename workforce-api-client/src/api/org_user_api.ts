import { VariableSchemaValidationError } from "workforce-core";
import { RestApi, RestApiInstanceOptions } from "./base/rest_api.js";
import { WorkforceOrgUserRelation } from "../../../workforce-core/dist/identity/model.js";

export class OrgUserAPI extends RestApi<WorkforceOrgUserRelation, VariableSchemaValidationError> {
    static instance: OrgUserAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): OrgUserAPI {
        if (!OrgUserAPI.instance || options.accessToken !== OrgUserAPI.instance.accessToken) {
            OrgUserAPI.instance = new OrgUserAPI({
                basePath: options?.basePath ?? "/workforce-api",
                resource: "org-users",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return OrgUserAPI.instance;
    }
}