import { randomUUID } from "crypto";
import { Optional, TEXT, UUID } from "sequelize";
import { Column, ForeignKey, Model, Table } from "sequelize-typescript";
import { TaskExecutionDb } from "../task/db.task_execution.js";
import { ChannelDb } from "./db.js";
import { ChannelSession, ChannelSessionStatus } from "./model.js";

interface ChannelSessionAttributes {
    id: string;
    taskExecutionId: string;
    channelId: string;
    status: string;
}

type ChannelSessionCreationAttributes = Optional<ChannelSessionAttributes, "id">

@Table({
    tableName: "channel_sessions",
})
export class ChannelSessionDb extends Model<ChannelSessionAttributes, ChannelSessionCreationAttributes> {
    @Column({
        type: UUID,
        defaultValue: randomUUID,
        primaryKey: true
    })
    declare id: string;

    @ForeignKey(() => TaskExecutionDb)
    @Column({
        type: UUID,
        allowNull: false,
        unique: true,
    })
    declare taskExecutionId: string;
    
    @ForeignKey(() => ChannelDb)
    @Column({
        type: UUID,
        allowNull: false,
    })
    declare channelId: string;

    @Column({
        type: TEXT,
    })
    declare status: string;

    public toModel(): ChannelSession {
        return {
            id: this.id,
            taskExecutionId: this.taskExecutionId,
            channelId: this.channelId,
            status: this.status as ChannelSessionStatus,
        };
    }

    public loadModel(model: ChannelSession): ChannelSessionDb {
        this.id = model.id || this.id;
        this.taskExecutionId = model.taskExecutionId || this.taskExecutionId;
        this.channelId = model.channelId || this.channelId;
        this.status = model.status || this.status;
        return this;
    }
}

