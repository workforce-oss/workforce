import { VariableSchemaValidationError, WorkforceOrg } from "workforce-core/model";
import { RestApi, RestApiInstanceOptions } from "./base/rest_api.js";

export class OrgAPI extends RestApi<WorkforceOrg, VariableSchemaValidationError> {
    static instance: OrgAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): OrgAPI {
        if (!OrgAPI.instance || options.accessToken !== OrgAPI.instance.accessToken) {
            OrgAPI.instance = new OrgAPI({
                basePath: options?.basePath ?? "/workforce-api",
                resource: "orgs",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                validate: () => []
            });
        }
        return OrgAPI.instance;
    }
}