import { ChannelMessage } from "workforce-core/model";
import { RestApi, RestApiInstanceOptions } from "./base/rest_api.js";

export class ChannelMessageAPI extends RestApi<ChannelMessage, string> {
    static instance: ChannelMessageAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): ChannelMessageAPI {
        if (!ChannelMessageAPI.instance || options.accessToken !== ChannelMessageAPI.instance.accessToken) {
            ChannelMessageAPI.instance = new ChannelMessageAPI({
                basePath: options?.basePath ?? "/workforce-api",
                resource: "channel-messages",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return ChannelMessageAPI.instance;
    }
}