import { randomUUID } from "crypto";
import { Subject, Subscription } from "rxjs";
import { Logger } from "../../logging/logger.js";
import { SubjectFactory } from "../../manager/impl/subject_factory.js";
import { jsonParse, jsonStringify } from "../../util/json.js";
import { BaseBroker, BrokerConfig } from "../base/broker.js";
import { Tool } from "./base.js";
import { ToolRequestDb } from "./db.tool_request.js";
import { ToolConfig, ToolRequest, ToolResponse } from "./model.js";
import { BrokerManager } from "../../manager/broker_manager.js";
import { ToolState } from "../base/model.js";
import { ToolStateDb } from "./db.state.js";
import { AsyncMap } from "../../manager/impl/cache/async_map.js";
import { MapFactory } from "../../manager/impl/map_factory.js";

export class ToolBroker extends BaseBroker<ToolConfig, Tool<ToolConfig>, object> {
	logger = Logger.getInstance("ToolBroker");

	private requestSubject = new Subject<ToolRequest>();
	private responseSubject = new Subject<ToolResponse>();
	private toolResponseSubjects = new Map<string, Subject<ToolResponse>>();

	private taskExecutionIdsToToolState?: AsyncMap<string>;

	constructor(
		config: BrokerConfig,
		requestSubject?: Subject<ToolRequest>,
		responseSubject?: Subject<ToolResponse>,
		taskExecutionIdsToToolState?: AsyncMap<string>
	) {
		super(config);
		this.logger.debug(`constructor() config=${JSON.stringify(config)}`);
		if (requestSubject) {
			this.requestSubject = requestSubject;
		}
		if (responseSubject) {
			this.responseSubject = responseSubject;
		}
		if (taskExecutionIdsToToolState) {
			this.taskExecutionIdsToToolState = taskExecutionIdsToToolState;
		}

		this.requestSubject.subscribe({
			next: (request) => {
				const handler = this.handleRequest.bind(this);
				handler(request).catch((error: Error) => {
					this.logger.error(`constructor() error handling request error=${error}`);
				});
			},
			error: (error: Error) => {
				this.logger.error(`constructor() error handling request error=${error}`);
			}
		});
		this.responseSubject.subscribe({
			next: this.handleResponse.bind(this),
			error: (error: Error) => {
				this.logger.error(`constructor() error handling response error=${error}`);
			}
		});
	}

	static async create(config: BrokerConfig): Promise<ToolBroker> {
		const { mode } = config;
		const requestSubject = await SubjectFactory.createSubject<ToolRequest>({ channel: "tool.request", mode });
		const responseSubject = await SubjectFactory.createSubject<ToolResponse>({ channel: "tool.response", mode });

		const taskExecutionIdsToToolState = await MapFactory.for<string>("tool", 'taskExecutionIdsToToolState');

		return new ToolBroker(config, requestSubject, responseSubject, taskExecutionIdsToToolState);
	}

	async register(tool: Tool<ToolConfig>): Promise<void> {
		await tool.initializeStateCache();
		await super.register(tool);

		if (this.toolResponseSubjects.has(tool.config.id!)) {
			this.toolResponseSubjects.get(tool.config.id!)?.unsubscribe();
			this.toolResponseSubjects.delete(tool.config.id!);
		}
		const subject = new Subject<ToolResponse>();
		this.toolResponseSubjects.set(tool.config.id!, subject);
	}

	private async handleRequest(request: ToolRequest): Promise<void> {
		try {
			this.logger.debug(`handleRequest() request=${JSON.stringify(request)}`);
			const tool = this.objects.get(request.toolId);
			if (tool) {
				this.logger.debug(`handleRequest() tool=${JSON.stringify(tool.config)}`);
				if (request.channelId) {
					const channelThreadId = await BrokerManager.channelBroker.getThreadId(request.channelId, request.taskExecutionId);
					if (channelThreadId) {
						request.channelThreadId = channelThreadId;
					}
				}
				const db = await ToolRequestDb.create({
					id: randomUUID(),
					toolId: request.toolId,
					taskExecutionId: request.taskExecutionId,
					status: "awaiting-response",
					request: jsonStringify(request),
				});
				tool.execute(
					request
				)
					.then((response: ToolResponse) => {
						this.logger.debug(`handleRequest() response=${JSON.stringify(response)}`);
						db.status = "response-received";
						db.response = jsonStringify(response);
						db.save().catch((error: Error) => {
							this.logger.error(`handleRequest() error=${error}`);
						});
						this.responseSubject.next(response);
					})
					.catch((error: Error) => {
						this.logger.error(`handleRequest() error=${error}`);
						db.status = "error";
						db.response = jsonStringify(error);
						db.save().catch((error: Error) => {
							this.logger.error(`handleRequest() error=${error}`);
						});
						this.responseSubject.next({
							toolId: request.toolId,
							requestId: request.requestId,
							success: false,
							timestamp: Date.now(),
							taskExecutionId: request.taskExecutionId,
							machine_message: error.message,
						});
					});
			} else {
				this.logger.error(`handleRequest() Tool ${request.toolId} not found`);
			}
		} catch (error) {
			this.logger.error(`handleRequest() error=`, error);
		}
	}




	private handleResponse(response: ToolResponse): void {
		this.logger.debug(`handleResponse() response=${JSON.stringify(response)}`);
		if (this.toolResponseSubjects.has(response.toolId)) {
			this.toolResponseSubjects.get(response.toolId)?.next(response);
		} else {
			this.logger.error(`handleResponse() Tool ${response.toolId} not found`);
		}
	}

	public async execute(request: ToolRequest): Promise<ToolResponse> {
		if (!this.objects.has(request.toolId)) {
			throw new Error(`ToolBroker.execute() toolId=${request.toolId} not found`);
		}
		const subject = this.toolResponseSubjects.get(request.toolId);
		if (!subject) {
			throw new Error(`ToolBroker.execute() toolId=${request.toolId} subject not found`);
		}
		const response = new Promise<ToolResponse>((resolve) => {
			const subscription = subject.subscribe((response: ToolResponse) => {
				if (response.requestId === request.requestId) {
					this.logger.debug(`execute() response=${JSON.stringify(response)}`);
					subscription.unsubscribe();
					if (response.machine_state || response.human_state) {
						const toolState: ToolState<Record<string, unknown>> = {
							toolId: request.toolId,
							taskExecutionId: request.taskExecutionId,
							machineState: response.machine_state,
							machineImage: response.machine_image,
							humanState: response.human_state,
							timestamp: Date.now(),
						};
						this.taskExecutionIdsToToolState?.set(request.taskExecutionId, jsonStringify(toolState)).catch((error: Error) => {
							this.logger.error(`execute() error=${error}`);
						});
						ToolStateDb.findOrCreate({
							where: {
								taskExecutionId: request.taskExecutionId,
								toolId: request.toolId,
							},
							defaults: {
								taskExecutionId: request.taskExecutionId,
								toolId: request.toolId,
								machineState: jsonStringify(response.machine_state),
								humanState: jsonStringify(response.human_state),
							}
						}).then(([dbState, created]) => {
							if (!created) {
								if (response.machine_state) {
									dbState.machineState = jsonStringify(response.machine_state);
								}
								if (response.human_state) {
									dbState.humanState = jsonStringify(response.human_state);
								}
								dbState.save().catch((error: Error) => {
									this.logger.error(`execute() saveState error=${error}`);
								});
							}
						}).catch((error: Error) => {
							this.logger.error(`execute() findOrCreate error=${error}`);
						});
					}
					resolve(response);
				} else {
					this.logger.debug(
						`execute() response=${JSON.stringify(response)} does not match requestId=${request.requestId}`
					);
				}
			});
		});
		this.requestSubject.next(request);
		return response;
	}

	public async initSession(args: { toolId: string, taskExecutionId?: string; workerId?: string; channelId?: string;}): Promise<void> {
		const tool = this.objects.get(args.toolId);
		if (tool) {
			await tool.initSession(args.taskExecutionId, args.workerId, args.channelId).catch((error: Error) => {
				this.logger.error(`initSession() error=${error}`);
			});
		}
	}

	public workCompleteCallback(args: { orgId: string, taskExecutionId: string, toolId: string }): Promise<void> {
		const tool = this.objects.get(args.toolId);
		if (tool) {
			tool.workCompleteCallback(args.taskExecutionId).catch((error: Error) => {
				this.logger.error(`workCompleteCallback() error=${error}`);
			});
		}
		return Promise.resolve();
	}

	public async getState(args: { taskExecutionId: string, channelId?: string, channelThreadId?: string, workerId?: string }): Promise<ToolState<Record<string, unknown>> | undefined> {
		const { taskExecutionId, channelId, channelThreadId, workerId } = args;

		let currentState: ToolState<Record<string, unknown>> | undefined = undefined;

		const cachedState = await this.taskExecutionIdsToToolState?.get(taskExecutionId).catch((error: Error) => {
			this.logger.error(`getState() error=${error}`);
			return undefined;
		});

		if (!cachedState) {
			// check the db
			const toolStateDb = await ToolStateDb.findAll({
				where: {
					taskExecutionId: taskExecutionId,
				},
				order: [["createdAt", "DESC"]],
			}).catch((err: Error) => {
				this.logger.error(`Error getting state from db taskExecutionId=${taskExecutionId}`, err);
				return [];
			});

			if (!toolStateDb) {
				this.logger.error(`getState() toolStateDb not found for taskExecutionId=${taskExecutionId}`);
				return;
			}

			if (toolStateDb.length > 0) {
				currentState = toolStateDb[0].toModel<Record<string, unknown>>();
			} else {
				this.logger.error(`getState() toolStateDb not found for taskExecutionId=${taskExecutionId}`);
				return;
			}
		} else {
			currentState = jsonParse(cachedState);
		}

		if (!currentState?.toolId) {
			this.logger.error(`getState() toolId not found in toolState for taskExecutionId=${taskExecutionId}, currentstate=${JSON.stringify(currentState)}`);
			return;
		}

		const tool = this.objects.get(currentState.toolId);

		if (tool) {
			return await tool.getState({ currentState, channelId, channelThreadId, taskExecutionId, workerId }).then( async (state) => {
				if (state) {
					await this.taskExecutionIdsToToolState?.set(taskExecutionId, jsonStringify(state)).catch((error: Error) => {
						this.logger.error(`getState() error=${error}`);
					});
					await ToolStateDb.findOrCreate({
						where: {
							taskExecutionId: taskExecutionId,
							toolId: currentState!.toolId,
						},
						defaults: {
							taskExecutionId: taskExecutionId,
							toolId: currentState!.toolId,
							machineState: jsonStringify(state.machineState),
							humanState: jsonStringify(state.humanState),
							machineImage: state.machineImage,							
						}
					}).then(([dbState, created]) => {
						if (!created) {
							dbState.machineState = jsonStringify(state.machineState);
							dbState.humanState = jsonStringify(state.humanState);
							dbState.machineImage = state.machineImage;
							dbState.save().catch((error: Error) => {
								this.logger.error(`getState() saveState error=${error}`);
							});
						}
					}).catch((error: Error) => {
						this.logger.error(`getState() error=${error}`);
					});
				}
				return state;
			})
			.catch((error: Error) => {
				this.logger.error(`getState() error=${error}`);
				return undefined;
			});
		} else {
			this.logger.error(`getState() Tool ${currentState.toolId} not found`);
		}
		return undefined;
	}


	async remove(toolId: string): Promise<void> {
		this.logger.debug(`remove() toolId=${toolId}`);
		await this.objects
			.get(toolId)
			?.destroy()
			.catch((error: Error) => {
				this.logger.error(`remove() toolId=${toolId} error=${error.message}`);
			});
		this.objects.delete(toolId);
		this.toolResponseSubjects.get(toolId)?.unsubscribe();
		this.toolResponseSubjects.delete(toolId);
	}

	public async destroy(): Promise<void> {
		await Promise.all(Array.from(this.objects.keys()).map((objectId) => this.remove(objectId)));

		this.requestSubject.complete();
		this.responseSubject.complete();

		for (const subject of this.toolResponseSubjects.values()) {
			subject.unsubscribe();
		}
	}

	public subscribe(): Promise<Subscription> {
		throw new Error("Method not implemented.");
	}
}