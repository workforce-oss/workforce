import { WebsocketAPI, WebsocketApiCreationArgs, WebsocketApiInstanceOptions } from "./base/websocket_api.js";
import { Subject, Subscription } from "rxjs";
import { NativeChannelMessage } from "workforce-core/model";

export class NativeChatSocketAPI extends WebsocketAPI {
    static instance: NativeChatSocketAPI | undefined;
    private eventSubject?: Subject<NativeChannelMessage>;
    private chatMessageCallback?: (message: NativeChannelMessage) => void;

    static getInstance(options: WebsocketApiInstanceOptions): NativeChatSocketAPI {
        if (!NativeChatSocketAPI.instance || options.accessToken !== NativeChatSocketAPI.instance.currentAuthToken) {
            if (NativeChatSocketAPI.instance) {
                NativeChatSocketAPI.instance.close();
            }
            NativeChatSocketAPI.instance = new NativeChatSocketAPI({
                basePath: options.basePath ? `${options.basePath}/${options.path}` : `/workforce-api/${options.path}`,
                baseUrl: options.baseUrl,
                accessToken: options.accessToken,
                anonymous: options.anonymous,
                unAuthorizedCallBack: options.unAuthorizedCallBack,
            });

        }
        return NativeChatSocketAPI.instance;
    }

    constructor(args: WebsocketApiCreationArgs) {
        super(args);
        this.eventSubject = new Subject<NativeChannelMessage>();
        this.subscribeToChatMessages();
    }

    public setChatMessageCallback(callback: (message: NativeChannelMessage) => void): void {
        this.chatMessageCallback = callback;
    }

    private subscribeToChatMessages(): void {
        this.eventSubject?.subscribe((event: NativeChannelMessage) => {
            this.chatMessageCallback?.(event);
        });
    }

    public subscribe(callback: (message: NativeChannelMessage) => void): Subscription {
        return this.eventSubject?.subscribe(callback);
    }

    public sendChatMessage(message: NativeChannelMessage, callback?: {messageType: string, callback: (data: any) => void}): void {
        this.send(message, callback);
    }

    public async handleMessages(data: any): Promise<void> {
        if (data.success) {
            console.log("Auth successful");
            return;
        } else if (data.success === false) {
            console.log("Auth failed");
            return;
        }
        super.handleMessages(data);
        this.eventSubject?.next(data);
    }
}