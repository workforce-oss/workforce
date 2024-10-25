import { ChannelConfig, VariableSchemaValidationError } from "workforce-core";
import { RestApiInstanceOptions } from "./base/rest_api.js";
import { FlowSubResourceApi } from "./flow_api.subresource.js";
import { SubResourceApi } from "./base/rest_api.subresource.js";
import { ChannelMessage, ChannelSession } from "workforce-core/model";

export class ChannelAPI extends FlowSubResourceApi<ChannelConfig, VariableSchemaValidationError> {
    static instance: ChannelAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): ChannelAPI {
        if (!ChannelAPI.instance || options.accessToken !== ChannelAPI.instance.accessToken) {
            ChannelAPI.instance = new ChannelAPI({
                basePath: options?.basePath ?? "/workforce-api",
                resource: "channels",
                objectType: "channel",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
            ChannelAPI.instance.ChannelMessages = ChannelMessageAPI.getInstance(options);
            ChannelAPI.instance.ChannelSessions = ChannelSessionAPI.getInstance(options);
        }
        return ChannelAPI.instance;
    }

    ChannelMessages: ChannelMessageAPI;
    ChannelSessions: ChannelSessionAPI;
}

export interface ChannelSubResourceCallOptions {
    orgId: string;
    flowId: string;
    channelId: string;
    queryParams?: Record<string, string>;
}

class ChannelSubResourceApi<T, TValidationError> extends SubResourceApi<T, TValidationError, ChannelSubResourceCallOptions> {
    rootResources(options: ChannelSubResourceCallOptions): { name: string; id: string }[] {
        return [
            { name: "orgs", id: options.orgId },
            { name: "flows", id: options.flowId },
            { name: "channels", id: options.channelId }
        ];
    }
}

export class ChannelMessageAPI extends ChannelSubResourceApi<ChannelMessage, string> {
    static instance: ChannelMessageAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): ChannelMessageAPI {
        if (!ChannelMessageAPI.instance || options.accessToken !== ChannelMessageAPI.instance.accessToken) {
            ChannelMessageAPI.instance = new ChannelMessageAPI({
                basePath: options?.basePath ?? "/workforce-api",
                resource: "channel-messages",
                objectType: "channel-message",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return ChannelMessageAPI.instance;
    }
}

export class ChannelSessionAPI extends ChannelSubResourceApi<ChannelSession, string> {
    static instance: ChannelSessionAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): ChannelSessionAPI {
        if (!ChannelSessionAPI.instance || options.accessToken !== ChannelSessionAPI.instance.accessToken) {
            ChannelSessionAPI.instance = new ChannelSessionAPI(
                {
                    basePath: options.basePath ?? "/workforce-api",
                    resource: "channel-sessions",
                    objectType: "channel-session",
                    baseUrl: options.baseUrl,
                    accessToken: options.accessToken,
                    unAuthorizedCallBack: options.unAuthorizedCallBack,
                    validate: () => []
                });
        }
        return ChannelSessionAPI.instance;
    }

}