
export interface WebsocketApiCreationArgs {
	basePath: string;
	anonymous?: boolean;
	baseUrl?: string;
	accessToken?: string;
	unAuthorizedCallBack?: () => void;
}

export interface WebsocketApiInstanceOptions {
	path: string;
	basePath?: string;
	baseUrl?: string;
	accessToken?: string;
	anonymous?: boolean;
	unAuthorizedCallBack?: () => void;
}

export abstract class WebsocketAPI {
	private baseUrl?: string;
	private basePath: string;
	private socket: WebSocket | undefined;
	private authed: boolean = false;
	private preauthQueue: any[] = [];
	protected currentAuthToken?: string;
	private unAuthorizedCallBack?: () => void;


	constructor(args: WebsocketApiCreationArgs) {
		const { basePath, anonymous, baseUrl, accessToken } = args;
		this.basePath = basePath;
		this.baseUrl = baseUrl;
		this.currentAuthToken = accessToken;
		this.unAuthorizedCallBack = args.unAuthorizedCallBack;
		this.connect(anonymous)
			.then(() => {
				console.log(basePath, "connected");
			})
			.catch((e) => {
				console.error(basePath, e);
			});
	}

	private async connect(anonymous?: boolean): Promise<void> {
		if (this.socket) {
			return;
		}

		var connect = async () => {
			if (anonymous) {
				this.authed = true;
				console.log("Anonymous connection");
			}
			let basePath = this.basePath;
			if (basePath.startsWith("/")) {
				basePath = basePath.slice(1);
			}
			console.log(basePath, this.baseUrl);
			const url = new URL(`${basePath}`, this.baseUrl ?? `wss://${window.location.host}`);
			this.socket = new WebSocket(url);
			this.socket.onopen = () => {
				console.log("WebSocket connected");
				if (this.currentAuthToken) {
					console.log("Sending auth token");
					// wait 5 seconds before sending the auth token
					setTimeout(() => {
						this.socket?.send(JSON.stringify({ token: this.currentAuthToken }));
					}, 1000 * 5);
					setTimeout(() => {
						if (this.socket && !this.authed) {
							this.socket.close();
						}
					}, 1000 * 10);
				} else {
					console.log(this.basePath, "No auth token");
				}
			};
			this.socket.onmessage = (event) => {
				console.log(basePath, event.data);
				if (!anonymous && !this.authed) {
					const data = JSON.parse(event.data) as AuthResponse;
					if (data.success) {
						this.authed = true;
						this.preauthQueue.forEach((preAuthMessage) => {
							this.send(preAuthMessage).catch((e) => {
								console.error(basePath, e);
							});
						});
						this.preauthQueue = [];
					} else {
						console.error(basePath, data.message);
					}
				}
				this.handleMessages(JSON.parse(event.data)).catch((e) => {
					console.error(basePath, e);
				});
			};
			this.socket.onclose = (event) => {
				console.log(basePath, "WebSocket disconnected", event);
				setTimeout(connect, 1000 * 5);
			};
			this.socket.onerror = (event) => {
				console.log(basePath, event);
			};
		};
		connect();
	}

	public close(): void {
		this.socket?.close();
	}

	public abstract handleMessages(data: any): Promise<void>;

	public async send(data: any): Promise<void> {
		while (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		if (!this.socket) {
			throw new Error("Socket not connected");
		}
		if (!this.authed) {
			this.preauthQueue.push(data);
			return;
		}
		this.socket.send(JSON.stringify(data));
	}
}

interface AuthMessage {
	token: string;
}

interface AuthResponse {
	success: boolean;
	message: string;
}
