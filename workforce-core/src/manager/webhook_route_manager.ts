import { RequestHandler, Request, Response, Application } from "express";
import expressWs, { WebsocketRequestHandler } from "express-ws";
import { Subject, Subscription } from "rxjs";
import { BrokerMode, SubjectFactory } from "./impl/subject_factory.js";
import { IncomingHttpHeaders } from "http";
import bodyParser from "body-parser";
import { Logger } from "../logging/logger.js";
import { WebhookRouteDb } from "./webhook_route_db.js";
import { WebSocket } from "ws";
import { AuthOptions, auth } from "express-oauth2-jwt-bearer";
import { Configuration } from "../config/configuration.js";
import { jsonParse } from "../util/json.js";
import { Op } from "sequelize";

export class WebhookRouteManager {
	private static _instance: WebhookRouteManager;
	private app?: expressWs.WithWebsocketMethod & Application;
	private routeSubject?: Subject<WebhookRouteEvent>;
	private webhookEventSubject?: Subject<WebhookEvent>;
	private outboundSubject?: Subject<OutboundWebhookSocketEvent>;
	private websockets = new Map<string, WebhookSocketClient[]>();
	private logger: Logger;
	private authOptions?: AuthOptions;
	private httpHandlers = new Map<string, RequestHandler>();
	private wsHandlers = new Map<string, WebsocketRequestHandler>();

	private constructor(authOptions?: AuthOptions) {
		this.authOptions = authOptions;
		this.logger = Logger.getInstance("WebhookRouteManager");
	}

	public addRoute(route: WebhookRoute): void {
		this.routeSubject?.next({
			type: "add",
			route: route,
		});
	}

	public removeRoute(route: WebhookRoute): void {
		this.routeSubject?.next({
			type: "remove",
			route: route,
		});
	}

	public removeRoutesByObjectId(orgId: string, objectId: string): void {
		WebhookRouteDb.findAll({
			where: {
				orgId: orgId,
				objectId: objectId,
			},
		}).then((routes) => {
			this.logger.debug(`Removing webhook routes for orgId=${orgId} objectId=${objectId}`);
			routes.forEach((route) => {
				this.routeSubject?.next({
					type: "remove",
					route: {
						objectId: route.objectId,
						orgId: route.orgId,
						path: route.path,
					}
				});
			});
		}).catch((err: Error) => {
			this.logger.error(`Error removing webhook routes for orgId=${orgId} objectId=${objectId}: ${err}`);
		});
	}

	public removeRoutesByTaskExecutionId(orgId: string, taskExecutionId: string): void {
		WebhookRouteDb.findAll({
			where: {
				orgId: orgId,
				taskExecutionId: taskExecutionId,
			},
		}).then((routes) => {
			this.logger.debug(`Removing webhook routes for orgId=${orgId} taskExecutionId=${taskExecutionId}`);
			routes.forEach((route) => {
				this.routeSubject?.next({
					type: "remove",
					route: {
						objectId: route.objectId,
						orgId: route.orgId,
						path: route.path,
					}
				});
			});
		}).catch((err: Error) => {
			this.logger.error(`Error removing webhook routes for orgId=${orgId} taskExecutionId=${taskExecutionId}: ${err}`);
		});
	}

	public removeRoutesByPathPart(orgId: string, part: string): void {
		WebhookRouteDb.findAll({
			where: {
				orgId: orgId,
				path: {
					[Op.like]: `%${part}%`,
				}
			},
		}).then((routes) => {
			this.logger.debug(`Removing webhook routes for path partial=${part}`);
			routes.forEach((route) => {
				this.routeSubject?.next({
					type: "remove",
					route: {
						objectId: route.objectId,
						orgId: route.orgId,
						path: route.path,
					}
				});
			});
		}).catch((err: Error) => {
			this.logger.error(`Error removing webhook routes for path partial=${part}: ${err}`);
		});
	}

	public updateRoute(route: WebhookRoute): void {
		this.routeSubject?.next({
			type: "update",
			route: route,
		});
	}

	public sendWebhookEvent(event: OutboundWebhookSocketEvent): void {
		this.outboundSubject?.next(event);
	}

	public broadcastWebhookEvents(): void {
		this.outboundSubject?.subscribe((event: OutboundWebhookSocketEvent) => {
			this.logger.debug(`broadcastWebhookEvents() recieved event for path=${event.path}`);
			try {
				const clients = this.websockets.get(event.path);
				if (!clients) {
					this.logger.debug(`broadcastWebhookEvents() no clients for path=${event.path}`);
					return;
				}
				if (event.clientId) {
					this.logger.debug(`broadcastWebhookEvents() sending event to client=${event.clientId}`);
					const client = clients.find((client) => {
						return client.clientId === event.clientId;
					});
					if (!client) {
						this.logger.debug(`broadcastWebhookEvents() no client found for client=${event.clientId}`);
						return;
					}
					if (client.ws.readyState !== WebSocket.OPEN) {
						this.logger.debug(`broadcastWebhookEvents() client websocket state not open`);
						this.logger.debug(`broadcastWebhookEvents() client state=${client.ws.readyState}`);
						return
					}
					client.ws.send(JSON.stringify(event.body));
					return;
				} else {
					for (const client of clients) {
						this.logger.debug(`broadcastWebhookEvents() client=${JSON.stringify(client)}`);
						if (client && client.ws.readyState === WebSocket.OPEN && client.authed) {
							this.logger.debug(`broadcastWebhookEvents() sending event to client`);
							client.ws.send(JSON.stringify(event.body));
						}
					}
				}
			} catch (err) {
				this.logger.error(`broadcastWebhookEvents() error=`, err);
			}
		});
	}

	public subscribeToWebhookEvents(
		orgId: string,
		objectId: string,
		path: string,
		callback: (event: WebhookEvent) => void
	): Subscription | undefined {
		return this.webhookEventSubject?.subscribe({
			next: (event: WebhookEvent) => {
				if (event.orgId === orgId && event.objectId === objectId && event.path === path) {
					try {
						callback(event);
					} catch (err) {
						this.logger.error(`subscribeToWebhookEvents() error=`, err);
					}
				}
			},
			error: (error) => {
				this.logger.error(`subscribeToWebhookEvents() error=${error}`);
			}
		});
	}

	public static async routeExists(path: string): Promise<boolean> {
		const route = await WebhookRouteDb.findOne({
			where: {
				path
			}
		}).catch((err: Error) => {
			Logger.getInstance("WebhookRouteManager").error(`Error checking route exists for path=${path}: ${err}`);
			return null;
		});
		if (route) {
			return true;
		}
		return false;
	}



	public static async getInstance(authOptions?: AuthOptions): Promise<WebhookRouteManager> {
		if (!WebhookRouteManager._instance) {
			const manager = new WebhookRouteManager(authOptions);
			manager.routeSubject = await SubjectFactory.createSubject<WebhookRouteEvent>({
				mode: (Configuration.BrokerMode as BrokerMode) || "in-memory",
				channel: "webhook.route.event",
			});
			manager.webhookEventSubject = await SubjectFactory.createSubject<WebhookEvent>({
				mode: (Configuration.BrokerMode as BrokerMode) || "in-memory",
				channel: "webhook.event",
			});
			manager.outboundSubject = await SubjectFactory.createSubject<OutboundWebhookSocketEvent>({
				mode: (Configuration.BrokerMode as BrokerMode) || "in-memory",
				channel: "webhook.socket.outbound",
			});
			WebhookRouteManager._instance = manager;
		}
		return WebhookRouteManager._instance;
	}

	public manage(app: expressWs.WithWebsocketMethod & Application, additionalWsRoutes?: Record<string, WebsocketRequestHandler>): void {
		if (this.app && this.app === app) {
			this.logger.error("WebhookRouteManager.manage() can only be called once");
			return;
		}
		this.app = app;
		app.ws("/*", this.mainSocketHandler(additionalWsRoutes));
		app.use("/*", this.mainHandler());
		WebhookRouteDb.findAll().then((routes: WebhookRouteDb[]) => {
			routes.forEach((route: WebhookRouteDb) => {
				this.addRouteHandler({
					path: route.path,
					orgId: route.orgId,
					objectId: route.objectId,
					webSocket: route.webSocket,
					authOptions: jsonParse(route.authOptions),
					client_identifier: route.client_identifier,
					response: route.response,
				});
			});
		}).catch((err: Error) => {
			this.logger.error(`Error reading webhook routes from db: ${err}`);
		});
		this.routeSubject!.subscribe((event: WebhookRouteEvent) => {
			try {
				switch (event.type) {
					case "add":
						WebhookRouteDb.findOne({
							where: {
								path: event.route.path,
							},
						})
							.then((route: WebhookRouteDb | null) => {
								if (!route) {
									this.logger.debug(`Adding webhook route ${event.route.path}`);
									WebhookRouteDb.create({
										path: event.route.path,
										orgId: event.route.orgId,
										objectId: event.route.objectId,
										taskExecutionId: event.route.taskExecutionId,
										webSocket: event.route.webSocket,
										authOptions: event.route.authOptions ? JSON.stringify(event.route.authOptions) : null,
										client_identifier: event.route.client_identifier,
										response: event.route.response,
									}).catch((err: Error) => {
										if (err.name === "SequelizeUniqueConstraintError") {
											this.logger.warn(`Webhook route ${event.route.path} already exists`);
											return;
										}
										this.logger.error(`Error adding webhook route ${event.route.path}: ${err}`);
									});
									this.addRouteHandler(event.route);

								} else {
									this.logger.debug(`Webhook route ${event.route.path} already exists`);
									//update the route
									route.orgId = event.route.orgId;
									route.objectId = event.route.objectId;
									route.taskExecutionId = event.route.taskExecutionId;
									route.webSocket = event.route.webSocket;
									if (event.route.authOptions) {
										route.authOptions = JSON.stringify(event.route.authOptions);
									}
									route.client_identifier = event.route.client_identifier;
									route.response = event.route.response;
									route.save().catch((err: Error) => {
										this.logger.error(`Error updating webhook route ${event.route.path}: ${err}`);
									});
									this.addRouteHandler(event.route);

								}
							})
							.catch((err: Error) => {
								this.logger.error(`Error adding webhook route ${event.route.path}: ${err}`);
								this.addRouteHandler(event.route);
							});
						break;
					case "remove":
						WebhookRouteDb.destroy({
							where: {
								path: event.route.path,
							},
						}).then(() => {
							this.logger.debug(`Removing webhook route ${event.route.path}`);
						})
							.catch((err: Error) => {
								this.logger.error(`Error removing webhook route ${event.route.path}: ${err}`);
							})
							.finally(() => {
								this.httpHandlers.delete(event.route.path);
								if (this.websockets.has(event.route.path)) {
									const sockets = this.websockets.get(event.route.path);
									for (const socket of sockets ?? []) {
										socket.ws.close();
									}
								}
								this.wsHandlers.delete(event.route.path);


							});
						break;
					case "update":
						WebhookRouteDb.findOne({
							where: {
								path: event.route.path,
							},
						})
							.then((route: WebhookRouteDb | null) => {
								if (route) {
									this.logger.debug(`Updating webhook route ${event.route.path}`);
									route.orgId = event.route.orgId;
									route.objectId = event.route.objectId;
									route.webSocket = event.route.webSocket;
									route.taskExecutionId = event.route.taskExecutionId;
									if (event.route.authOptions) {
										route.authOptions = JSON.stringify(event.route.authOptions);
									}
									route.client_identifier = event.route.client_identifier;
									route.response = event.route.response;
									route.save().catch((err: Error) => {
										this.logger.error(`Error updating webhook route ${event.route.path}: ${err}`);
									});
								}
							})
							.catch((err: Error) => {
								if (err.name === "SequelizeUniqueConstraintError") {
									this.logger.warn(`Webhook route ${event.route.path} already exists`);
									return;
								}
								this.logger.error(`Error updating webhook route ${event.route.path}: ${err}`);
							})
							.finally(() => {
								if (event.route.webSocket) {
									this.logger.debug(`Updating websocket handler for ${event.route.path}`);
									this.addRouteHandler(event.route);
								} else {
									this.logger.debug(`Updating http handler for ${event.route.path}`);
									this.addRouteHandler(event.route);
								}
							});
						break;
				}
			} catch (err) {
				this.logger.error(`WebhookRouteManager.manage() error handling event error=`, err);
			}
		});
		this.broadcastWebhookEvents();
	}

	private addRouteHandler(route: WebhookRoute): void {
		if (!route.path.startsWith("/")) {
			this.logger.error(`Invalid route path ${route.path}`);
			return;
		}
		if (route.webSocket) {
			this.logger.debug(`Adding websocket handler for ${route.path}`);
			if (this.websockets.has(route.path)) {
				const sockets = this.websockets.get(route.path);
				for (const socket of sockets ?? []) {
					socket.ws.close();
				}
				this.websockets.delete(route.path)
			}
			const handler = this.getWebhookSocketHandler(route);
			this.wsHandlers.set(route.path, handler);
		} else {
			this.logger.debug(`Adding http handler for ${route.path}`);
			const handler = this.getRouteHandler(route);
			this.httpHandlers.set(route.path, handler);
		}
	}

	public mainSocketHandler(additionalWsRoutes?: Record<string, WebsocketRequestHandler>): WebsocketRequestHandler {
		const handler: WebsocketRequestHandler = (ws, req, next) => {
			this.logger.debug(`mainSocketHandler() Received websocket event`);
			const path = req.path;
			this.logger.debug(`mainSocketHandler() Received websocket event for ${path}`);
			const pathWithoutWebsocket = path.replace("/.websocket", "");
			const wsHandler = this.wsHandlers.get(pathWithoutWebsocket);
			if (wsHandler) {
				wsHandler(ws, req, next);
			} else if (additionalWsRoutes?.[pathWithoutWebsocket]) {
				const additionalWsHandler = additionalWsRoutes[pathWithoutWebsocket];
				additionalWsHandler(ws, req, next);
			} else {
				this.logger.error(`mainSocketHandler() No handler for path=${path}`);
				next();
			}
		};
		return handler;
	}

	public mainHandler(): RequestHandler[] {
		const handler: RequestHandler = (req, res, next) => {
			this.logger.debug(`mainHandler() Received http event`);
			const path = req.originalUrl;
			this.logger.debug(`mainHandler() Received http event for ${path}`);
			const httpHandler = this.httpHandlers.get(path);
			if (httpHandler) {
				httpHandler(req, res, next);
			} else {
				this.logger.error(`mainHandler() No handler for path=${path}`);
				next();
			}
		};
		return [bodyParser.json(), handler];
	}

	public getWebhookSocketHandler(route: WebhookRoute): WebsocketRequestHandler {
		const handler: WebsocketRequestHandler = (ws, req) => {
			this.logger.debug(
				`getWebhookSocketHandler() Received websocket event for ${route.path}\n${JSON.stringify(route.authOptions, null, 2)}`
			);
			// ws.setMaxListeners(2);
			const client = {
				authed: route.authOptions?.authRequired ? false : true,
				ws: ws
			};
			if (!this.websockets.has(route.path)) {
				this.websockets.set(route.path, []);
			}
			this.websockets.get(route.path)?.push(client);

			const pingInterval = setInterval(() => {
				this.logger.debug(`getWebhookSocketHandler() sending ping for ${route.path}`);
				ws.ping();
			}, 10000);

			ws.onopen = () => {
				this.logger.debug(`getWebhookSocketHandler() websocket open for ${route.path}`);
			}

			ws.on("message", (msg: string) => {
				if (!client.authed && route.authOptions?.authRequired) {
					this.logger.debug(`getWebhookSocketHandler() Auth required for ${route.path}`);
					const authMessage = jsonParse<WebhookSocketAuthMessage>(msg);
					if (!authMessage?.token) {
						this.logger.debug(`getWebhookSocketHandler() No auth token for ${route.path}`);
						ws.send(
							JSON.stringify({
								success: false,
								message: "No auth token",
							})
						);
						ws.close();
						return;
					}

					this.validateAuth(authMessage?.token, route.authOptions, route.authOptions?.claims).then((authed: boolean) => {
						if (authed) {
							this.logger.debug(`getWebhookSocketHandler() Auth successful for ${route.path}`);
							client.authed = true;
							ws.send(
								JSON.stringify({
									success: true,
									message: "Auth successful",
								})
							);
						} else {
							this.logger.debug(`getWebhookSocketHandler() Auth failed for ${route.path}`);
							ws.send(
								JSON.stringify({
									success: false,
									message: "Invalid auth token",
								})
							);
							ws.close();
						}
						return;
					}).catch((err) => {
						this.logger.error(`getWebhookSocketHandler() Auth error for ${route.path} error=${err}`);
						ws.send(
							JSON.stringify({
								success: false,
								message: "Auth error",
							})
						);
						ws.close();
					});
				} else {
					if (route.client_identifier) {
						const client = this.websockets.get(route.path)?.find((client) => {
							return client.ws === ws;
						});
						if (client) {
							client.clientId = jsonParse<Record<string, string>>(msg)?.[route.client_identifier]
						}
					}
					this.webhookEventSubject?.next({
						orgId: route.orgId,
						objectId: route.objectId,
						path: route.path,
						body: msg,
						headers: req.headers,
					});
				}
			});
			ws.on("error", (err) => {
				this.logger.error(`getWebhookSocketHandler() for ${route.path} error=${err}`);
			});
			ws.on("close", () => {
				clearInterval(pingInterval);
				this.logger.debug(`getWebhookSocketHandler() websocket close for ${route.path}`);
				this.websockets.delete(route.path);
			});
		};
		return handler;
	}

	private validateClaims(claims: Record<string, WebhookAuthClaimsValidation>, bearerTokenB64: string): boolean {
		const middleToken = bearerTokenB64.split(".")[1];
		const decodedToken = jsonParse<Record<string, string>>(Buffer.from(middleToken, "base64").toString());
		if (!decodedToken) {
			this.logger.debug(`validateClaims() decodedToken=${decodedToken}`);
			return false;
		}

		this.logger.debug(`validateClaims() decodedToken=${JSON.stringify(decodedToken)}`);

		for (const key in claims) {
			if (claims[key].exact) {
				if (!decodedToken[key] || decodedToken[key] !== claims[key].exact) {
					this.logger.debug(`validateClaims() key=${key} exact=${claims[key].exact} decodedToken=${decodedToken[key]}`);
					return false;
				}
			}
			if (claims[key].contains) {
				if (!decodedToken[key]?.includes(claims[key].contains)) {
					this.logger.debug(`validateClaims() key=${key} contains=${claims[key].contains} decodedToken=${decodedToken[key]}`);
					return false;
				}
			}
			if (claims[key].notContains) {
				if (decodedToken[key]?.includes(claims[key].notContains)) {
					this.logger.debug(`validateClaims() key=${key} notContains=${claims[key].notContains} decodedToken=${decodedToken[key]}`);
					return false;
				}
			}
		}
		return true;

	}

	private async validateAuth(token: string, authOptions?: AuthOptions, claims?: Record<string, WebhookAuthClaimsValidation>): Promise<boolean> {
		if (!authOptions) {
			return true;
		}
		const authPromise = new Promise<boolean>((resolve, reject) => {
			try {
				auth(authOptions)(
					{
						headers: {
							authorization: `Bearer ${token}`,
						},
						is: (type: string | string[]): string | boolean => {
							if (type === "urlencoded") {
								return true;
							}
							return false;
						}
					} as Request,
					{} as Response<unknown>,
					(err) => {
						if (err) {
							this.logger.error(`validateAuth() inside error=`, err);
							reject(err as Error);
							return;
						}
						this.logger.debug(`validateAuth() token authenticated`);
						if (claims) {
							resolve(this.validateClaims(claims, token));
						} else {
							resolve(true);
						}
					}
				);
			} catch (err) {
				this.logger.error(`validateAuth() error=`, err);
				reject(err as Error);
			}
		});

		return authPromise;
	}

	public getRouteHandler(route: WebhookRoute): RequestHandler {
		return (req, res) => {
			this.logger.debug(`getRouteHandler() Received webhook event for ${route.orgId}/${route.objectId}`);
			//json parse the body
			this.webhookEventSubject?.next({
				orgId: route.orgId,
				objectId: route.objectId,
				path: route.path,
				body: req.body as unknown,
				headers: req.headers,
			});
			res.status(200).send(route.response ?? "OK");
		};
	}
}

export interface WebhookRouteEvent {
	type: "add" | "remove" | "update";
	route: WebhookRoute;
}


export interface WebhookRoute {
	path: string;
	orgId: string;
	objectId: string;
	taskExecutionId?: string;
	response?: string;
	webSocket?: boolean;
	authOptions?: AuthOptions & { claims?: Record<string, WebhookAuthClaimsValidation> };
	client_identifier?: string;
}

export interface WebhookAuthClaimsValidation {
	exact?: string
	contains?: string
	notContains?: string
}

export interface WebhookSocketClient {
	authed: boolean;
	clientId?: string;
	ws: WebSocket;
}

export interface OutboundWebhookSocketEvent {
	path: string;
	orgId: string;
	objectId: string;
	body: unknown;
	clientId?: string;
}

export interface WebhookSocketAuthMessage {
	token: string;
}

export interface WebhookEvent {
	orgId: string;
	objectId: string;
	path: string;
	body: unknown;
	headers: IncomingHttpHeaders;
}
