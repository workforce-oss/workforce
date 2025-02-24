import { Subscription } from "rxjs";
import { CredentialHelper } from "../credential/helper.js";
import { BaseConfig } from "./model.js";
import _ from "lodash";
import { ObjectFactory } from "./factory/object_factory.js";
import { Logger } from "../../logging/logger.js";
import { BaseObject } from "./base.js";
import { FlowDb } from "../flow/db.js";
import { CustomMetrics } from "../../metrics/api.js";
import { BrokerMode } from "../../manager/impl/subject_factory.js";
import { FunctionDocuments, FunctionParameters } from "../../util/openapi.js";
import { ObjectType } from "./factory/types.js";
import { AsyncMap } from "../../manager/impl/cache/async_map.js";
import { MapFactory } from "../../manager/impl/map_factory.js";

export abstract class BaseBroker<TConfig extends BaseConfig, T extends BaseObject<TConfig>, TObjectEvent> {
	config: BrokerConfig;
	objects = new Map<string, T>();
	configCache?: AsyncMap<TConfig>;
	abstract logger: Logger;
	abstract objectType: ObjectType;

	public abstract remove(objectId: string): Promise<void>;
	public abstract subscribe(objectId: string, callback: (e: TObjectEvent) => Promise<void>): Promise<Subscription>;

	constructor(config: BrokerConfig) {
		this.config = config;
		MapFactory.for<TConfig>("config_cache", "objects").then((m) => {
			this.configCache = m;
		}).catch(e => {
			Logger.getInstance("Broker Constructor").warn("error building config cache", e);
		})
	}

	public getObject(objectId: string): T | undefined {
		return this.objects.get(objectId);
	}

	public async getObjectConfig(objectId: string): Promise<TConfig | undefined> {
		return this.configCache?.get(objectId);
	}

	public getObjectSchema(objectId: string, isToolOutput?: boolean): Promise<FunctionDocuments | Record<string, FunctionParameters> | undefined> {
		const object = this.getObject(objectId);
		if (object) {
			return Promise.resolve(object.schema(isToolOutput));
		}
		return Promise.resolve(undefined);
	}

	public getTopLevelObjectKey(objectId: string): string {
		const object = this.getObject(objectId);
		if (object) {
			return object.topLevelObjectKey();
		}
		throw new Error(`BaseBroker.getTopLevelObjectKey() Object ${objectId} not found`);
	}

	protected onFailure(objectId: string, error: string): void {
		const object = this.getObject(objectId);
		if (object) {
			this.logger.error(`onFailure() ${object.config.type} ${object.config.name} with id ${object.config.id} had a critical failure: ${error}`);

			this.remove(objectId).then(() => {
				this.logger.debug(`onFailure() ${object.config.type} ${object.config.name} with id ${object.config.id} removed`);
				this.logger.error(`onFailure() resyncing ${object.config.type} ${object.config.name} with id ${object.config.id}`);
				this.syncObject(object.config).catch((e) => {
					this.logger.error(`onFailure() Error resyncing ${object.config.type} ${object.config.name} with id ${object.config.id}, releasing for autosync`, e);
					this.remove(object.config.id!).catch((e) => {
						this.logger.error(`onFailure() Error removing ${object.config.type} ${object.config.name} with id ${object.config.id}`, e);
					});
				});
			}).catch((e) => {
				this.logger.error(`onFailure() Error removing ${object.config.type} ${object.config.name} with id ${object.config.id}`, e);

			});
		}
	}

	public async register(object: T): Promise<void> {
		this.logger.info(
			`register() Registering ${object.config.type} ${object.config.name} with id ${object.config.id}`
		);
		if (!object.config.id) {
			throw new Error("BaseBroker.register() object.config.id is required");
		}
		if (this.objects.has(object.config.id)) {
			this.logger.warn(
				`register() ${object.config.type} ${object.config.name} with id ${object.config.id} already registered. Replacing.`
			);
			await this.remove(object.config.id);
		}
		this.objects.set(object.config.id, object);
		return Promise.resolve();
	}

	public async syncObject(config: TConfig): Promise<void> {
		// this.logger.info(`syncObject() Syncing ${config.type} ${config.name} with id ${config.id}`);
		if (!config.id) {
			throw new Error("BaseBroker.syncObject() config.id is required");
		}
		const merged = await CredentialHelper.instance.mergeCredential(config, this.objectType);
		const object = this.getObject(config.id);
		if (config.flowId) {
			const flow = await FlowDb.findByPk(config.flowId);
			if (!flow) {
				throw new Error(`BaseBroker.syncObject() Flow ${config.flowId} not found`);
			} else if (flow.status === "inactive") {
				if (object) {
					this.remove(object.config.id!)
						.then(() => {
							this.logger.info(`syncObject() ${this.objectType} ${config.name} with id ${config.id} removed due to inactive flow`);

							CustomMetrics.getInstance().setMetricObjectCount(this.objectType, config.type, getSubtypeCount(this.objects, config.type));
						})
						.catch((e) => {
							this.logger.error(`syncObject() Error removing ${this.objectType} ${config.name} with id ${config.id}`, e);
						});
				}
				return;
			}
		}
		if (!_.isEqual(object?.config, merged)) {
			this.logger.info(`syncObject() ${this.objectType} ${config.name} with id ${config.id} changed. Updating.`);
			if (object?.config.id) {
				await this.remove(object.config.id).then(() => {
					this.logger.debug(`syncObject() ${this.objectType} ${config.name} with id ${config.id} removed`);
				})
					.catch((e) => {
						this.logger.error(`syncObject() Error removing ${config.type} ${config.name} with id ${config.id}`, e);
					});
			}

			const newObject = ObjectFactory.create<TConfig, T>(merged, this.objectType, this.onFailure.bind(this));
			await this.register(newObject);
			CustomMetrics.getInstance().setMetricObjectCount(this.objectType, config.type, getSubtypeCount(this.objects, config.type));
		}
	}

	public abstract destroy(): Promise<void>;
}

function getSubtypeCount(objects: Map<string, BaseObject<BaseConfig>>, subtype: string): number {
	let subtypeCount = 0;
	objects.forEach((obj) => {
		if (obj.config.type === subtype) {
			subtypeCount++;
		}
	});
	return subtypeCount;
}

export interface BrokerConfig { mode: BrokerMode }
