import { WebsocketAPI, WebsocketApiCreationArgs, WebsocketApiInstanceOptions } from "./base/websocket_api.js";
import { Subject } from "rxjs";
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

    public sendChatMessage(message: NativeChannelMessage): void {
        this.send(message);
    }

    public async handleMessages(data: any): Promise<void> {
        if (data.success) {
            console.log("Auth successful");
            return;
        } else if (data.success === false) {
            console.log("Auth failed");
            return;
        }
        this.eventSubject?.next(data);
    }
}