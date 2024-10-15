import { randomUUID } from "crypto";
import { Optional, UUID } from "sequelize";
import { BelongsTo, Column, ForeignKey, Model, Table } from "sequelize-typescript";
import { TaskExecutionDb } from "./db.task_execution.js";
import { UserDb } from "../../identity/db.user.js";

export interface TaskExecutionUserAttributes {
    id: string;
    taskExecutionId: string;
    userId: string;
}

type TaskExecutionUserCreationAttributes = Optional<TaskExecutionUserAttributes, "id">

@Table({
    tableName: "task_execution_users",
    indexes: [
        {
            fields: ["taskExecutionId", "userId"],
            unique: true,
        },
    ],
})
export class TaskExecutionUserDb extends Model<TaskExecutionUserAttributes, TaskExecutionUserCreationAttributes> {
    @Column({
        type: UUID,
        defaultValue: randomUUID,
        primaryKey: true,
    })
    declare id: string;

    @ForeignKey(() => TaskExecutionDb)
    @Column({
        type: UUID,
        allowNull: false,
    })
    declare taskExecutionId: string;

    @BelongsTo(() => TaskExecutionDb)
    declare taskExecution: Awaited<TaskExecutionDb>;

    @ForeignKey(() => UserDb)
    @Column({
        type: UUID,
        allowNull: false,
    })
    declare userId: string;

    @BelongsTo(() => UserDb, "userId")
    declare user: Awaited<UserDb>;
}