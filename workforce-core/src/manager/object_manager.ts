import { Subscription } from "rxjs";
import { Logger } from "../logging/logger.js";
import { BaseConfig, DocumentRepositoryConfig } from "../model.js";
import { BaseObject } from "../objects/base/base.js";
import { BaseBroker } from "../objects/base/broker.js";
import { OutboxEvent } from "../objects/base/outbox.js";
import { ChannelDb } from "../objects/channel/db.js";
import { DocumentRepositoryDb } from "../objects/document_repository/db.js";
import { FlowDb } from "../objects/flow/db.js";
import { FlowConfig } from "../objects/flow/model.js";
import { ResourceDb } from "../objects/resource/db.js";
import { TaskDb } from "../objects/task/db.js";
import { ToolDb } from "../objects/tool/db.js";
import { TrackerDb } from "../objects/tracker/db.js";
import { WorkerDb } from "../objects/worker/db.js";
import { WorkerConfig } from "../objects/worker/model.js";
import { BrokerManager } from "./broker_manager.js";
import { OutboxManager } from "./outbox_manager.js";

export class ObjectManager {
	private flows: Map<string, FlowConfig> = new Map<string, FlowConfig>();
	private documentRepositories: Set<string> = new Set<string>();
	private workers: Set<string> = new Set<string>();
	private _limit = 100;
	private _maxIterations = 10000;
	private outboxSubscription?: Subscription;
	private logger = Logger.getInstance("ObjectManager");
	private _reconcileInterval = 30000;

	static async create(): Promise<ObjectManager> {
		Logger.getInstance("ObjectManager").debug("create()");
		const manager = new ObjectManager();
		await BrokerManager.init();
		const outboxManager = await OutboxManager.instance();
		manager.startReconcile();
		manager.outboxSubscription = outboxManager.subscribe((event: OutboxEvent) => {
			manager.handleOutBoxEvent(event).catch((e) => {
				Logger.getInstance("ObjectManager").error("Error handling outbox event", e);
			})
		});
		Logger.getInstance("ObjectManager").debug("create() done");

		return manager;
	}

	public startReconcile(): void {
		this.reconcileDocumentRepositories();
		this.reconcileFlows();
		this.reconcileWorkers();
	}

	public reconcileFlows(): void {
		this.syncFlows()
			.catch((e) => {
				this.logger.error("reconcile() Error reconciling flows", e);
			}).finally(() => {
				setTimeout(() => {
					this.reconcileFlows();
				}, this._reconcileInterval);
			});
	}

	public reconcileDocumentRepositories(): void {
		this.syncDocumentRepositories()
			.catch((e) => {
				this.logger.error("reconcile() Error reconciling document repositories", e);
			}
			).finally(() => {
				setTimeout(() => {
					this.reconcileDocumentRepositories();
				}, this._reconcileInterval);
			});
	}

	public reconcileWorkers(): void {
		this.syncWorkers()
			.catch((e) => {
				this.logger.error("reconcile() Error reconciling workers", e);
			}).finally(() => {
				setTimeout(() => {
					this.reconcileWorkers();
				}, this._reconcileInterval);
			});
	}

	private async handleOutBoxEvent(event: OutboxEvent): Promise<void> {
		this.logger.debug("handleOutBoxEvent()", event);
		if (event.eventType === "update") {
			switch (event.type) {
				case "flow": {
					const flow = await FlowDb.findByPk(event.objectId, { include: [{ all: true, separate: true }] });
					if (!flow) {
						return;
					}
					if (flow.status === "inactive") {
						await this.deactivateFlow(await flow.toModel());
					} else {
						await this.syncFlow(await flow.toModel());
					}
					break;
				}
				case "channel": {
					const channel = await ChannelDb.findByPk(event.objectId);
					if (!channel) {
						return;
					}
					await this.syncObject(channel.toModel(), BrokerManager.channelBroker);
					break;
				}
				case "document_repository": {
					const documentRepository = await DocumentRepositoryDb.findByPk(event.objectId);
					if (!documentRepository) {
						return;
					}
					await this.syncDocumentRepository(documentRepository.toModel());
					break;
				}
				case "tool": {
					const tool = await ToolDb.findByPk(event.objectId);
					if (!tool) {
						return;
					}
					await this.syncObject(tool.toModel(), BrokerManager.toolBroker);
					break;
				}
				case "worker": {
					const worker = await WorkerDb.findByPk(event.objectId);
					if (!worker) {
						return;
					}
					await this.syncWorker(worker.toModel());
					break;
				}
				case "resource": {
					const resource = await ResourceDb.findByPk(event.objectId);
					if (!resource) {
						return;
					}
					await this.syncObject(resource.toModel(), BrokerManager.resourceBroker);
					break;
				}
				case "task": {
					const task = await TaskDb.findByPk(event.objectId);
					if (!task) {
						return;
					}
					await this.syncObject(task.toModel(), BrokerManager.taskBroker);
					break;
				}
				case "tracker": {
					const tracker = await TrackerDb.findByPk(event.objectId);
					if (!tracker) {
						return;
					}
					await this.syncObject(tracker.toModel(), BrokerManager.trackerBroker);
					break;
				}
				default:
					break;
			}
		} else if (event.eventType === "delete") {
			switch (event.type) {
				case "flow": {
					const flow = await FlowDb.findByPk(event.objectId, { include: [{ all: true, separate: true }] });
					for (const channel of flow?.channels ?? []) {
						BrokerManager.channelBroker.remove(channel.id).catch((e) => {
							this.logger.error("Error removing channel", e);
						});
					}
					for (const tool of flow?.tools ?? []) {
						BrokerManager.toolBroker.remove(tool.id).catch((e) => {
							this.logger.error("Error removing tool", e);
						});
					}
					for (const resource of flow?.resources ?? []) {
						BrokerManager.resourceBroker.remove(resource.id).catch((e) => {
							this.logger.error("Error removing resource", e);
						});
					}
					for (const task of flow?.tasks ?? []) {
						BrokerManager.taskBroker.remove(task.id).catch((e) => {
							this.logger.error("Error removing task", e);
						});
					}
					for (const tracker of flow?.trackers ?? []) {
						BrokerManager.trackerBroker.remove(tracker.id).catch((e) => {
							this.logger.error("Error removing tracker", e);
						});
					}
					this.flows.delete(event.objectId);
					break;

				}
				case "channel":
					BrokerManager.channelBroker.remove(event.objectId).catch((e) => {
						this.logger.error("Error removing channel", e);
					});
					break;
				case "document_repository":
					BrokerManager.documentRepositoryBroker.remove(event.objectId).catch((e) => {
						this.logger.error("Error removing document repository", e);
					});
					break;
				case "tool":
					BrokerManager.toolBroker.remove(event.objectId).catch((e) => {
						this.logger.error("Error removing tool", e);
					});
					break;
				case "worker":
					BrokerManager.workerBroker.remove(event.objectId).catch((e) => {
						this.logger.error("Error removing worker", e);
					});
					break;
				case "resource":
					BrokerManager.resourceBroker.remove(event.objectId).catch((e) => {
						this.logger.error("Error removing resource", e);
					});
					break;
				case "task":
					BrokerManager.taskBroker.remove(event.objectId).catch((e) => {
						this.logger.error("Error removing task", e);
					});
					break;
				case "tracker":
					BrokerManager.trackerBroker.remove(event.objectId).catch((e) => {
						this.logger.error("Error removing tracker", e);
					});
					break;
				default:
					break;
			}
		}
	}

	public async syncFlows(): Promise<void> {
		let iterations = 0;
		// Load all active flows
		let flows = await FlowDb.findAll({
			include: [{ all: true }],
			where: {
				status: "active",
			},
			limit: this._limit,
			offset: iterations * this._limit,
		});
		while (flows && flows.length > 0 && iterations < this._maxIterations) {
			await Promise.allSettled(
				flows.map(async (flow) => {
					await this.syncFlow(await flow.toModel());
				})
			);
			iterations++;
			flows = await FlowDb.findAll({
				include: [{ all: true }],
				where: {
					status: "active",
				},
				limit: this._limit,
				offset: iterations * this._limit,
			});
		}

		// Deactivate all inactive flows
		flows = await FlowDb.findAll({
			include: [{ all: true }],
			where: {
				status: "inactive",
			},
			limit: this._limit,
			offset: iterations * this._limit,
		});
		while (flows && flows.length > 0 && iterations < this._maxIterations) {
			await Promise.allSettled(
				flows.map(async (flow) => {
					await this.deactivateFlow(await flow.toModel());
				})
			);
			iterations++;
			flows = await FlowDb.findAll({
				include: [{ all: true }],
				where: {
					status: "inactive",
				},
				limit: this._limit,
				offset: iterations * this._limit,
			});
		}

		this.logger.debug("syncFlows() done");
	}

	public async deactivateFlow(flow: FlowConfig): Promise<void> {
		if (!this.flows.has(flow.id!)) {
			return;
		}
		flow.channels = [];
		flow.resources = [];
		flow.tools = [];
		flow.trackers = [];
		flow.tasks = [];
		await this.syncFlow(flow);
		this.flows.delete(flow.id!);
	}

	public async syncFlow(flow: FlowConfig): Promise<void> {
		await this.syncChannels(flow);
		await this.syncTools(flow);
		await this.syncResources(flow);
		await this.syncTrackers(flow);
		await this.syncTasks(flow);
		this.flows.set(flow.id!, flow);
	}

	public async syncObjects(newObjects: BaseConfig[], oldObjects: BaseConfig[], broker?: BaseBroker<BaseConfig, BaseObject<BaseConfig>, object>) {
		if (!broker) {
			throw new Error("Broker not initialized");
		}

		const existingObjectIds = oldObjects.map(o => o.id);
		const newObjectIds = newObjects.map(o => o.id);
		const removedObjectIds = existingObjectIds.filter(id => !newObjectIds.includes(id));
		
		if (removedObjectIds.length > 0) {
			this.logger.debug(`syncObjects() Old object ids: ${JSON.stringify(existingObjectIds)}`);
			this.logger.debug(`syncObjects() New object ids: ${JSON.stringify(newObjectIds)}`);
			this.logger.debug(`syncObjects() Removed object ids: ${JSON.stringify(removedObjectIds)}`);
		}

		const removalPromises = [];
		for (const id of removedObjectIds) {
			if (!id) {
				continue;
			}
			this.logger.debug(`syncObjects() Removing object ${id}`);
			removalPromises.push(broker.remove(id).catch((e) => {
				this.logger.error("Error removing object", e);
			}));

			await Promise.allSettled(removalPromises);
		}

		const syncPromises = [];
		for (const config of newObjects) {
			syncPromises.push(broker.syncObject(config));
		}

		return Promise.allSettled(syncPromises);
	}

	public syncObject(config: BaseConfig, broker?: BaseBroker<BaseConfig, BaseObject<BaseConfig>, object>) {
		if (!broker) {
			throw new Error("Broker not initialized");
		}
		return broker.syncObject(config);
	}

	private async syncChannels(flow: FlowConfig): Promise<void> {
		await this.syncObjects(flow.channels ?? [], this.flows.get(flow.id!)?.channels ?? [], BrokerManager.channelBroker);
	}


	private async syncResources(flow: FlowConfig): Promise<void> {
		await this.syncObjects(flow.resources ?? [], this.flows.get(flow.id!)?.resources ?? [], BrokerManager.resourceBroker);
	}

	private async syncTasks(flow: FlowConfig): Promise<void> {
		await this.syncObjects(flow.tasks ?? [], this.flows.get(flow.id!)?.tasks ?? [], BrokerManager.taskBroker);
	}

	private async syncTrackers(flow: FlowConfig): Promise<void> {
		await this.syncObjects(flow.trackers ?? [], this.flows.get(flow.id!)?.trackers ?? [], BrokerManager.trackerBroker);
	}

	private async syncTools(flow: FlowConfig): Promise<void> {
		await this.syncObjects(flow.tools ?? [], this.flows.get(flow.id!)?.tools ?? [], BrokerManager.toolBroker);
	}

	private async syncDocumentRepositories(): Promise<void> {
		const documentRepositories = await DocumentRepositoryDb.findAll({
			include: [{ all: true }],
		});
		const documentRepositoriesToRemove = [];
		for (const documentRepositoryId of this.documentRepositories) {
			if (!documentRepositories.find(d => d.id === documentRepositoryId)) {
				documentRepositoriesToRemove.push(documentRepositoryId);
			}
		}

		const removalPromises = [];
		for (const id of documentRepositoriesToRemove) {
			removalPromises.push(BrokerManager.documentRepositoryBroker.remove(id).catch((e) => {
				this.logger.error("Error removing document repository", e);
			}));
		}

		await Promise.allSettled(removalPromises);

		for (const id of documentRepositoriesToRemove) {
			this.documentRepositories.delete(id);
		}
		
		const syncPromises = [];
		for (const config of documentRepositories || []) {
			syncPromises.push(this.syncDocumentRepository(config.toModel()));
			this.documentRepositories.add(config.id);
		}
		return Promise.allSettled(syncPromises).then(() => {
			this.logger.debug("syncDocumentRepositories() done");
		});
	}

	private syncDocumentRepository(documentRepository: DocumentRepositoryConfig): Promise<void> {
		if (!BrokerManager?.documentRepositoryBroker) {
			this.logger.error("Document repository broker not initialized");
			throw new Error("Document repository broker not initialized");
		}
		return BrokerManager.documentRepositoryBroker.syncObject(documentRepository).catch((e) => {
			this.logger.error(`syncDocumentRepository() Error syncing document repository ${documentRepository.name}, ${e}`);
		});
	}

	private async syncWorkers(): Promise<void> {
		if (!BrokerManager?.workerBroker || !BrokerManager.channelBroker || !BrokerManager.toolBroker) {
			throw new Error("Worker broker not initialized");
		}

		const workers = await WorkerDb.findAll({
			include: [{ all: true }],
		});

		const workersToRemove = [];
		for (const workerId of this.workers) {
			if (!workers.find(w => w.id === workerId)) {
				workersToRemove.push(workerId);
			}
		}

		const removalPromises = [];

		for (const id of workersToRemove) {
			removalPromises.push(BrokerManager.workerBroker.remove(id).catch((e) => {
				this.logger.error("Error removing worker", e);
			}));
		}

		await Promise.allSettled(removalPromises);

		for (const id of workersToRemove) {
			this.workers.delete(id);
		}

		const syncPromises = [];

		for (const config of workers || []) {
			syncPromises.push(this.syncWorker(config.toModel()));
			this.workers.add(config.id);
		}
		return Promise.allSettled(syncPromises).then(() => { 
			this.logger.debug("syncWorkers() done");
		});
	}

	private syncWorker(worker: WorkerConfig): Promise<void> {
		if (!BrokerManager?.workerBroker || !BrokerManager.channelBroker) {
			throw new Error("Worker broker not initialized");
		}
		return BrokerManager.workerBroker.syncObject(worker);
	}

}
