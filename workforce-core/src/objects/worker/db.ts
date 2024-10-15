import { INTEGER, JSON, UUID } from "sequelize";
import { Column, ForeignKey, HasMany, HasOne, Table } from "sequelize-typescript";
import { Logger } from "../../logging/logger.js";
import { jsonParse, jsonStringify } from "../../util/json.js";
import { BaseModel } from "../base/db.js";
import { WorkerConfig, WorkerType } from "./model.js";
import { CredentialDb } from "../credential/db.js";
import { WorkRequestDb } from "./db.work_request.js";

@Table({
    tableName: "workers",
    indexes: [
        {
            unique: true,
            fields: ["orgId", "name"]
        }
    ]
})
export class WorkerDb extends BaseModel {
    @ForeignKey(() => CredentialDb)
    @Column({
        type: UUID,
		allowNull: true,
    })
    declare credentialId?: string | null;

    @HasOne(() => CredentialDb, "credentialId")
    declare credential?: Awaited<CredentialDb> | null;

    @HasMany(() => WorkRequestDb, {onDelete: "CASCADE", foreignKey: "workerId"})
    declare workRequests?: WorkRequestDb[];
    
    @Column({
        type: JSON,
        allowNull: true
    })
    declare channelUserConfig?: string | null;

    @Column({
        type: JSON,
        allowNull: true
    })
    declare skills?: string[] | null;

    @Column({
        type: INTEGER,
        allowNull: true
    })
    declare maxConcurrentTasks?: number | null;

    public toModel(): WorkerConfig {
        const base = super.toModel();
        const model: WorkerConfig = {
            ...base,
            subtype: this.subtype as WorkerType,
        };
        if (this.credentialId) {
            model.credential = this.credentialId;
        }

        if (this.channelUserConfig) {
            model.channelUserConfig = jsonParse(this.channelUserConfig);
        }
        if (this.skills) {
            model.skills = this.skills;
            model.skills.sort();
        }
        if (this.maxConcurrentTasks) {
            model.wipLimit = this.maxConcurrentTasks;
        }
        return model;
    }

    public loadModel(model: WorkerConfig): WorkerDb {
        Logger.getInstance("WorkerDb").debug("WorkerDb.loadModel", model);
        super.loadModel(model);
        if (model.id) {
            this.id = model.id;
        }
        this.credentialId = model.credential ?? null;
        this.channelUserConfig = model.channelUserConfig ? jsonStringify(model.channelUserConfig) : null;
        this.skills = model.skills ?? null;
        this.maxConcurrentTasks = model.wipLimit ?? null;
        return this;
    }
}