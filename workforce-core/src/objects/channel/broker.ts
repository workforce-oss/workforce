import { randomUUID } from "crypto";
import { Subject, Subscription } from "rxjs";
import { Logger } from "../../logging/logger.js";
import { SubjectFactory } from "../../manager/impl/subject_factory.js";
import { jsonStringify } from "../../util/json.js";
import { BaseBroker, BrokerConfig } from "../base/broker.js";
import { ObjectError } from "../base/model.js";
import { Channel } from "./base.js";
import { ChannelMessageDb } from "./db.message.js";
import { ChannelSessionDb } from "./db.session.js";
import { ChannelConfig, ChannelMessageEvent, ChannelSessionStatus, MessageRequest } from "./model.js";

export class ChannelBroker extends BaseBroker<ChannelConfig, Channel, ChannelMessageEvent> {
	logger = Logger.getInstance("ChannelBroker");

	private requestSubject = new Subject<MessageRequest>();
	private messageSubject = new Subject<ChannelMessageEvent>();
	private requestSubcriptions: Map<string, Subscription>;
	private errorSubscriptions: Map<string, Subscription>;

	constructor(
		config: BrokerConfig,
		requestSubject?: Subject<MessageRequest>,
		messageSubject?: Subject<ChannelMessageEvent>
	) {
		super(config);
		this.logger.debug(`constructor() config=${JSON.stringify(config)}`);
		this.requestSubcriptions = new Map();
		if (requestSubject) {
			this.requestSubject = requestSubject;
		}
		if (messageSubject) {
			this.messageSubject = messageSubject;
		}
		this.errorSubscriptions = new Map();
		this.requestSubject.subscribe({
			next: this.handleRequest.bind(this),
			error: (error: Error) => {
				this.logger.error(`constructor() error handling request error=${error}`);
			},
		});
	}

	static async create(config: BrokerConfig): Promise<ChannelBroker> {
		const { mode } = config;
		const requestSubject = await SubjectFactory.createSubject<MessageRequest>({
			channel: "channel.request",
			mode,
		});
		const messageSubject = await SubjectFactory.createSubject<ChannelMessageEvent>({
			channel: "channel.message",
			mode
		});

		return new ChannelBroker(config, requestSubject, messageSubject);
	}

	async register(channel: Channel): Promise<void> {
		await channel.initializeDataCache();
		await super.register(channel);
		const errorSubscription = channel.errors.subscribe(this.handleError.bind(this));
		this.errorSubscriptions.set(channel.config.id!, errorSubscription);
	}

	private handleError(objectError: ObjectError) {
		this.logger.error(`handleError() channel=${objectError.objectId} error=${objectError.error.message}`);
		const channel = this.objects.get(objectError.objectId);
		if (channel) {
			channel.destroy().then(() => {
				this.remove(objectError.objectId).catch((err: Error) => {
					this.logger.error(`handleError() channel=${objectError.objectId} error=${err.message}`);
				});
			}).catch((err: Error) => {
				this.logger.error(`handleError() channel=${objectError.objectId} error=${err.message}`);
			})
		}
	}

	private handleRequest(request: MessageRequest): void {
		this.logger.debug(`handleRequest() request=${request.messageId}`);
		if (this.objects.has(request.channelId)) {
			this.logger.debug(`handleRequest() request=${request.messageId} matches channelId=${request.channelId}`);
			ChannelMessageDb.create({
				id: randomUUID(),
				channelId: request.channelId,
				taskExecutionId: request.taskExecutionId,
				request: jsonStringify(request),
				status: "awaiting-response",
			}).then((db) => {
				if (!db) {
					throw new Error(`handleRequest() channelId=${request.channelId} db not found`);
				}
				this.objects
					.get(request.channelId)
					?.message(request)
					.catch(() => {
						db.status = "error";
						db.save().catch((error: Error) => {
							this.logger.error(`handleRequest() channelId=${request.channelId} error=${error.message}`);
						});
					});
			}).catch((error: Error) => {
				this.logger.error(`handleRequest() channelId=${request.channelId} error=${error.message}`);
				throw error;
			});

		} else {
			this.logger.debug(
				`handleRequest() request=${request.messageId} does not match channelId=${request.channelId}`
			);
		}
	}

	async remove(channelId: string): Promise<void> {
		this.logger.debug(`remove() channelId=${channelId}`);
		await this.objects
			.get(channelId)
			?.destroy()
			.catch((error: Error) => {
				this.logger.error(`remove() channelId=${channelId} error=${error.message}`);
			});
		this.requestSubcriptions.get(channelId)?.unsubscribe();
		this.requestSubcriptions.delete(channelId);
		this.errorSubscriptions.get(channelId)?.unsubscribe();
		this.errorSubscriptions.delete(channelId);
		this.objects.delete(channelId);
	}

	async destroy(): Promise<void> {
		this.logger.debug(`destroy()`);
		await Promise.all(Array.from(this.objects.keys()).map((objectId) => this.remove(objectId)));
		this.requestSubcriptions.forEach((subscription) => subscription.unsubscribe());
		this.requestSubcriptions.clear();
		this.errorSubscriptions.forEach((subscription) => subscription.unsubscribe());
		this.errorSubscriptions.clear();
		this.requestSubject.complete();
		this.messageSubject.complete();
	}

	public message(request: MessageRequest): Promise<void> {
		if (!this.objects.has(request.channelId)) {
			throw new Error(`ChannelBroker.message() channel ${request.channelId} not found`);
		}
		try {
			this.requestSubject.next(request);
		} catch (error) {
			this.logger.error(`message() channelId=${request.channelId} error=`, error);
		}
		return Promise.resolve();
	}

	public async join(channelId: string, workerId: string, token: string, username?: string, taskExecutionId?: string) {
		if (!this.objects.has(channelId)) {
			throw new Error(`join() channel ${channelId} not found`);
		}
		await this.objects.get(channelId)?.join(workerId, token, username, taskExecutionId);
	}

	public async leave(channelId: string, workerId: string) {
		if (!this.objects.has(channelId)) {
			throw new Error(`leave() channel ${channelId} not found`);
		}
		await this.objects.get(channelId)?.leave(workerId);
	}

	public async establishSession(
		channelId: string,
		taskExecutionId: string,
		originalMessageData?: Record<string, string>
	) {
		if (!this.objects.has(channelId)) {
			throw new Error(`establishSession() channel ${channelId} not found`);
		}
		this.logger.debug(`establishSession() channelId=${channelId} taskExecutionId=${taskExecutionId}`);
		const db = await ChannelSessionDb.findOrCreate({
			where: {
				id: taskExecutionId,
				taskExecutionId,
				channelId,
				status: "started",
			},
			defaults: {
				id: taskExecutionId,
				taskExecutionId,
				channelId,
				status: "started",
			},
		})
			.then((db: [ChannelSessionDb, boolean]) => {
				if (!db[0]) {
					throw new Error(`establishSession() channelId=${channelId} db create or find did not return a value`);
				}
				this.logger.debug(`establishSession() channelId=${channelId} created db=${db[0].id}`);
				return db[0];
			})
			.catch((error: Error) => {
				this.logger.error(`establishSession() channelId=${channelId} error=${error.message}`);
				throw error;
			});
		await this.objects
			.get(channelId)
			?.establishSession(taskExecutionId, originalMessageData)
			.catch((error: Error) => {
				this.logger.error(`establishSession() channelId=${channelId} error=${error.message}`);
				db.status = "error";
				db.save().catch((error: Error) => {
					this.logger.error(`establishSession() channelId=${channelId} error=${error.message}`);
				});
				throw error;
			});
	}

	public async setSessionStatus(channelId: string, taskExecutionId: string, status: ChannelSessionStatus) {
		if (!this.objects.has(channelId)) {
			throw new Error(`setSessionStatus() channel ${channelId} not found`);
		}
		const db = await ChannelSessionDb.findOne({
			where: {
				taskExecutionId: taskExecutionId,
			},
		})
		if (!db) {
			throw new Error(`setSessionStatus() session ${taskExecutionId} not found`);
		}
		db.status = status;
		await db.save().catch((error: Error) => {
			this.logger.error(`setSessionStatus() channelId=${channelId} error=${error.message}`);
		});
	}



	public async releaseSession(channelId: string, taskExecutionId: string): Promise<void> {
		if (!this.objects.has(channelId)) {
			throw new Error(`releaseThread() channel ${channelId} not found`);
		}
		await this.objects.get(channelId)?.releaseThread(taskExecutionId);
	}

	public async handOffSession(channelId: string, oldTaskExecutionId: string, newTaskExecutionId: string): Promise<void> {
		if (!this.objects.has(channelId)) {
			throw new Error(`handOffSession() channel ${channelId} not found`);
		}
		await this.objects.get(channelId)?.handOffSession(oldTaskExecutionId, newTaskExecutionId);
	}

	public async getThreadId(channelId: string, taskExecutionId: string): Promise<string | undefined> {
		if (!this.objects.has(channelId)) {
			throw new Error(`getThreadId() channel ${channelId} not found`);
		}
		return this.objects.get(channelId)?.getThreadId(taskExecutionId);
	}

	public subscribeToSession(
		channelId: string,
		sessionId: string,
		workerId: string,
		messageTypes: string[],
		callback: (message: MessageRequest) => void
	): Subscription {
		const channel = this.objects.get(channelId);
		this.logger.debug(`subscribeToSession() channelId=${channelId} sessionId=${sessionId}`);
		if (!channel) {
			throw new Error(`subscribeToSession() channel ${channelId} not found`);
		}
		return channel.subscribe((message: ChannelMessageEvent) => {
			this.logger.debug(
				`subscribeToSession() message.sessionId=${message.taskExecutionId} sessionId=${sessionId}`
			);
			if (
				message.taskExecutionId === sessionId &&
				message.senderId !== workerId &&
				messageTypes.includes(message.messageType || "chat-message")
			) {
				const request = {
					messageId: message.messageId,
					channelId: message.channelId,
					message: message.message,
					timestamp: Date.now(),
					senderId: message.senderId,
					taskExecutionId: sessionId,
					workerId: workerId,
				} as MessageRequest
				if (message.toolCalls) {
					request.toolCalls = message.toolCalls;
				}
				if (message.channelMessageData) {
					request.channelMessageData = message.channelMessageData;
				}
				if (message.image) {
					request.image = message.image;
				}
				ChannelMessageDb.findOrCreate({
					where: {
						id: message.messageId,
					},
					defaults: {
						id: message.messageId,
						channelId: request.channelId,
						taskExecutionId: request.taskExecutionId,
						request: jsonStringify(request),
						status: "awaiting-response",
					},
				}).catch((error: Error) => {
					this.logger.error(`handleRequest() channelId=${request.channelId} error=${error.message}`);
					throw error;
				});
				callback(request);
			} else {
				this.logger.debug(
					`subscribeToSession() message.sessionId=${message.taskExecutionId} sessionId=${sessionId} not matched`
				);
			}
		});
	}

	subscribe(
		channelId: string,
		callback: (message: ChannelMessageEvent) => Promise<void>
	): Promise<Subscription> {
		const channel = this.objects.get(channelId);
		if (!channel) {
			throw new Error(`subscribe() channel ${channelId} not found`);
		}
		return Promise.resolve(channel.subscribe((message: ChannelMessageEvent) => {
			if (message.taskExecutionId) {
				// ignore messages that are part of a session
				this.logger.debug(`subscribe() message.sessionId=${message.taskExecutionId}`);
				return;
			}
			this.logger.debug(`subscribe() message.channelId=${message.channelId} channelId=${channelId}`);
			if (message.channelId === channelId) {
				callback(message).catch((error: Error) => {
					this.logger.error(`subscribe() channelId=${channelId} error=${error.message}`);
				});
			}
		}));
	}
}
