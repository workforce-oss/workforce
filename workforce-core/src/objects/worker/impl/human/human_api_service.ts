import { randomUUID } from "crypto";
import { Subject, Subscription } from "rxjs";
import { Configuration } from "../../../../config/configuration.js";
import { Logger } from "../../../../logging/logger.js";
import {
	OutboundWebhookSocketEvent,
	WebhookRoute,
	WebhookRouteManager,
} from "../../../../manager/webhook_route_manager.js";
import { jsonParse, jsonStringify } from "../../../../util/json.js";
import { ToolResponse } from "../../../tool/model.js";
import { WorkerDb } from "../../db.js";
import { WorkRequestDb } from "../../db.work_request.js";
import { ChatMessage, ChatSession, WorkRequest, WorkerConfig } from "../../model.js";
import { FunctionDocument } from "../../../../util/openapi.js";

export class HumanAPIServer {
	private config: WorkerConfig;
	private messages = new Subject<ChatMessage>();
	private logger = Logger.getInstance("HumanAPIServer");
	private sessionSubscriptions = new Map<string, Subscription>();

	constructor(config: WorkerConfig) {
		this.config = config;
		this.logger.info(`Creating HumanWorker with config: ${JSON.stringify(config)}`);
		if (!this.config.variables?.user_id) {
			throw new Error("Missing user_id in WorkerConfig");
		}
		WebhookRouteManager.getInstance().then((manager) => {
			const route: WebhookRoute = {
				path: `/${this.config.orgId}/${this.config.variables!.user_id as string}`,
				orgId: this.config.orgId,
				objectId: this.config.variables!.user_id as string,
				webSocket: true,
				authOptions: {
					authRequired: true,
					issuerBaseURL: Configuration.OAuth2IssuerUri,
				},
			};
			this.logger.info(`Added route: ${JSON.stringify(route)}`);
			manager.addRoute(route);
			this.logger.info(`Subscribing to events for route: ${JSON.stringify(route)}`);
			manager.subscribeToWebhookEvents(this.config.orgId, this.config.variables!.user_id as string, route.path, (event) => {
				this.logger.debug(`Webhook received: ${JSON.stringify(event, null, 2)}`);
				const body = jsonParse<Record<string, unknown>>(event.body as string);
				if (!body) {
					this.logger.error("Invalid body received");
					return;
				}
				if (body.type === "chat-message") {
					this.messages.next(body.message as ChatMessage);
				} else if (body.type === "list-work-requests") {
					this.handleWorkRequestList(manager);
				}
			});
		}).catch((err: Error) => {
			this.logger.error(`Error creating HumanWorker: ${err}`);
		});
	}

	public inference(
		chatSession: ChatSession,
		intermediateCallback: ((message: ChatMessage) => Promise<void>) | undefined,
		workerMessageSubject: Subject<ChatMessage>,
	): void {
		this.logger.debug(`inference() chatSession=${JSON.stringify(chatSession)}`);
		const latestMessage = chatSession.messages[chatSession.messages.length - 1];
		if (latestMessage.role === "user" || latestMessage.role === "tool") {
			latestMessage.sessionId = chatSession.id;
			this.sendChatMessage(latestMessage);
		}

		if (!this.sessionSubscriptions.has(chatSession.id)) {
			const subscription = this.messages.subscribe((message) => {
				this.logger.debug(`inference() received message=${JSON.stringify(message)}`);
				if (message.sessionId === chatSession.id) {
					message.done = true;
					this.logger.debug(`inference() message matches sessionId=${chatSession.id}`);
					if (!message.toolCalls && message.text && intermediateCallback) {
						this.logger.debug(`inference() calling intermediateCallback() for messageId=${message.id}`);
						intermediateCallback({
							id: randomUUID(),
							channelMessageId: message.id,
							senderId: this.config.variables!.user_id as string,
							sessionId: chatSession.id,
							role: "worker",
							text: message.text,
							timestamp: Date.now(),
							done: false,
						}).catch((err) => {
							this.logger.error(`inference() intermediateCallback() error=${err}`);
						});
					}
					workerMessageSubject.next({
						id: randomUUID(),
						channelMessageId: message.id,
						sessionId: chatSession.id,
						senderId: this.config.variables!.user_id as string,
						role: "worker",
						text: message.text,
						timestamp: Date.now(),
						done: true,
						toolCalls: message.toolCalls,

					});
				} else {
					this.logger.debug(
						`inference() response=${JSON.stringify(message)} does not match sessionId=${chatSession.id}`
					);
				}
			});
			this.sessionSubscriptions.set(chatSession.id, subscription);
		}

	}

	public sendChatMessage(message: ChatMessage): void {
		WebhookRouteManager.getInstance().then((manager) => {
			manager.sendWebhookEvent({
				path: `/${this.config.orgId}/${this.config.variables!.user_id as string}`,
				body: {
					type: "chat-message",
					message: {
						...message,
					}
				},
				orgId: this.config.orgId,
				objectId: this.config.variables!.user_id as string,
			});
		}).catch((err) => {
			this.logger.error(`Error sending chat message: ${err}`);
		});
	}

	public handleWorkRequestList(manager: WebhookRouteManager) {
		WorkRequestDb.findAll({
			include: [
				{
					model: WorkerDb,
					where: {
						id: this.config.id,
					},
					required: true,
				},
			],
		}).then((requests) => {
			Promise.all(
				requests
					.map((request) => {
						return request.toModel();
					})
					.map((data) => {
						manager.sendWebhookEvent({
							path: `/${this.config.orgId}/${this.config.variables!.user_id as string}`,
							body: {
								type: "work-request-data-list",
								requests: data,
							},
							orgId: this.config.orgId,
							objectId: this.config.variables?.user_id as string,
						} as OutboundWebhookSocketEvent);
					})
			).catch((err) => {
				this.logger.error(`Error sending work requests: ${err}`);
			});
		}).catch((err) => {
			this.logger.error(`Error getting work requests: ${err}`);
		});
	}

	public destroy(): Promise<void> {
		WebhookRouteManager.getInstance().then((manager) => {
			manager.removeRoute({
				path: `/${this.config.orgId}/${this.config.variables!.user_id as string}`,
				orgId: this.config.orgId,
				objectId: this.config.variables!.user_id! as string,
			});
		}).catch((err) => {
			this.logger.error(`Error destroying HumanWorker: ${err}`);
		});

		return Promise.resolve();
	}

	public toolResponseCallback(response: ToolResponse | { success: boolean; message: Record<string, unknown> | string }): void {
		WebhookRouteManager.getInstance().then((manager) => {
			manager.sendWebhookEvent({
				path: `/${this.config.orgId}/${this.config.variables!.user_id as string}`,
				body: {
					type: "tool-response",
					response: response,
				},
				orgId: this.config.orgId,
				objectId: this.config.variables!.user_id as string,
			} as OutboundWebhookSocketEvent);
		}).catch((err) => {
			this.logger.error(`Error sending tool response: ${err}`);
		});
	}

	public workRequestCallback(workRequest: WorkRequest, toolSchemasRecord: Record<string, FunctionDocument[]>): void {
		WebhookRouteManager.getInstance().then((manager) => {
			WorkRequestDb.findOne({
				where: {
					taskExecutionId: workRequest.taskExecutionId,
				},
			})
				.then((db) => {
					if (db) {
						db.toolSchemas = jsonStringify(toolSchemasRecord);
						manager.sendWebhookEvent({
							path: `/${this.config.orgId}/${this.config.variables!.user_id as string}`,
							body: {
								type: "work-request-data-list",
								requests: [db.toModel()],
							},
							orgId: this.config.orgId,
							objectId: this.config.variables!.user_id as string,
						} as OutboundWebhookSocketEvent);
					}
				})
				.catch((err) => {
					this.logger.error(`Error sending work request callback: ${err}`);
				});
		}).catch((err) => {
			this.logger.error(`Error sending work request callback: ${err}`);
		});
	}
}

export interface InboundAPIMessage {
	type: "chat-message" | "list-work-requests";
	body?: ChatMessage;
}
