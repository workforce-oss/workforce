import { randomUUID } from "crypto";
import { BIGINT, JSON, Optional, TEXT, UUID } from "sequelize";
import { BelongsTo, Column, ForeignKey, HasMany, Model, Table } from "sequelize-typescript";
import { OrgDb } from "../../identity/db.org.js";
import { jsonParse, jsonStringify } from "../../util/json.js";
import { TaskDb } from "./db.js";
import { TaskExecutionUserDb } from "./db.task_execution_users.js";
import { TaskConfig, TaskExecution } from "./model.js";

interface TaskExecutionAttributes {
    id: string;
    orgId: string;
    taskId: string;
    status: string;
    timestamp: number;
    users: TaskExecutionUserDb[];
    parentTaskExecutionId?: string;
    inputs?: string;
    outputs?: string;
}

type TaskExecutionCreationAttributes = Optional<TaskExecutionAttributes, "id">

@Table({
    tableName: "task_executions",
})
export class TaskExecutionDb extends Model<TaskExecutionAttributes, TaskExecutionCreationAttributes> {
    @Column({
        type: UUID,
        defaultValue: randomUUID,
        primaryKey: true
    })
    declare id: string;

    @ForeignKey(() => OrgDb)
    @Column({
        type: UUID,
        allowNull: false,
    })
    declare orgId: string;

    @BelongsTo(() => OrgDb)
    declare org: Awaited<OrgDb>;

    @ForeignKey(() => TaskDb)
    @Column({
        type: UUID,
        allowNull: false,
    })
    declare taskId: string;

    @BelongsTo(() => TaskDb)
    declare task: Awaited<TaskDb>;

    @Column({
        type: TEXT,
    })
    declare status: string;

    @Column({
        type: BIGINT,
        allowNull: false,
    })
    declare timestamp: number;

    @Column({
        type: TEXT,
        allowNull: true,
    })
    declare parentTaskExecutionId?: string | null;

    @Column({
        type: JSON,
        allowNull: true,
    })
    declare inputs?: string | null;

    @Column({
        type: JSON,
        allowNull: true,
    })
    declare outputs?: string | null;


    @HasMany(() => TaskExecutionUserDb, { onDelete: "CASCADE", hooks: true, foreignKey: "taskExecutionId" })
    declare users: Awaited<TaskExecutionUserDb[]>;

    public toModel(): TaskExecution & { task?: TaskConfig & { flow?: { id: string, name: string, description: string } } } {
        const model: TaskExecution = {
            taskId: this.taskId,
            id: this.id,
            status: this.status,
            timestamp: this.timestamp,
            orgId: this.orgId,
            users: this.users?.map(user => user.userId) || [],
        };
        if (this.parentTaskExecutionId) {
            model.parentTaskId = this.parentTaskExecutionId;
        }
        if (this.inputs) {
            model.inputs = jsonParse(this.inputs)!;
        }
        if (this.outputs) {
            model.outputs = jsonParse(this.outputs)!;
        }

        if (this.task) {
            return {
                ...model,
                task: this.task.toModel()
            }
        }
        return model;
    }

    public loadModel(model: TaskExecution): void {
        this.id = model.id;
        this.orgId = model.orgId!;
        this.taskId = model.taskId;

        if (model.status) {
            this.status = model.status;
        } else {
            this.status = "pending";
        }

        this.timestamp = model.timestamp;
        this.parentTaskExecutionId = model.parentTaskId;
        this.inputs = model.inputs ? jsonStringify(model.inputs) : null;
        this.outputs = model.outputs ? jsonStringify(model.outputs) : null;

        for (const user of model.users ?? []) {
            if (this.users.find(u => u.id === user)) {
                continue;
            }
            this.users.push();
        }

        for (const user of this.users) {
            if (!model.users?.includes(user.id)) {
                this.users = this.users.filter(u => u !== user);
            }
        }
    }
}