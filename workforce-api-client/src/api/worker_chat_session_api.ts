import { ChatSession } from "workforce-core/model";
import { RestApi, RestApiInstanceOptions } from "./base/rest_api.js";

export class WorkerChatSessionAPI extends RestApi<ChatSession, string> {
    static instance: WorkerChatSessionAPI | undefined;
    static getInstance(options?: RestApiInstanceOptions): WorkerChatSessionAPI {
        if (!WorkerChatSessionAPI.instance || options.accessToken !== WorkerChatSessionAPI.instance.accessToken) {
            WorkerChatSessionAPI.instance = new WorkerChatSessionAPI({
                basePath: options.basePath ?? "/workforce-api",
                resource: "worker-chat-sessions",
                baseUrl: options?.baseUrl,
                accessToken: options?.accessToken,
                unAuthorizedCallBack: options?.unAuthorizedCallBack,
                validate: () => []
            });
        }
        return WorkerChatSessionAPI.instance;
    }
}