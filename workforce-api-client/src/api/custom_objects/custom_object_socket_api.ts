import { Subject } from "rxjs";
import { WebsocketApiCreationArgs, WebsocketAPI } from "../base/websocket_api.js";

export class CustomObjectAPI<T> extends WebsocketAPI {
    private eventSubject?: Subject<T>;
    private eventCallback?: (event: T) => void;

    constructor(args: WebsocketApiCreationArgs, eventCallBack: (event: T) => void) {
        super(args);
        this.eventSubject = new Subject<T>();
        this.eventCallback = eventCallBack;
        this.subscribeToEvents();
    }

    private subscribeToEvents(): void {
        this.eventSubject?.subscribe((event: T) => {
            this.eventCallback?.(event);
        });
    }

    public sendEvent(event: T): void {
        this.send(event);
    }

    public async handleMessages(data: any): Promise<void> {
        if (data.success) {
            console.log("Auth successful");
            return; 
        } else if (data.success === false) {
            console.log("Auth failed");
            this.unAuthorizedCallBack?.();
            return;
        }
        this.eventSubject?.next(data);
    }

}