import { Subject, Subscription } from "rxjs";
import { ChatMessage, ToolResponse, WorkRequestData } from "workforce-core/model";
import { WebsocketAPI, WebsocketApiCreationArgs, WebsocketApiInstanceOptions } from "./base/websocket_api.js";

export class HumanWorkerSocketAPI extends WebsocketAPI {
	static instance: HumanWorkerSocketAPI | undefined;
	private eventSubject?: Subject<HumanWorkerInboundEvent>;
	private workRequestCallback?: (requests: WorkRequestData[]) => void;
	private toolResponseCallback?: (response?: ToolResponse) => void;
	private chatMessageCallback?: (message: ChatMessage) => void;


	static getInstance(options: WebsocketApiInstanceOptions): HumanWorkerSocketAPI {
		if (!HumanWorkerSocketAPI.instance || options.accessToken !== HumanWorkerSocketAPI.instance.currentAuthToken) {
			if (HumanWorkerSocketAPI.instance) {
				HumanWorkerSocketAPI.instance.close();
			}
			HumanWorkerSocketAPI.instance = new HumanWorkerSocketAPI({
				basePath: options.basePath ? `${options.basePath}/${options.path}` : `/workforce-api/${options.path}`, 
				baseUrl: options.baseUrl,
				unAuthorizedCallBack: options.unAuthorizedCallBack,
				accessToken: options.accessToken,
				anonymous: options.anonymous,
			});
		}
		return HumanWorkerSocketAPI.instance;
	}

	constructor(args: WebsocketApiCreationArgs) {
		super(args);
		this.eventSubject = new Subject<HumanWorkerInboundEvent>();
		this.subscribeToWorkRequests();
		this.subscribeToToolResponses();
		this.subscribeToChatMessages();
	}

	public setWorkRequestCallback(callback: (requests: WorkRequestData[]) => void): void {
		this.workRequestCallback = callback;
	}

	public setToolResponseCallback(callback: (response?: ToolResponse) => void): void {
		this.toolResponseCallback = callback;
	}

	public setChatMessageCallback(callback: (message: ChatMessage) => void): void {
		this.chatMessageCallback = callback;
	}

	private subscribeToWorkRequests(): Subscription {
		return this.eventSubject?.subscribe((event: HumanWorkerInboundEvent) => {
			if (event.type === "work-request-data-list") {
				if (this.workRequestCallback) {
					this.workRequestCallback(event.requests ?? []);
				}
			}
		});
	}

	public subscribeToToolResponses(): Subscription {
		return this.eventSubject?.subscribe((event: HumanWorkerInboundEvent) => {
			if (event.type === "tool-response") {
				if (this.toolResponseCallback) {
					this.toolResponseCallback(event.response);
				}
			}
		});
	}

	public subscribeToChatMessages(): Subscription {
		return this.eventSubject?.subscribe((event: HumanWorkerInboundEvent) => {
			console.log("HumanWorkerSocketAPI.subscribeToChatMessages() event=", event);
			if (event.type === "chat-message") {
				if (this.chatMessageCallback) {
					this.chatMessageCallback(event.message!);
				}
			}
		});
	}

	public async sendChatMessage(message: ChatMessage): Promise<void> {
		this.send({
			type: "chat-message",
			message: message,
		});
	}

	public async requestWorkRequestList(): Promise<void> {
		this.send({
			type: "list-work-requests",
		});
	}

	public async handleMessages(data: any): Promise<void> {
		console.log("HumanWorkerSocketAPI.handleMessages() data=", data);
		if (data.success) {
			console.log("Auth successful");
			return;
		} else if (data.success === false) {
			console.log("Auth failed");
			return;
		}
		super.handleMessages(data);
		console.log("HumanWorkerSocketAPI.handleMessages() writing to eventSubject");
		this.eventSubject?.next(data);
	}
}

export interface HumanWorkerOutboundEvent {
	type: "chat-message" | "list-work-requests";
	message?: ChatMessage;
}

export interface HumanWorkerInboundEvent {
	type: "work-request-data-list" | "tool-response" | "chat-message";
	message?: ChatMessage;
	requests?: WorkRequestData[];
	response?: ToolResponse;
}
