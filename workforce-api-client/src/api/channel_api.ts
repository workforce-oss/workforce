import { ChannelConfig, VariableSchemaValidationError } from "workforce-core";
import { RestApi, RestApiInstanceOptions } from "./base/rest_api.js";

export class ChannelAPI extends RestApi<ChannelConfig, VariableSchemaValidationError> {
    static instance: ChannelAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): ChannelAPI {
        if (!ChannelAPI.instance || options.accessToken !== ChannelAPI.instance.accessToken) {
            ChannelAPI.instance = new ChannelAPI({
                basePath: options?.basePath ?? "/workforce-api",
                resource: "channels",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return ChannelAPI.instance;
    }
}