import { randomUUID } from "crypto";
import { InstanceDestroyOptions, JSON, Optional, SaveOptions, UUID, TEXT } from "sequelize";
import { BelongsTo, Column, ForeignKey, Is, IsUUID, Model } from "sequelize-typescript";
import { OutboxManager } from "../../manager/outbox_manager.js";
import { jsonParse, jsonStringify } from "../../util/json.js";
import { BaseConfig } from "./model.js";
import { Outbox } from "./outbox.js";
import { objectTypes, ObjectType, objectSubtypes, ObjectSubtype } from "./factory/types.js";
import { Logger } from "../../logging/logger.js";
import { OrgDb } from "../../identity/db.org.js";
import { SpaceDb } from "../../identity/db.space.js";


export interface BaseModelAttributes {
    id: string;
    orgId: string;
    flowId?: string;
    name: string;
    description: string;
    type: string;
    subtype: string;
    status?: string | null;
}

type BaseModelCreationAttributes = Optional<BaseModelAttributes, "id">

export class BaseModel extends Model<BaseModelAttributes, BaseModelCreationAttributes> {
    @Column({
        type: UUID,
        defaultValue: randomUUID,
        primaryKey: true
    })
    declare id: string;

    @IsUUID(4)
    @ForeignKey(() => OrgDb)
    @Column({
        type: UUID,
        allowNull: false,
    })
    declare orgId: string;

    @BelongsTo(() => OrgDb)
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
        unique: "flowName"
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

    @Is("type", (value: string) => {
        const type = objectTypes.find((type: ObjectType) => type === value);
        if (!type) {
            throw new Error("Invalid type");
        }
    })
    @Column({
        type: TEXT,
        allowNull: false
    })
    declare type: string;

    @Is("subtype", (value: string) => {
        const subtype = objectSubtypes.find((subtype: ObjectSubtype) => subtype === value);
        if (!subtype) {
            throw new Error("Invalid subtype");
        }
    })
    @Column({
        type: TEXT,
        allowNull: false
    })
    declare subtype: string;

    @Column({
        type: JSON,
    })
    declare variables?: string;

    @Column({
        type: TEXT,
        allowNull: true,
    })
    declare status?: string | null;


    public toModel(): BaseConfig {
        const model: BaseConfig = {
            id: this.id,
            orgId: this.orgId,
            name: this.name,
            description: this.description,
            type: this.type as ObjectType,
            subtype: this.subtype as ObjectSubtype,
        }

        const variables = jsonParse<Record<string, unknown>>(this.variables);
        if (variables) {
            model.variables = variables;
        }

        return model;
    }

    public loadModel(model: BaseConfig): BaseModel {
        if (model.id) {
            this.id = model.id;
        }
        this.orgId = model.orgId;
        this.name = model.name;
        this.description = model.description;
        this.type = model.type;
        this.subtype = model.subtype;
        if (model.variables) {
            this.variables = jsonStringify(model.variables);
        } else {
            this.variables = undefined
        }
        return this;
    }

    public async save(options?: SaveOptions<BaseModelAttributes>): Promise<this> {
        const t = await this.sequelize?.transaction(async (t) => {
            Logger.getInstance(`baseModel`).info(`Saving object: ${jsonStringify(this)}`);
            const original = await super.save({ transaction: t, ...options });
            const outbox = await Outbox.create({
                type: this.type,
                objectId: this.id,
                eventType: "update"
            }, { transaction: t });

            const outboxManager = await OutboxManager.instance();
            outboxManager.next({
                eventId: outbox.id,
                type: this.type,
                objectId: this.id,
                eventType: "update"
            });

            return original;
        });
        return t;
    }

    public async destroy(options?: InstanceDestroyOptions): Promise<void> {
        await this.sequelize?.transaction(async (t) => {
            await super.destroy({ transaction: t, ...options });
            const outbox = await Outbox.create({
                type: this.type,
                objectId: this.id,
                eventType: "delete",
            }, { transaction: t });
            const outboxManager = await OutboxManager.instance();
            outboxManager.next({
                eventId: outbox.id,
                type: this.type,
                objectId: this.id,
                eventType: "delete"
            });
        });
    }
}


export interface BaseObjectInstanceAttributes {
    id: string;
    orgId: string;
    objectId: string;
    status: string;
}

export type BaseObjectInstanceCreationAttributes = Optional<BaseObjectInstanceAttributes, "id">


export class BaseObjectInstance extends Model<BaseObjectInstanceAttributes, BaseObjectInstanceCreationAttributes> {
    @Column({
        type: UUID,
        defaultValue: randomUUID,
        primaryKey: true
    })
    declare id: string;

    @IsUUID(4)
    @ForeignKey(() => OrgDb)
    @Column({
        type: UUID,
        allowNull: false,
    })
    declare orgId: string;

    @BelongsTo(() => OrgDb)
    declare org: Awaited<OrgDb>;

    @IsUUID(4)
    @Column({
        type: UUID,
        allowNull: false,
    })
    declare objectId: string;

    @Is("status", (value: string) => {
        if (value.length > 255) {
            throw new Error("Status must be less than 255 characters");
        }
    })
    @Column({
        type: TEXT,
        allowNull: false,
    })
    declare status: string;

    public toModel(): BaseObjectInstanceAttributes {
        return {
            id: this.id,
            orgId: this.orgId,
            objectId: this.objectId,
            status: this.status
        }
    }

    public loadModel(model: BaseObjectInstanceAttributes): BaseObjectInstance {
        this.orgId = model.orgId;
        this.objectId = model.objectId;
        this.status = model.status;
        return this;
    }
}

