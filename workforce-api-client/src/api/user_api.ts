import { VariableSchemaValidationError, WorkforceUser } from "workforce-core/model";
import { RestApi, RestApiInstanceOptions } from "./base/rest_api.js";

export class UserAPI extends RestApi<WorkforceUser, VariableSchemaValidationError> {
    static instance: UserAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): UserAPI {
        if (!UserAPI.instance || options.accessToken !== UserAPI.instance.accessToken) {
            UserAPI.instance = new UserAPI({
                basePath: options?.basePath ?? "/workforce-api",
                resource: "users",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return UserAPI.instance;
    }
}
    