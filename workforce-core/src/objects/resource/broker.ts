import { Subject, Subscription } from "rxjs";
import { BaseBroker, BrokerConfig } from "../base/broker.js";
import { ResourceConfig, ResourceVersion, WriteRequest } from "./model.js";
import { SubjectFactory } from "../../manager/impl/subject_factory.js";
import { Logger } from "../../logging/logger.js";
import { Resource } from "./base.js";
import { ResourceWriteDb } from "./db.resource_write.js";
import { jsonStringify } from "../../util/json.js";
import { randomUUID } from "crypto";
import { ResourceVersionDb } from "./db.resource_version.js";
import { ObjectType } from "../base/factory/types.js";

export class ResourceBroker extends BaseBroker<ResourceConfig, Resource, object> {
	objectType: ObjectType = "resource";
	logger = Logger.getInstance("ResourceBroker");

	private writeSubject = new Subject<WriteRequest>();
	private versionSubject = new Subject<ResourceVersion>();
	private watches = new Map<string, Subscription>();
	private resourceVersionSubjects = new Map<string, Subject<ResourceVersion>>();

	constructor(config: BrokerConfig, writeSubject?: Subject<WriteRequest>, versionSubject?: Subject<ResourceVersion>) {
		super(config);
		if (writeSubject) {
			this.writeSubject = writeSubject;
		}
		if (versionSubject) {
			this.versionSubject = versionSubject;
		}
		this.writeSubject.subscribe({
			next: this.handleWrite.bind(this),
			error: (error: Error) => {
				this.logger.error(`constructor() error handling write error=${error}`);
			},
		});
		this.versionSubject.subscribe({
			next: this.handleVersion.bind(this),
			error: (error: Error) => {
				this.logger.error(`constructor() error handling version error=${error}`);
			},
		});
	}

	static async create(config: BrokerConfig): Promise<ResourceBroker> {
		const { mode } = config;
		const writeSubject = await SubjectFactory.createSubject<WriteRequest>({ channel: "resource.write", mode });
		const versionSubject = await SubjectFactory.createSubject<ResourceVersion>({
			channel: "resource.version",
			mode,
		});
		return new ResourceBroker(config, writeSubject, versionSubject);
	}

	async register(resource: Resource): Promise<void> {
		await super.register(resource);
		const subject = new Subject<ResourceVersion>();

		if (this.resourceVersionSubjects.has(resource.config.id!)) {
			this.resourceVersionSubjects.get(resource.config.id!)?.unsubscribe();
			this.resourceVersionSubjects.delete(resource.config.id!);
		}
		this.resourceVersionSubjects.set(resource.config.id!, subject);
		await this.manageWatches(resource);
	}

	handleWrite(request: WriteRequest): void {
		const resource = this.objects.get(request.resourceId);
		if (resource) {
				this.logger.debug(`handleWrite() Writing to resource ${request.resourceId}`);
				ResourceWriteDb.create({
					id: randomUUID(),
					resourceId: request.resourceId,
					timestamp: Date.now(),
					status: "started",
					data: jsonStringify(request.data),
				})
					.then((db) => {
						this.logger.debug(`handleWrite() Created resource write ${db.id}`);

						this.objects
							.get(request.resourceId)
							?.write(request)
							.then(() => {
								db.status = "success";
								db.save()
									.then(() => {
										this.logger.debug(`handleWrite() Saved resource write ${db.id}`);
									})
									.catch((err) => {
										this.logger.error(`handleWrite() Error saving resource write ${db.id}`, err);
									});
								resource
									.refresh()
									.then(() => {
										this.logger.debug(`handleWrite() Refreshed resource ${request.resourceId}`);
									})
									.catch((err) => {
										this.logger.error(`handleWrite() Error refreshing resource ${request.resourceId}`, err);
									});
							})
							.catch((err) => {
								db.status = "failed";
								db.save()
									.then(() => {
										this.logger.debug(`handleWrite() Saved resource write ${db.id}`);
									})
									.catch((err) => {
										this.logger.error(`handleWrite() Error saving resource write ${db.id}`, err);
									});
								this.logger.error(`handleWrite() Error writing to resource ${request.resourceId}`, err);
							});
					})
					.catch((err) => {
						this.logger.error(`handleWrite() Error creating resource write ${request.resourceId}`, err);
					});

		} else {
			this.logger.error(`handleWrite() Resource ${request.resourceId} not found`);
		}

	}

	async manageWatches(resource: Resource): Promise<void> {
		const watch = await resource
			.watch((resourceVersion: ResourceVersion) => {
				if (resourceVersion.resourceId === resource.config.id) {
					this.versionSubject.next(resourceVersion);
				}
			})
			.catch((err) => {
				this.logger.error(`manageWatches() Error watching resource ${resource.config.id}`, err);
			});
		if (watch) {
			this.watches.get(resource.config.id!)?.unsubscribe();
			this.watches.delete(resource.config.id!);
			this.watches.set(resource.config.id!, watch);
		}
	}

	async remove(resourceId: string): Promise<void> {
		this.logger.debug(`remove() Removing resource ${resourceId}`);
		await this.objects
			.get(resourceId)
			?.destroy()
			.catch((err) => {
				this.logger.error(`remove() Error removing resource ${resourceId}`, err);
			});
		this.objects.delete(resourceId);
		this.watches.get(resourceId)?.unsubscribe();
		this.watches.delete(resourceId);
		this.resourceVersionSubjects.get(resourceId)?.unsubscribe();
		this.resourceVersionSubjects.delete(resourceId);
	}

	async destroy(): Promise<void> {
		await Promise.all(Array.from(this.objects.keys()).map((objectId) => this.remove(objectId)));
		this.writeSubject.complete();
		this.versionSubject.complete();
		for (const watch of this.watches.values()) {
			watch.unsubscribe();
		}
	}

	write(request: WriteRequest): Promise<void> {
		if (this.objects.has(request.resourceId)) {
			this.writeSubject.next(request);
			return Promise.resolve();
		} else {
			throw new Error(`ResourceBroker.write() Resource ${request.resourceId} not found`);
		}
	}

	handleVersion(resourceVersion: ResourceVersion): void {
		const subject = this.resourceVersionSubjects.get(resourceVersion.resourceId);
		if (subject) {
			ResourceVersionDb.create({
				id: randomUUID(),
				resourceId: resourceVersion.resourceId,
				timestamp: Date.now(),
				data: jsonStringify(resourceVersion),
			})
				.then((db) => {
					this.logger.debug(`handleVersion() Created resource version ${db.id}`);
					return db;
				})
				.catch((err) => {
					this.logger.error(
						`handleVersion() Error creating resource version ${resourceVersion.resourceId}`,
						err
					);
					throw err;
				});
			subject.next(resourceVersion);
		} else {
			this.logger.error(`handleVersion() Resource ${resourceVersion.resourceId} not found`);
		}
	}

	async latestVersion(resourceId: string): Promise<ResourceVersion> {
		const resource = this.objects.get(resourceId);
		if (resource) {
			return resource.latestVersion();
		} else {
			throw new Error(`Resource ${resourceId} not found`);
		}
	}

	subscribe(resourceId: string, callback: (resourceVersion: ResourceVersion) => void): Promise<Subscription> {
		const subject = this.resourceVersionSubjects.get(resourceId);
		if (subject) {
			return Promise.resolve(subject.subscribe(callback));
		} else {
			throw new Error(`Resource ${resourceId} not found`);
		}
	}
}
