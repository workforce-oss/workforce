
import { ChannelSession } from "workforce-core/model";
import { RestApi, RestApiInstanceOptions } from "./base/rest_api.js";


export class ChannelSessionAPI extends RestApi<ChannelSession, string> {
    static instance: ChannelSessionAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): ChannelSessionAPI {
        if (!ChannelSessionAPI.instance || options.accessToken !== ChannelSessionAPI.instance.accessToken) {
            ChannelSessionAPI.instance = new ChannelSessionAPI(
                {
                    basePath: options.basePath ?? "/workforce-api",
                    resource: "channel-sessions",
                    baseUrl: options.baseUrl,
                    accessToken: options.accessToken,
                    unAuthorizedCallBack: options.unAuthorizedCallBack,
                    validate: () => []
                });
        }
        return ChannelSessionAPI.instance;
    }

}