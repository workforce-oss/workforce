import { randomUUID } from "crypto";
import { Optional, UUID } from "sequelize";
import { BelongsTo, Column, ForeignKey, HasMany, Model, Table } from "sequelize-typescript";
import { TaskExecutionDb } from "../task/db.task_execution.js";
import { WorkerChatMessageDb } from "./db.worker_chat_message.js";
import { ChatSession } from "./model.js";

interface WorkerChatSessionAttributes {
    id: string;
    taskExecutionId: string;
    channelId?: string;
}

type WorkerChatSessionCreationAttributes = Optional<WorkerChatSessionAttributes, "id">

@Table({
    tableName: "worker_chat_sessions",
})
export class WorkerChatSessionDb extends Model<WorkerChatSessionAttributes, WorkerChatSessionCreationAttributes> {
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
    })
    declare taskExecutionId: string;

    @BelongsTo(() => TaskExecutionDb, {foreignKey: "taskExecutionId", onDelete: "CASCADE", hooks: true})
    declare taskExecution: Awaited<TaskExecutionDb>;

    @Column({
        type: UUID,
        allowNull: true,
    })
    declare channelId: string | undefined;

    @HasMany(() => WorkerChatMessageDb, {onDelete: "CASCADE", foreignKey: "sessionId", hooks: true})
    declare messages?: WorkerChatMessageDb[];

    public toModel(): ChatSession { /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */

        const model: ChatSession = {
            id: this.id,
            taskExecutionId: this.taskExecutionId,
            channelId: this.channelId || undefined,
            messages: this.messages?.map(message => message.toModel()) ?? [],
        };
        // sort messages ascending by timestamp
        model.messages.sort((a, b) => a.timestamp - b.timestamp);
        return model;
    }
}