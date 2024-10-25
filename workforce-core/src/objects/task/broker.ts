import { randomUUID } from "crypto";
import { Subject, Subscription } from "rxjs";
import { Logger } from "../../logging/logger.js";
import { BrokerManager } from "../../manager/broker_manager.js";
import { ConversationManager } from "../../manager/conversation/conversation_manager.js";
import { SubjectFactory } from "../../manager/impl/subject_factory.js";
import { jsonStringify } from "../../util/json.js";
import { BaseBroker, BrokerConfig } from "../base/broker.js";
import { TASK_COMPLETE_FUNCTION_NAME, ToolCall } from "../base/model.js";
import { WorkResponse } from "../worker/model.js";
import { Task } from "./base.js";
import { TaskInputMapper } from "./broker.mapping.js";
import { TaskOutputManager } from "./broker.outputs.js";
import { TaskSubscriptionManager } from "./broker.subscriptions.js";
import { TaskExecutionDb } from "./db.task_execution.js";
import { TaskConfig, TaskExecution, TaskExecutionRequest, TaskExecutionResponse } from "./model.js";
import { TaskExecutionUserDb } from "./db.task_execution_users.js";
import { ObjectType } from "../base/factory/types.js";

export class TaskBroker extends BaseBroker<TaskConfig, Task, object> {
	objectType: ObjectType = "task";
	logger = Logger.getInstance("TaskBroker");

	private taskExecutionRequestSubject = new Subject<TaskExecutionRequest>();
	private taskExecutionResponseSubject = new Subject<TaskExecutionResponse>();
	private workResponseSubject = new Subject<WorkResponse>();
	private trackerSubscriptions = new Map<string, Subscription>();
	private triggerSubscriptions = new Map<string, Subscription>();
	private resourceSubscriptions = new Map<string, Subscription>();
	private channelSubscriptions = new Map<string, Subscription>();

	constructor(
		config: BrokerConfig,
		taskExecutionRequestSubject?: Subject<TaskExecutionRequest>,
		taskExecutionResponseSubject?: Subject<TaskExecutionResponse>,
		workResponseSubject?: Subject<WorkResponse>
	) {
		super(config);

		if (taskExecutionRequestSubject) {
			this.taskExecutionRequestSubject = taskExecutionRequestSubject;
		}
		if (taskExecutionResponseSubject) {
			this.taskExecutionResponseSubject = taskExecutionResponseSubject;
		}

		if (workResponseSubject) {
			this.workResponseSubject = workResponseSubject;
		}

		this.taskExecutionRequestSubject.subscribe({
			next: this.handleTaskExecutionRequest.bind(this),
			error: (error: Error) => {
				this.logger.error(`Error handling task execution request: ${error.message}`);
			}
		});
		this.taskExecutionResponseSubject.subscribe({
			next: this.handleTaskExecutionResponse.bind(this),
			error: (error: Error) => {
				this.logger.error(`Error handling task execution response: ${error.message}`);
			}
		});
		this.workResponseSubject.subscribe({
			next: this.handleWorkResponse.bind(this),
			error: (error: Error) => {
				this.logger.error(`Error handling work response: ${error.message}`);
			},
		});
	}

	static async create(
		config: BrokerConfig,
	): Promise<TaskBroker> {
		const { mode } = config;
		const taskExecutionRequestSubject = await SubjectFactory.createSubject<TaskExecutionRequest>({
			channel: SubjectFactory.TASK_EXECUTION_REQUEST,
			mode,
		});
		const taskExecutionResponseSubject = await SubjectFactory.createSubject<TaskExecutionResponse>({
			channel: SubjectFactory.TASK_EXECUTION_RESPONSE,
			mode
		});
		const workResponseSubject = await SubjectFactory.createSubject<WorkResponse>({
			channel: SubjectFactory.WORK_RESPONSE,
			mode
		})
		return new TaskBroker(
			config,
			taskExecutionRequestSubject,
			taskExecutionResponseSubject,
			workResponseSubject
		);
	}

	async register(task: Task): Promise<void> {
		try {
			await super.register(task);
			this.logger.debug(`Registering task ${task.config.id}`);

			await this.manageTrackerSubscriptions(task);
			await this.manageTriggerSubscriptions(task);
		} catch (error) {
			this.logger.error(`register() Error registering task ${task.config.id}, error=`, error);
			await this.remove(task.config.id!);
			throw error;
		}
	}

	remove(taskId: string): Promise<void> {
		this.logger.debug(`remove() Removing task ${taskId}`);
		const task = this.objects.get(taskId);
		this.trackerSubscriptions.get(`${taskId}-${task?.config.tracker}`)?.unsubscribe();
		this.trackerSubscriptions.delete(`${taskId}-${task?.config.tracker}`);

		for (const objectId of task?.config.triggers ?? []) {
			if (this.triggerSubscriptions.has(`${taskId}-${objectId}`)) {
				this.triggerSubscriptions.get(`${taskId}-${objectId}`)?.unsubscribe();
				this.triggerSubscriptions.delete(`${taskId}-${objectId}`);
			} else if (this.resourceSubscriptions.has(`${taskId}-${objectId}`)) {
				this.resourceSubscriptions.get(`${taskId}-${objectId}`)?.unsubscribe();
				this.resourceSubscriptions.delete(`${taskId}-${objectId}`);
			} else if (this.channelSubscriptions.has(`${taskId}-${objectId}`)) {
				BrokerManager.channelBroker.unsubscribe(objectId, this.channelSubscriptions.get(`${taskId}-${objectId}`)!);
				this.channelSubscriptions.get(`${taskId}-${objectId}`)?.unsubscribe();
				this.channelSubscriptions.delete(`${taskId}-${objectId}`);
			} else if (this.trackerSubscriptions.has(`${taskId}-${objectId}`)) {
				this.trackerSubscriptions.get(`${taskId}-${objectId}`)?.unsubscribe();
				this.trackerSubscriptions.delete(`${taskId}-${objectId}`);
			} else {
				this.logger.warn(`remove() No subscription found for object ${objectId}`);
			}
		}

		this.objects.delete(taskId);
		return Promise.resolve();
	}

	async destroy(): Promise<void> {
		await Promise.all(Array.from(this.objects.keys()).map((objectId) => this.remove(objectId)));
		this.taskExecutionRequestSubject.complete();
		this.taskExecutionResponseSubject.complete();
		this.workResponseSubject.complete();
		for (const subscription of this.trackerSubscriptions.values()) {
			subscription.unsubscribe();
		}
		for (const subscription of this.triggerSubscriptions.values()) {
			subscription.unsubscribe();
		}
		for (const subscription of this.resourceSubscriptions.values()) {
			subscription.unsubscribe();
		}
		for (const subscription of this.channelSubscriptions.values()) {
			subscription.unsubscribe();
		}
	}

	public subscribe(taskExecutionId: string, callback: (e: TaskExecutionResponse) => Promise<void>): Promise<Subscription> {
		return Promise.resolve(this.taskExecutionResponseSubject.subscribe((taskExecutionResponse) => {
			if (taskExecutionResponse.taskExecutionId === taskExecutionId) {
				callback(taskExecutionResponse).catch((error: Error) => {
					this.logger.error(`subscribe() Error handling task execution response: ${error.message}`);
				});
			}
		}))
	}

	private async executeTask(args: {
		taskId: string,
		users: string[],
		taskExecutionId: string,
		inputs: Record<string, string>,
		channelId?: string,
		parentTaskExecutionId?: string
	}): Promise<void> {
		const { taskId, users, taskExecutionId, inputs, channelId, parentTaskExecutionId } = args;
		this.logger.debug(
			`Executing task ${taskId} with execution id ${taskExecutionId} and inputs ${JSON.stringify(inputs)}`
		);
		const task = this.objects.get(taskId);

		if (task) {
			//TODO: Revisit auto creation of ticket
			// if (parentTaskExecutionId) {
			// 	const parentTaskExecution = await TaskExecutionDb.findOne({
			// 		where: {
			// 			id: parentTaskExecutionId,
			// 		},
			// 	});
			// 	if (!parentTaskExecution) {
			// 		this.logger.warn(`executeTask() Parent task execution ${parentTaskExecutionId} not found`);
			// 	} else if (parentTaskExecution.status == "completed") {
			// 		this.logger.warn(`executeTask() Parent task execution ${parentTaskExecutionId} is already completed`);
			// 	}

			// 	if (parentTaskExecution?.inputs) {
			// 		const parentInputs = JSON.parse(parentTaskExecution.inputs);
			// 		if (inputs["ticket.id"]) {
			// 			inputs["ticket.id"] = parentInputs["ticket.id"];
			// 		}

			// 	}
			// }

			this.logger.debug(`executeTask() Task ${task.config.name} mapping resource inputs`);
			await TaskInputMapper.mapResourceInputs(task, inputs);
			const functionsSchema = await task.getFunctionsSchema(
				channelId,
				parentTaskExecutionId
			);
			ConversationManager.setConversation({
				taskExecutionId: taskExecutionId,
				name: task.config.name,
				description: task.config.description,
				messages: [],
				customers: [],
				workers: [],
				subject: new Subject(),
				interrupt: new Subject(),
				release: new Subject(),
			});

			this.logger.debug(`executeTask() Creating task execution ${taskExecutionId} with users ${JSON.stringify(users)}`);
			await TaskExecutionDb.create({
				id: taskExecutionId,
				orgId: task.config.orgId,
				taskId: taskId,
				users: users.map((user) => (new TaskExecutionUserDb({ userId: user, taskExecutionId: taskExecutionId }))),
				status: "started",
				timestamp: Date.now(),
				inputs: jsonStringify(inputs),
				parentTaskExecutionId: parentTaskExecutionId,
			})
				.then((db) => {
					this.logger.debug(`executeTask() Created task execution ${db.id}`);
					return db;
				})

				.catch((error: Error) => {
					this.logger.error(`executeTask() Error creating task execution ${taskExecutionId}`, error);
					throw error;
				});
			for (const user of users) {
				await TaskExecutionUserDb.findOrCreate({
					where: {
						taskExecutionId: taskExecutionId,
						userId: user,
					},
					defaults: {
						taskExecutionId: taskExecutionId,
						userId: user,
					}
				})
					.then(() => {
						this.logger.debug(`executeTask() Created or found execution user ${user}`);
					})
					.catch((error: Error) => {
						this.logger.error(`executeTask() Error creating task execution user ${user}`, error);
					});
			}
			task.execute(
				{
					taskId: taskId,
					taskExecutionId: taskExecutionId,
					orgId: task.config.orgId,
					users: users,
					inputs: inputs,
					completionFunction: functionsSchema,
					channelId: channelId ?? task.config.defaultChannel,
					parentTaskExecutionId: parentTaskExecutionId,
					costLimit: task.config.costLimit,
				},
				BrokerManager.workerBroker,
				BrokerManager.channelBroker.getObject(channelId ?? task.config.defaultChannel ?? "")?.config.type,
				(error: Error) => {
					this.logger.error(`executeTask() Error executing task ${task.config.name}`, error);
					TaskExecutionDb.findOne({
						where: {
							id: taskExecutionId,
						},
						include: {
							model: TaskExecutionUserDb
						}
					}).then((db) => {
						if (db) {
							db.status = "failed";
							db.save().catch((error: Error) => {
								this.logger.error(`executeTask() Error saving task execution ${taskExecutionId}`, error);
							});
						}
					}).catch((error: Error) => {
						this.logger.error(`executeTask() Error finding task execution ${taskExecutionId}`, error);
					});
				}
			);
		}
	}

	private handleTaskExecutionRequest(request: TaskExecutionRequest): void {
		this.logger.debug(`handleTaskExecutionRequest() request=${JSON.stringify(request)}`);
		const task = this.objects.get(request.taskId);
		if (task) {
			this.executeTask({
				taskId: request.taskId,
				users: request.users,
				taskExecutionId: request.taskExecutionId,
				inputs: request.inputs ?? {},
				channelId: request.channelId,
				parentTaskExecutionId: request.parentTaskExecutionId,
			}).catch((error: Error) => {
				this.logger.error(`Task ${task.config.name} failed with error: ${error.message}`);
			});
		} else {
			this.logger.error(`Task ${request.taskId} not found`);
		}
	}

	public request(request: TaskExecutionRequest): void {
		this.taskExecutionRequestSubject.next(request);
	}

	public respond(response: TaskExecutionResponse): void {
		this.taskExecutionResponseSubject.next(response);
	}

	private handeTaskExecutionResponseError(response: TaskExecutionResponse, request: TaskExecution, task: Task, error: Error): Promise<void> {
		this.logger.error(`handleTaskExecutionResponseError() error=${error.message}`);

		// Update ticket if tracker is configured
		if (task.config.tracker && request.inputs?.["ticket.id"]) {
			return BrokerManager.trackerBroker.update({
				trackerId: task.config.tracker,
				ticketId: request.inputs["ticket.id"],
				ticketUpdateId: randomUUID(),
				data: {
					name: request.inputs["ticket.name"] ?? "",
					status: "failed",
					comments: [
						`Task ${task.config.name} failed with error: ${error.message}`,
					],
				},
			});
		} else {
			return Promise.resolve();
		}
	}

	private handleTaskExecutionResponse(response: TaskExecutionResponse): void {
		TaskExecutionDb.findOne({
			where: {
				id: response.taskExecutionId,
			},
			include: {
				model: TaskExecutionUserDb
			}
		}).then((db) => {
			if (!db) {
				this.logger.error(`handleTaskExecutionResponse() Task execution ${response.taskExecutionId} not found`);
				return;
			}
			const request = db.toModel();
			const task = this.objects.get(db.taskId);
			if (!task) {
				this.logger.error(`handleTaskExecutionResponse() Task ${db.taskId} not found`);
				return;
			}

			try {
				ConversationManager.release(response.taskExecutionId);
			} catch (error) {
				this.logger.error(`handleTaskExecutionResponse() Conversation release error=${error as Error}`);
			}

			if (typeof response.result === "string") {
				return this.handeTaskExecutionResponseError(response, request, task, new Error(response.result));

			}
			if (!response.result.arguments) {
				return this.handeTaskExecutionResponseError(response, request, task, new Error("No arguments returned"));

			}
			// TODO: Revisit partial completion
			if (response.result.name !== TASK_COMPLETE_FUNCTION_NAME) {
				return this.handeTaskExecutionResponseError(response, request, task, new Error(`Task ${task.config.name} returned an invalid function name: ${response.result.name}.`));
			}

			this.logger.info(`Task ${task.config.name} completed successfully.`);

			this.logger.debug(
				`Task ${task.config.name} returned the following arguments: ${JSON.stringify(response.result.arguments)}`
			);

			Promise.all(Object.keys(response.result.arguments).map((argument) => {
				return TaskOutputManager.writeObjectOutputs(
					task,
					response.result as ToolCall,
					argument,
					response.taskExecutionId,
					response.workerId,
					(response.result as ToolCall).sessionId
				);
			})).then(() => {
				// Update ticket if tracker is configured
				if (task.config.tracker && request.inputs?.["ticket.id"]) {
					BrokerManager.trackerBroker.update({
						trackerId: task.config.tracker,
						ticketId: request.inputs["ticket.id"],
						ticketUpdateId: randomUUID(),
						data: {
							name: request.inputs["ticket.name"] ?? "",
							status: "completed",
							comments: [`Task ${task.config.name} completed.`],
						},
					}).catch((error: Error) => {
						this.logger.error(`handleTaskExecutionResponse() Error updating ticket ${request.inputs?.["ticket.id"]}`, error);
					});
				}
				db.status = "completed";
				db.outputs = jsonStringify((response.result as ToolCall).arguments);

				db.save().catch((error: Error) => {
					this.logger.error(`executeTask() Error saving task execution ${response.taskExecutionId}`, error);
				});
			}).catch((error: Error) => {
				this.logger.error(`handleTaskExecutionResponse() Error finding task execution ${response.taskExecutionId}`, error);
			});
		}).catch((error: Error) => {
			this.logger.error(`handleTaskExecutionResponse() Error finding task execution ${response.taskExecutionId}`, error);
		});
	}

	private handleWorkResponse(response: WorkResponse): void {
		this.logger.debug(`handleWorkResponse() response=${JSON.stringify(response)}`);
		TaskExecutionDb.findOne({
			where: {
				id: response.taskExecutionId,
			},
			include: {
				model: TaskExecutionUserDb
			}
		}).then((db) => {
			if (!db) {
				this.logger.error(`handleWorkResponse() Task execution ${response.taskExecutionId} not found`);
				return;
			}
			this.taskExecutionResponseSubject.next({
				taskExecutionId: response.taskExecutionId,
				orgId: db.orgId,
				users: db.users?.map((user) => user.userId) ?? [],
				result: response.output,
				taskId: db.taskId,
				workerId: response.workerId,
			});
		}).catch((error: Error) => {
			this.logger.error(`handleWorkResponse() Error finding task execution ${response.taskExecutionId}`, error);
		});
	}

	private async manageTrackerSubscriptions(task: Task): Promise<void> {
		if (task.config.tracker) {
			const subscription = await TaskSubscriptionManager.trackerSubscription(
				task,
				task.config.tracker,
				(args: { taskId: string, users: string[], taskExecutionId: string, inputs: Record<string, string> }) => {
					const { taskId, taskExecutionId, inputs, users } = args;
					this.taskExecutionRequestSubject.next({
						taskId,
						orgId: task.config.orgId,
						users,
						taskExecutionId,
						inputs,
						taskName: task.config.name
					});
					return Promise.resolve();
				}
			).catch((error: Error) => {
				this.logger.error(
					`manageTrackerSubscriptions() Error subscribing to tracker ${task.config.tracker}, error=${error.message}`
				);
				throw error;
			});
			if (subscription) {
				this.trackerSubscriptions.get(`${task.config.id!}-${task.config.tracker}`)?.unsubscribe();
				this.trackerSubscriptions.delete(`${task.config.id!}-${task.config.tracker}`);
				this.trackerSubscriptions.set(`${task.config.id!}-${task.config.tracker}`, subscription);
			}
		}
	}

	private async manageTriggerSubscriptions(task: Task): Promise<void> {
		if (task.config.triggers) {
			for (const objectId of task.config.triggers) {
				if (BrokerManager.resourceBroker.getObject(objectId)) {
					const subscription = await TaskSubscriptionManager.resourceSubscription(
						task,
						objectId,
						(args: { taskId: string, users: string[], taskExecutionId: string, inputs: Record<string, string> }) => {
							const { taskId, taskExecutionId, inputs, users } = args;
							this.taskExecutionRequestSubject.next({
								taskId,
								orgId: task.config.orgId,
								users,
								taskExecutionId,
								inputs,
								taskName: task.config.name
							});
							return Promise.resolve();
						}
					).catch((error: Error) => {
						this.logger.error(
							`manageResourceSubscriptions() Error subscribing to resource ${objectId}, error=${error.message}`
						);
						throw error;
					});
					if (subscription) {
						this.resourceSubscriptions.get(`${task.config.id!}-${objectId}`)?.unsubscribe();
						this.resourceSubscriptions.delete(`${task.config.id!}-${objectId}`);
						this.resourceSubscriptions.set(`${task.config.id!}-${objectId}`, subscription);
					}
				} else if (BrokerManager.channelBroker.getObject(objectId)) {
					const channelSubscription = await TaskSubscriptionManager.channelSubscription(
						task,
						objectId,
						(args: { taskId: string, users: string[], taskExecutionId: string, inputs: Record<string, string> }) => {
							const { taskId, taskExecutionId, inputs, users } = args;
							this.taskExecutionRequestSubject.next({
								taskId,
								orgId: task.config.orgId,
								users,
								taskExecutionId,
								inputs,
								channelId: objectId,
								taskName: task.config.name
							});
							return Promise.resolve();
						}
					).catch((error: Error) => {
						this.logger.error(
							`manageChannelSubscriptions() Error subscribing to channel ${objectId}, error=${error.message}`
						);
						throw error;
					});
					if (channelSubscription) {
						this.channelSubscriptions.get(`${task.config.id!}-${objectId}`)?.unsubscribe();
						this.channelSubscriptions.delete(`${task.config.id!}-${objectId}`);
						this.channelSubscriptions.set(`${task.config.id!}-${objectId}`, channelSubscription);
					}
				} else {
					this.logger.error(`manageTriggerSubscriptions() No object found for ${objectId}`);
					throw new Error(`No object found for ${objectId}`);
				}
			}
		}
	}
}