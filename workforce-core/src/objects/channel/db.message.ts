import { randomUUID } from "crypto";
import { JSON, Optional, TEXT, UUID } from "sequelize";
import { BelongsTo, Column, ForeignKey, Model, Table } from "sequelize-typescript";
import { jsonParse, jsonStringify } from "../../util/json.js";
import { TaskExecutionDb } from "../task/db.task_execution.js";
import { ChannelDb } from "./db.js";
import { ChannelMessage, ChannelMessageStatus } from "./model.js";

interface ChannelMessageAttributes {
    id: string;
    channelId: string;
    taskExecutionId: string;
    request?: string;
    response?: string;
    status?: string;
}

type ChannelMessageCreationAttributes = Optional<ChannelMessageAttributes, "id">

@Table({
    tableName: "channel_messages",
})
export class ChannelMessageDb extends Model<ChannelMessageAttributes, ChannelMessageCreationAttributes> {
    @Column({
        type: UUID,
        defaultValue: randomUUID,
        primaryKey: true
    })
    declare id: string;
    
    @ForeignKey(() => ChannelDb)
    @Column({
        type: UUID,
        allowNull: false,
    })
    declare channelId: string;

    @BelongsTo(() => ChannelDb, "channelId")
    declare channel: Awaited<ChannelDb>;

    @ForeignKey(() => TaskExecutionDb)
    @Column({
        type: UUID,
        allowNull: false,
    })
    declare taskExecutionId: string;

    @BelongsTo(() => TaskExecutionDb, {onDelete: "CASCADE", foreignKey: "taskExecutionId", hooks: true})
    declare taskExecution: Awaited<TaskExecutionDb>;

    @Column({
        type: TEXT,
    })
    declare status: string;

    @Column({
        type: JSON,
    })
    declare request: string;

    @Column({
        type: JSON,
        allowNull: true,
    })
    declare response?: string | null;

    public toModel(): ChannelMessage {
        return {
            id: this.id,
            channelId: this.channelId,
            taskExecutionId: this.taskExecutionId,
            status: this.status as ChannelMessageStatus,
            request: jsonParse(this.request),
        };   
    }

    public loadModel(model: ChannelMessage): ChannelMessageDb {
        this.channelId = model.channelId;
        this.taskExecutionId = model.taskExecutionId;
        this.status = model.status as string;
        if (model.request) {
            this.request = jsonStringify(model.request);
        }

        return this;
    }
}