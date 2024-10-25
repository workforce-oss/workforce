import { randomUUID } from "crypto";
import _ from "lodash";
import { InstanceDestroyOptions, Optional, SaveOptions, TEXT, UUID } from "sequelize";
import { BelongsTo, Column, ForeignKey, HasMany, Is, IsUUID, Model, Table } from "sequelize-typescript";
import { OutboxManager } from "../../manager/outbox_manager.js";
import { BaseModel } from "../base/db.js";
import { BaseConfig } from "../base/model.js";
import { Outbox } from "../base/outbox.js";
import { ChannelDb } from "../channel/db.js";
import { CredentialHelper } from "../credential/helper.js";
import { DocumentationDb } from "../documentation/db.js";
import { DocumentationConfig } from "../documentation/model.js";
import { ResourceDb } from "../resource/db.js";
import { TaskDb } from "../task/db.js";
import { TaskConfig } from "../task/model.js";
import { ToolDb } from "../tool/db.js";
import { TrackerDb } from "../tracker/db.js";
import { mapDocumentationIdsToNames, mapDocumentationNamesToIds } from "./db.documentation.js";
import { mapSubtaskNamesToIds, mapTaskIdsToNames, mapTaskNamesToIds } from "./db.task.js";
import { FlowConfig } from "./model.js";
import { mapToolIdsToNames, mapToolNamesToIds } from "./db.tool.js";
import { ToolConfig } from "../tool/model.js";
import { OrgDb } from "../../identity/db.org.js";
import { SpaceDb } from "../../identity/db.space.js";
import { ObjectType } from "../../model.js";

export interface BaseModelAttributes {
	id: string;
	orgId: string;
	name: string;
	description: string;
	status: "active" | "inactive";
}

type BaseModelCreationAttributes = Optional<BaseModelAttributes, "id">

@Table({
	tableName: "flows",
	indexes: [
		{
			unique: true,
			fields: ["orgId", "name"],
		},
	],
})
export class FlowDb extends Model<BaseModelAttributes, BaseModelCreationAttributes> {
	@Column({
		type: UUID,
		defaultValue: randomUUID,
		primaryKey: true,
	})
	declare id: string;

	@IsUUID(4)
	@ForeignKey(() => OrgDb)
	@Column({
		type: UUID,
		allowNull: false,
	})
	declare orgId: string;

	@BelongsTo(() => OrgDb, "orgId")
	declare org: Awaited<OrgDb>;

	@ForeignKey(() => SpaceDb)
	@Column({
		type: UUID,
		allowNull: true,
	})
	declare spaceId: string;

	@BelongsTo(() => SpaceDb)
	declare space: Awaited<SpaceDb>;

	@Is("name", (value: string) => {
		if (value.length > 255) {
			throw new Error("Name must be less than 255 characters");
		}
	})
	@Column({
		type: TEXT,
		allowNull: false,
		unique: "orgFlowName",
	})
	declare name: string;

	@Is("description", (value: string) => {
		if (value.length > 2048) {
			throw new Error("Description must be less than 2048 characters");
		}
	})
	@Column({
		type: TEXT,
	})
	declare description: string;

	@Column({
		type: TEXT,
		allowNull: false,
		defaultValue: "inactive",
	})
	declare status: "active" | "inactive";

	@HasMany(() => TaskDb, { onDelete: "CASCADE" })
	declare tasks?: TaskDb[];

	@HasMany(() => DocumentationDb, { onDelete: "CASCADE", })
	declare documentation?: DocumentationDb[];

	@HasMany(() => ChannelDb, { onDelete: "CASCADE" })
	declare channels?: ChannelDb[];

	@HasMany(() => ResourceDb, { onDelete: "CASCADE" })
	declare resources?: ResourceDb[];

	@HasMany(() => ToolDb, { onDelete: "CASCADE" })
	declare tools?: ToolDb[];

	@HasMany(() => TrackerDb, { onDelete: "CASCADE" })
	declare trackers?: TrackerDb[];

	public async toModel(args?: { replaceIdsWithNames?: boolean }): Promise<FlowConfig> {
		const model: FlowConfig = {
			id: this.id,
			name: this.name,
			description: this.description,
			orgId: this.orgId,
			status: this.status,
		};
		if (this.channels) {
			model.channels = this.channels?.map((c) => c.toModel());
		}
		if (this.documentation) {
			model.documentation = this.documentation.map((d) => d.toModel());
		}
		if (this.resources) {
			model.resources = this.resources.map((r) => r.toModel());
		}

		if (this.tools) {
			model.tools = this.tools.map((t) => t.toModel());
		}
		if (this.trackers) {
			model.trackers = this.trackers.map((t) => t.toModel());
		}

		if (this.tasks) {
			model.tasks = this.tasks.map((t) => t.toModel());
		}

		if (args?.replaceIdsWithNames) {
			await this.mapIdsToNames(model.channels, "channel");
			await this.mapIdsToNames(model.documentation, "documentation");
			await this.mapIdsToNames(model.resources, "resource");
			await this.mapIdsToNames(model.tools, "tool");
			await this.mapIdsToNames(model.trackers, "tracker");
			await this.mapIdsToNames(model.tasks, "task");
		}
		return model;
	}

	public async loadModel(model: FlowConfig): Promise<FlowDb> {
		this.name = model.name;
		this.description = model.description;
		this.orgId = model.orgId;
		this.status = model.status;
		model = _.cloneDeep(model);

		this.channels = await this.sync(model.channels ?? [], (flowId: string) => ChannelDb.findAll({ where: { flowId: flowId } }), this.id, ChannelDb, "channel");
		this.documentation = await this.sync(model.documentation ?? [], (flowId: string) => DocumentationDb.findAll({ where: { flowId: flowId }, include: { all: true} }), this.id, DocumentationDb, "documentation");
		this.resources = await this.sync(model.resources ?? [], (flowId: string) => ResourceDb.findAll({ where: { flowId: flowId } }), this.id, ResourceDb, "resource");
		this.tools = await this.sync(model.tools ?? [], (flowId: string) => ToolDb.findAll({ where: { flowId: flowId } }), this.id, ToolDb, "tool");
		this.trackers = await this.sync(model.trackers ?? [], (flowId: string) => TrackerDb.findAll({ where: { flowId: flowId } }), this.id, TrackerDb, "tracker");
		this.tasks = await this.sync(model.tasks ?? [], (flowId: string) => TaskDb.findAll({ where: { flowId: flowId } }), this.id, TaskDb, "task");
		return this;
	}

	public async save(options?: SaveOptions<BaseModelAttributes>): Promise<this> {
		const original = await this.sequelize?.transaction(async (t) => {
			const original = await super.save({ transaction: t, ...options });
			const outbox = await Outbox.create(
				{
					type: "flow",
					objectId: this.id,
					eventType: "update",
				},
				{ transaction: t }
			);
			const outboxManager = await OutboxManager.instance();

			outboxManager.next({
				eventId: outbox.id,
				type: "flow",
				objectId: this.id,
				eventType: "update",
			});

			return original;
		});

		for (const channel of this.channels ?? []) {
			await channel.save();
		}
		for (const documentation of this.documentation ?? []) {
			await documentation.save();
		}
		for (const resource of this.resources ?? []) {
			await resource.save();
		}
		for (const tool of this.tools ?? []) {
			await tool.save();
		}
		for (const tracker of this.trackers ?? []) {
			await tracker.save();
		}
		// Tasks need to be saved last because they have foreign keys to other objects
		for (const task of this.tasks ?? []) {
			await task.save();
		}
		// Save a second time with updated subtaskIds
		if (this.tasks) {
			const configs = this.tasks.map(t => t.toModel())
			mapSubtaskNamesToIds({ configs, taskDbs: this.tasks });
			for (const task of this.tasks) {
				await task.save();
			}
		}

		return original;
	}

	public async sync<TConfig extends BaseConfig, TModel extends BaseModel>(
		objects: TConfig[],
		findAll: (flowId: string) => Promise<TModel[]>,
		flowId: string,
		Model: new () => TModel,
		objectType: ObjectType
	): Promise<TModel[]> {
		await this.mapNamesToIds(objects, objectType);
		const foundObjects = await findAll(flowId);
		const synced = await this.syncModels(objects, foundObjects, Model);
		if (synced) {
			return synced;
		}

		return objects.map((c) => new Model().loadModel({ ...c, flowId: flowId, orgId: this.orgId })) as TModel[];

	}

	public async syncModels<TConfig extends BaseConfig, TModel extends BaseModel>(
		models: TConfig[],
		foundModels: TModel[],
		Model: new () => TModel
	): Promise<TModel[] | undefined> {

		if (foundModels && foundModels.length > 0) {
			const modelsToDelete = foundModels.filter((c) => !models.find((ch) => ch.name === c.name || (ch.id && ch.id === c.id)));
			const matchedModels = foundModels.filter((c) => models.find((ch) => ch.name === c.name || (ch.id && ch.id === c.id)));
			//update matched models
			for (const matchedModel of matchedModels) {
				const modelConfig = models.find((c) => c.name === matchedModel.name || (c.id && c.id === matchedModel.id));
				if (modelConfig) {
					matchedModel.loadModel({ ...modelConfig, flowId: this.id, orgId: this.orgId });
				}
			}
			//delete models
			for (const model of modelsToDelete) {
				await model.destroy();
			}
			//new models
			const newModelConfigs = models.filter((c) => !foundModels.find((ch) => ch.name === c.name || (ch.id && ch.id === c.id)));
			const newModels = newModelConfigs.map((c) =>
				new Model().loadModel({ ...c, flowId: this.id, orgId: this.orgId })
			);
			return [...matchedModels, ...newModels] as TModel[];
		}
	}

	private async mapNamesToIds<T extends BaseConfig>(configs: T[], objectType: ObjectType): Promise<void> {
		// check if type is TaskConfig[]
		if (!configs || configs.length === 0) {
			return;
		}
		if (objectType === "task") {
			await mapTaskNamesToIds({
				configs: configs as TaskConfig[],
				orgId: this.orgId,
				channels: this.channels,
				resources: this.resources,
				trackers: this.trackers,
				flowTools: this.tools,
				flowDocumentation: this.documentation,
			});
			mapSubtaskNamesToIds({
				configs: configs as TaskConfig[],
				taskDbs: this.tasks ?? []
			})
		} else if (objectType === "documentation") {
			await mapDocumentationNamesToIds(configs as DocumentationConfig[], this.orgId);
		} else if (objectType === "tool") {
			await mapToolNamesToIds({
				configs: configs as ToolConfig[],
				channels: this.channels,
				orgId: this.orgId
			});
		} else {
			for (const config of configs) {
				await CredentialHelper.instance.replaceCredentialNameWithId(config, this.orgId);
			}
		}
	}

	private async mapIdsToNames<T extends BaseConfig>(configs?: T[], objectType?: ObjectType): Promise<void> {
		// check if type is TaskConfig[]
		if (!configs || configs.length === 0) {
			return;
		}
		if (objectType === "task") {
			await mapTaskIdsToNames({
				configs: configs as TaskConfig[],
				channels: this.channels,
				resources: this.resources,
				trackers: this.trackers,
				flowTools: this.tools,
				flowDocumentation: this.documentation,

			});
		} else if (objectType === "documentation") {
			await mapDocumentationIdsToNames(configs as DocumentationConfig[], this.orgId);
		} else if (objectType === "tool") {
			await mapToolIdsToNames({
				configs: configs as ToolConfig[],
				channels: this.channels
			});
		} else {
			for (const config of configs) {
				await CredentialHelper.instance.replaceCredentialIdWithName(config);
			}
		}
	}

	public async destroy(options?: InstanceDestroyOptions): Promise<void> {
		await this.sequelize?.transaction(async (t) => {
			await super.destroy({ transaction: t, ...options });
			const outbox = await Outbox.create(
				{
					type: "flow",
					objectId: this.id,
					eventType: "delete",
				},
				{ transaction: t }
			);
			const outboxManager = await OutboxManager.instance();

			outboxManager.next({
				eventId: outbox.id,
				type: "flow",
				objectId: this.id,
				eventType: "delete",
			});
		});
	}
}
