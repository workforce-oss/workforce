import { randomUUID } from "crypto";
import { DOUBLE, JSON, Optional, TEXT, UUID } from "sequelize";
import { BelongsTo, Column, ForeignKey, Model, Table } from "sequelize-typescript";
import { TaskExecutionDb } from "../task/db.task_execution.js";
import { WorkerDb } from "./db.js";
import { WorkRequestData, WorkRequestStatus } from "./model.js";
import { jsonParse } from "../../util/json.js";
import { TaskExecution } from "../../model.js";

export interface WorkRequestAttributes {
    id: string;
    workerId: string;
    taskExecutionId: string;
    status: string;
    cost?: number;
    request?: string;
    response?: string;
    toolSchemas?: string;
    tokens?: number;
    activeSubtasks?: string;
}

type WorkRequestCreationAttributes = Optional<WorkRequestAttributes, "id">

@Table({
    tableName: "work_requests",

})
export class WorkRequestDb extends Model<WorkRequestAttributes, WorkRequestCreationAttributes> {
    @Column({
        type: UUID,
        defaultValue: randomUUID,
        primaryKey: true
    })
    declare id: string;

    @ForeignKey(() => WorkerDb)
    @Column({
        type: UUID,
        allowNull: false,
    })
    declare workerId: string;

    @BelongsTo(() => WorkerDb, "workerId")
    declare worker: Awaited<WorkerDb>;


    @ForeignKey(() => TaskExecutionDb)
    @Column({
        type: UUID,
        allowNull: false,
        unique: true,
    })
    declare taskExecutionId: string;

    @BelongsTo(() => TaskExecutionDb, { foreignKey: "taskExecutionId", onDelete: "CASCADE", hooks: true })
    declare taskExecution: Awaited<TaskExecutionDb>;

    @Column({
        type: TEXT,
    })
    declare status: string;

    @Column({
        type: DOUBLE,
        allowNull: true,
    })
    declare cost?: number | null;

    @Column({
        type: JSON,
        allowNull: true,
    })
    declare request?: string | null;

    @Column({
        type: JSON,
        allowNull: true,
    })
    declare response?: string | null;

    @Column({
        type: JSON,
        allowNull: true,
    })
    declare toolSchemas?: string | null;

    @Column({
        type: DOUBLE,
        allowNull: true,
    })
    declare tokens?: number | null;

    @Column({
        type: JSON,
        allowNull: true
    })
    declare activeSubtasks?: string | null;

    public toModel(): WorkRequestData & { taskExecution?: TaskExecution } {
        const model: WorkRequestData = {
            id: this.id,
            workerId: this.workerId,
            taskExecutionId: this.taskExecutionId,
            status: this.status as unknown as WorkRequestStatus,
        };
        if (this.cost) {
            model.cost = this.cost;
        }
        if (this.request) {
            model.request = jsonParse(this.request);
        }
        if (this.response) {
            model.response = jsonParse(this.response);
        }
        if (this.toolSchemas) {
            model.toolSchemas = jsonParse(this.toolSchemas);
        }
        if (this.tokens) {
            model.tokens = this.tokens;
        }
        if (this.activeSubtasks) {
            model.activeSubtasks = jsonParse(this.activeSubtasks);
        }

        if (this.taskExecution) {
            return {

                ...model,
                taskExecution: this.taskExecution.toModel(),
            };
        }

        return model;
    }

}