import { randomUUID } from "crypto";
import { Subject, Subscription } from "rxjs";
import { Logger } from "../../logging/logger.js";
import { BrokerManager } from "../../manager/broker_manager.js";
import { SubjectFactory } from "../../manager/impl/subject_factory.js";
import { jsonParse, jsonStringify } from "../../util/json.js";
import { BaseBroker, BrokerConfig } from "../base/broker.js";
import { ChannelMessageDataKey, ChannelType } from "../channel/model.js";
import { CredentialHelper } from "../credential/helper.js";
import { Worker } from "./base.js";
import { WorkRequestDb } from "./db.work_request.js";
import { WorkerChatSessionDb } from "./db.worker_chat_session.js";
import { WorkRequest, WorkResponse, WorkerConfig } from "./model.js";
import { QueueService } from "./service.queue.js";

export class WorkerBroker extends BaseBroker<WorkerConfig, Worker, object> {
	logger = Logger.getInstance("WorkerBroker");

	private orgWorkers = new Map<string, Worker[]>();

	private workRequestSubject = new Subject<WorkRequest>();
	private workResponseSubject = new Subject<WorkResponse>();
	private flushDaemons = new Map<string, NodeJS.Timeout>();

	constructor(
		config: BrokerConfig,
		workRequestSubject?: Subject<WorkRequest>,
		workResponseSubject?: Subject<WorkResponse>
	) {
		super(config);

		if (workRequestSubject) {
			this.workRequestSubject = workRequestSubject;
		}
		if (workResponseSubject) {
			this.workResponseSubject = workResponseSubject;
		}

		this.workRequestSubject.subscribe({
			next: (request: WorkRequest) => {
				const requestHandler = this.handleRequest.bind(this)
				requestHandler(request).catch((error: Error) => {
					this.logger.error(`constructor() error handling request ${jsonStringify(request)}`, error);
				});
			},
			error: (error: Error) => {
				this.logger.error(`constructor() error handling request error=${error}`);
			},
		});
	}

	static async create(
		config: BrokerConfig,
	): Promise<WorkerBroker> {
		const { mode } = config;
		const workRequestSubject = await SubjectFactory.createSubject<WorkRequest>({
			channel: SubjectFactory.WORK_REQUEST,
			mode,
		});
		const workResponseSubject = await SubjectFactory.createSubject<WorkResponse>({
			channel: SubjectFactory.WORK_RESPONSE,
			mode,
		});
		return new WorkerBroker(config, workRequestSubject, workResponseSubject);
	}

	async register(worker: Worker): Promise<void> {
		await super.register(worker);
		if (!this.orgWorkers.has(worker.config.orgId)) {
			this.orgWorkers.set(worker.config.orgId, []);
		}
		this.logger.debug(`register() Registering worker ${worker.config.id} with config: ${jsonStringify(worker.config)}`);
		this.orgWorkers.set(worker.config.orgId, [...this.orgWorkers.get(worker.config.orgId)!, worker]);

		// Resume any in-progress work requests
		WorkRequestDb.findAll({
			where: {
				workerId: worker.config.id,
				status: "in-progress",
			},
		}).then((workRequests) => {
			workRequests.forEach((db) => {
				const request = JSON.parse(db.request!) as WorkRequest;
				this.logger.debug(`register() Resending work request ${request.taskExecutionId}`);
				worker.work(request).catch((error: Error) => {
					this.logger.error(`register() Error resending work request ${request.taskExecutionId}`, error);
				});
			});
		}).catch((error: Error) => {
			this.logger.error(`register() Error resending work requests for worker ${worker.config.id}`, error);
		});

		// Start a daemon to flush the queue regularly
		if (!this.flushDaemons.has(worker.config.id!)) {
			const daemon = setInterval(() => {
				this.flushQueue(worker.config.id!).catch((error: Error) => {
					this.logger.error(`register() Error flushing queue for worker ${worker.config.id}`, error);
				});
			}, 5000);
			this.flushDaemons.set(worker.config.id!, daemon);
		}
	}

	private async flushQueue(workerId: string): Promise<void> {
		const worker = this.objects.get(workerId);
		if (!worker) {
			this.logger.error(`flushQueue() Worker ${workerId} not found`);
			return;
		}
		const processed = new Set<string>();
		while (await QueueService.workerIsAvailable(worker.config.id!, worker.config.wipLimit ?? 1)) {
			const workRequestDb = await QueueService.getNext(worker.config.id!);
			if (!workRequestDb) {
				break;
			}

			const workRequest = workRequestDb.toModel();
			if (workRequest.status === "error" || workRequest.status === "complete" || workRequest.status === "in-progress") {
				break;
			}
			if (processed.has(workRequest.taskExecutionId)) {
				break;
			}
			this.logger.debug(`flushQueue() Sending work request`, workRequest);
			if (!workRequest.request) {
				workRequestDb.status = "error";
				workRequestDb.response = jsonStringify(new Error("Work request not found"));
				workRequestDb.save().catch((error: Error) => {
					this.logger.error(`flushQueue() Error saving work request ${workRequest.taskExecutionId}`, error);
				});
				processed.add(workRequest.taskExecutionId);
				continue;
			}

			this.logger.debug(`flushQueue() Sending work request ${workRequest.taskExecutionId} to worker ${worker.config.id}`);
			await worker.queueWork(workRequest.request);
			processed.add(workRequest.taskExecutionId);
		}
	}

	async updateChatSessionChannel(workerId: string, channelId: string, taskExecutionId: string): Promise<void> {
		this.logger.debug(`updateChatSessionChannel() Updating chat session channel for worker ${workerId} and taskExecutionId ${taskExecutionId}`);
		const worker = this.objects.get(workerId);
		if (worker) {
			const chatSession = await WorkerChatSessionDb.findOne({
				where: {
					taskExecutionId: taskExecutionId,
				},
			}).catch((error: Error) => {
				this.logger.error(`updateChatSessionChannel() Error finding chat session for taskExecutionId ${taskExecutionId}`, error);
				throw error;
			});

			if (!chatSession) {
				this.logger.error(`updateChatSessionChannel() Chat session not found for taskExecutionId ${taskExecutionId}`);
				return;
			}

			if (chatSession.channelId) {
				await BrokerManager.channelBroker.leave(chatSession.channelId, worker.config.id!).catch((error: Error) => {
					this.logger.error(`updateChatSessionChannel() Error leaving channel ${chatSession.channelId} and worker ${worker.config.id}`, error);
					throw error;
				});
			}

			chatSession.channelId = channelId;

			const channelType = BrokerManager.channelBroker.getObject(channelId)?.config.subtype;

			const workerTokenCredentialId = worker.config.channelUserConfig?.[channelType!];
			if (!workerTokenCredentialId) {
				this.logger.error(`updateChatSessionChannel() Worker ${workerId} does not have a channel credential for channel ${channelId} of type ${channelType}`);
				throw new Error(`Worker ${workerId} does not have a token for channel ${channelId} of type ${channelType}`);
			}

			const workerTokenCredential = await CredentialHelper.instance.getSecret(workerTokenCredentialId).catch((error: Error) => {
				this.logger.error(`updateChatSessionChannel() Error getting worker token for worker ${worker.config.id} and channel ${channelId} of type ${channelType}`, error);
				throw error;
			});

			if (!workerTokenCredential?.token) {
				this.logger.error(`updateChatSessionChannel() Worker ${worker.config.id} does not have a token for channel ${channelId} of type ${channelType}`);
				this.logger.debug(`${jsonStringify(workerTokenCredential)}`);
				throw new Error(`Worker ${worker.config.id} does not have a token for channel ${channelId} of type ${channelType}`);
			}

			let workerToken = workerTokenCredential.token as string;

			// replace any pipes
			workerToken = workerToken.replace(/\|/g, "");

			await chatSession.save().catch((error: Error) => {
				this.logger.error(`updateChatSessionChannel() Error saving chat session for taskExecutionId ${taskExecutionId}`, error);
				throw error;
			});

			await BrokerManager.channelBroker.establishSession(channelId, taskExecutionId, { "threadId": taskExecutionId }).catch((error: Error) => {
				this.logger.error(`updateChatSessionChannel() Error establishing session for channel ${channelId} and taskExecutionId ${taskExecutionId}`, error);
			});
			await BrokerManager.channelBroker.join(channelId, worker.config.id!, workerToken, worker.config.name, taskExecutionId).catch((error: Error) => {
				this.logger.error(`updateChatSessionChannel() Error joining channel ${channelId} and worker ${worker.config.id}`, error);
			});
		} else {
			this.logger.error(`updateChatSessionChannel() Worker ${workerId} not found`);
		}

	}


	async handleRequest(request: WorkRequest): Promise<void> {
		this.logger.debug(`handleRequest() Handling work request`, request);
		const worker = this.objects.get(request.workerId);
		if (worker) {
			this.logger.debug(`handleRequest() Sending work request to worker ${request.workerId}`, request);
			// automatically update the workRequest to include the worker's default channel if it is not set
			if (request.channelId) {
				try {
					const channel = BrokerManager.channelBroker.getObject(request.channelId);
					if (channel) {
						const workerTokenCredentialId = worker.config.channelUserConfig?.[channel.config.subtype];

						if (workerTokenCredentialId) {
							const workerTokenCredential = await CredentialHelper.instance.getSecret(workerTokenCredentialId).catch((error: Error) => {
								this.logger.error(
									`handleRequest() Error getting worker token for worker ${worker.config.id} and channel ${channel.config.id} of type ${channel.config.subtype}`,
									error
								);
								throw error;
							});
							if (!workerTokenCredential?.token) {
								this.logger.error(
									`handleRequest() Worker ${worker.config.id} does not have a token for channel ${channel.config.id} of type ${channel.config.subtype}`
								);
								this.logger.debug(`${jsonStringify(workerTokenCredential)}`);
								throw new Error(
									`Worker ${worker.config.id} does not have a token for channel ${channel.config.id} of type ${channel.config.subtype}`
								);
							}
							let workerToken = workerTokenCredential.token as string;
							// remove any pipes
							workerToken = workerToken.replace(/\|/g, "");

							let channelMessageData = undefined;
							if (request.input[ChannelMessageDataKey]) {
								channelMessageData = jsonParse<Record<string, string>>(request.input[ChannelMessageDataKey] as string);
							}

							await BrokerManager.channelBroker
								.establishSession(channel.config.id!, request.taskExecutionId, channelMessageData)
								.catch((error: Error) => {
									this.logger.error(
										`handleRequest() Error establishing session for channel ${channel.config.id} and taskExecutionId ${request.taskExecutionId}`,
										error
									);
									throw error;
								});
							await BrokerManager.channelBroker.join(channel.config.id!, worker.config.id!, workerToken, worker.config.name, request.taskExecutionId).catch((error: Error) => {
								this.logger.error(
									`handleRequest() Error joining channel ${channel.config.id} and worker ${worker.config.id}`,
									error
								);
								throw error;
							});
						} else {
							this.logger.error(
								`handleRequest() Worker ${worker.config.id} does not have a token for channel ${channel.config.id} of type ${channel.config.subtype}`
							);
							throw new Error(
								`Worker ${worker.config.id} does not have a token for channel ${channel.config.id} of type ${channel.config.subtype}`
							);
						}
					} else {
						this.logger.error(`handleRequest() Channel ${request.channelId} not found`);
					}
				} catch (error) {
					this.logger.error(`handleRequest() Error setting up channel for work request ${request.taskExecutionId}`, error);
					await WorkRequestDb.create({
						id: randomUUID(),
						workerId: request.workerId,
						taskExecutionId: request.taskExecutionId,
						status: "error",
						request: jsonStringify(request),
						response: jsonStringify(error),
					}).then(() => {
						this.logger.debug(`handleRequest() Created error work request ${request.taskExecutionId}`);
						this.failRequest(request, error as Error);
						throw error;
					}).catch((error: Error) => {
						this.logger.error(`handleRequest() Error creating error work request ${request.taskExecutionId}`, error);
					});
				}
			} else {
				this.logger.debug(`handleRequest() No channel specified for work request ${request.taskExecutionId}`);
			}
			const found = await WorkRequestDb.findOne({
				where: {
					taskExecutionId: request.taskExecutionId,
				},
			});
			if (found) {
				this.logger.debug(`handleRequest() Work request ${request.taskExecutionId} already exists`);
				return;
			}
			await WorkRequestDb.create({
				id: randomUUID(),
				workerId: request.workerId,
				taskExecutionId: request.taskExecutionId,
				status: "queued",
				request: jsonStringify(request),
			})
				.then(() => {
					this.logger.debug(`handleRequest() Created work request ${request.taskExecutionId}`);
					worker.queueWork(request).catch((error: Error) => {
						this.logger.error(`handleRequest() Error queueing work request ${request.taskExecutionId}`, error);
						throw error;
					});
				})
				.catch((error: Error) => {
					this.logger.error(`handleRequest() Error creating work request ${request.taskExecutionId}`, error);
					throw error;
				});
		} else {
			this.logger.error(`handleRequest() Worker ${request.workerId} not found`);
		}
	}

	private failRequest(request: WorkRequest, error: Error): void {
		this.logger.error(`failRequest() Failed work request ${request.taskExecutionId}`, error);
		this.respond({
			output: error.message,
			taskExecutionId: request.taskExecutionId,
			taskId: request.taskId,
			timestamp: new Date().getTime(),
			workerId: request.workerId,
		} as WorkResponse);
	}

	request(workRequest: WorkRequest): void {
		this.workRequestSubject.next(workRequest);
	}

	respond(response: WorkResponse): void {
		this.logger.debug(`respond() Responding to work request for task ${response.taskExecutionId}`, response);
		WorkRequestDb.findOne({
			where: {
				taskExecutionId: response.taskExecutionId,
			},
		})
			.then((db) => {
				if (db) {
					const request = JSON.parse(db.request!) as WorkRequest;
					try {
						if (request.channelId) {
							BrokerManager.channelBroker
								.setSessionStatus(request.channelId, request.taskExecutionId, "complete")
								.then(() => {
									this.logger.debug(
										`respond() Set session status for channel ${request.channelId} and taskExecutionId ${request.taskExecutionId}`
									);
									this.handleResponse(db, request, response);
								})
								.catch((error: Error) => {
									this.logger.error(
										`respond() Error setting session status for channel ${request.channelId} and taskExecutionId ${request.taskExecutionId}`,
										error
									);
								});
						} else {
							this.handleResponse(db, request, response);
						}
					} catch (error) {
						if (request.channelId) {
							BrokerManager.channelBroker
								.setSessionStatus(request.channelId, request.taskExecutionId, "error")
								.catch((error: Error) => {
									this.logger.error(
										`respond() Error setting session status for channel ${request.channelId} and taskExecutionId ${request.taskExecutionId}`,
										error
									);
								});
						}
						db.status = "error";
						db.response = jsonStringify(error);
						db.save().catch((error: Error) => {
							this.logger.error(
								`respond() Error saving work request ${request.taskExecutionId}`,
								error
							);
						});
						this.logger.error(
							`respond() Error processing work request ${request.taskExecutionId}`,
							error
						);
						throw error;
					}
				} else {
					this.logger.error(`respond() Work request ${response.taskExecutionId} not found`);
				}
			})
			.catch((error: Error) => {
				this.logger.error(`respond() Error finding work request ${response.taskExecutionId}`, error);
			});
	}

	handleResponse(db: WorkRequestDb, request: WorkRequest, response: WorkResponse): void {
		this.logger.debug(`handleResponse() Completed work request ${request.taskExecutionId}`, response);

		db.status = "complete";
		db.response = jsonStringify(response);

		db.save()
			.then(() => {
				this.logger.debug(`handleResponse() Saved work request ${response.taskExecutionId}`);
				this.workResponseSubject.next(response);
			})
			.catch((error: Error) => {
				this.logger.error(`handleResponse() Error saving work request ${response.taskExecutionId}`);
				throw error;
			});
	}

	subscribe(objectId: string, callback: (response: WorkResponse) => void): Promise<Subscription> {
		return Promise.resolve(this.workResponseSubject.subscribe(callback));
	}

	async remove(workerId: string): Promise<void> {
		this.logger.debug(`remove() Removing worker ${workerId}`);

		await this.objects
			.get(workerId)
			?.destroy()
			.catch((error: Error) => {
				this.logger.error(`remove() Error destroying worker ${workerId}`, error);
			});
		const worker = this.objects.get(workerId);
		if (worker) {
			this.logger.debug(`remove() Removing worker ${workerId} from orgWorkers`);
			const orgWorkers = this.orgWorkers.get(worker.config.orgId);
			if (orgWorkers) {
				this.orgWorkers.set(
					worker.config.orgId,
					orgWorkers.filter((w: Worker) => w.config.id !== workerId)
				);
			}
			if (this.flushDaemons.has(workerId)) {
				clearInterval(this.flushDaemons.get(workerId));
				this.flushDaemons.delete(workerId);
			}
		}
		this.objects.delete(workerId);
	}

	async removeTaskExecution(taskExecutionId: string): Promise<void> {
		this.logger.debug(`removeTaskExecution() Removing taskExecution ${taskExecutionId}`);
		const workRequests = await WorkRequestDb.findAll({
			where: {
				taskExecutionId: taskExecutionId,
			},
		}).catch((error: Error) => {
			this.logger.error(`removeTaskExecution() Error finding work requests for taskExecution ${taskExecutionId}`, error);
		});
		const deletionPromises = workRequests?.map(async (db) => {
			this.objects.get(db.workerId)?.removeTask(taskExecutionId);
			try {
				return await db.destroy();
			} catch (error) {
				this.logger.error(`removeTaskExecution() Error removing work request ${taskExecutionId}`, error);
			}
		});
		await Promise.all(deletionPromises ?? []);
	}

	async destroy(): Promise<void> {
		await Promise.all(Array.from(this.objects.keys()).map((objectId) => this.remove(objectId)));
		this.workRequestSubject.complete();
		this.workResponseSubject.complete();
		this.flushDaemons.forEach((daemon) => {
			clearInterval(daemon);
		});
		this.flushDaemons.clear();
		this.orgWorkers.clear();
	}


	// Gets a worker with the specified skills and channel type
	// Returns the workerId of the worker with the least number of in-progress tasks
	async getWorkerWithSkillsAndChannel(
		orgId: string,
		skills: string[],
		channelType?: ChannelType
	): Promise<string | undefined> {
		this.logger.debug(
			`getWorkerWithSkills() Getting worker with skills ${JSON.stringify(skills)} and channelType ${channelType}`
		);
		let workers = this.orgWorkers.get(orgId)?.filter((worker: Worker) => {
			this.logger.debug(`getWorkerWithSkills() Checking worker ${worker.config.id}`);
			if (worker.config.skills) {
				this.logger.debug(
					`getWorkerWithSkills() Worker ${worker.config.id} has skills ${jsonStringify(worker.config.skills)}`
				);
				for (const skill of skills) {
					if (!worker.config.skills.includes(skill)) {
						this.logger.debug(
							`getWorkerWithSkills() Worker ${worker.config.id} does not have skill ${skill}`
						);
						return false;
					}
				}
			}
			return true;
		});
		if (!workers || workers.length === 0) {
			this.logger.debug(`getWorkerWithSkills() No workers found with skills ${JSON.stringify(skills)}`);
			return undefined;
		}
		if (channelType) {
			workers = workers.filter((worker: Worker) => {
				if (worker.config.channelUserConfig?.[channelType]) {
					return true;
				}
				return false;
			});

			if (!workers || workers.length === 0) {
				this.logger.debug(`getWorkerWithSkills() No workers found with channelType ${channelType}`);
				return undefined;
			}
		}

		const bestWorker = await this.mostAvailableWorker(workers);

		if (!bestWorker) {
			this.logger.debug(`getWorkerWithSkills() no workers available among ${jsonStringify(workers?.map((w) => w.config.id!) ?? [])}`);
			return undefined;
		}

		return bestWorker.config.id;
	}


	async mostAvailableWorker(workers: Worker[]): Promise<Worker | undefined> {
		let bestWorker: Worker | undefined = undefined;
		let bestWorkerAvailability = 0;
		for (const worker of workers) {
			const currentWorker = this.objects.get(worker.config.id!);
			if (currentWorker?.config.wipLimit && currentWorker.config.wipLimit > 0) {
				const currentWorkerAvailability = await this.getWorkerAvailabilityMetric(currentWorker.config.id!, currentWorker.config.wipLimit);
				if (!bestWorker) {
					bestWorker = currentWorker;
					bestWorkerAvailability = currentWorkerAvailability;
				} else {
					if (currentWorkerAvailability > bestWorkerAvailability) {
						bestWorker = currentWorker;
						bestWorkerAvailability = currentWorkerAvailability;
					}
				}
			}

		}
		return bestWorker;
	}

	async getWorkerAvailabilityMetric(workerId: string, capacity: number): Promise<number> {
		const wipCount = await QueueService.getInProgressCount(workerId);

		if (wipCount < capacity) {
			return capacity - wipCount;
		}
		const queuedCount = await QueueService.getQueuedCount(workerId);
		const queuedWeight = 1 / capacity;
		const queuedAvailability = queuedCount * queuedWeight;
		return capacity - wipCount - queuedAvailability;
	}
}

export type WorkerRegistrationArgs = object
