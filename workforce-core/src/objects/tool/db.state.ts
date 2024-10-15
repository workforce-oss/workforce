import { randomUUID } from "crypto";
import { Optional, JSON, UUID, TEXT } from "sequelize";
import { BelongsTo, Column, ForeignKey, Model, Table } from "sequelize-typescript";
import { ToolDb } from "./db.js";
import { TaskExecutionDb } from "../task/db.task_execution.js";
import { HumanState, ToolState } from "../base/model.js";
import { jsonParse } from "../../util/json.js";

interface ToolStateAttributes {
    id: string;
    toolId: string;
    taskExecutionId: string;
    machineState?: string;
    machineImage?: string;
    humanState?: string;
}

type ToolStateCreationAttributes = Optional<ToolStateAttributes, "id">

@Table({
    tableName: "tool_states",
})
export class ToolStateDb extends Model<ToolStateAttributes, ToolStateCreationAttributes> {
    @Column({
        type: UUID,
        defaultValue: randomUUID,
        primaryKey: true
    })
    declare id: string;

    @ForeignKey(() => ToolDb)
    @Column({
        type: UUID,
        allowNull: false,
    })
    declare toolId: string;

    @BelongsTo(() => ToolDb, "toolId")
    declare tool: Awaited<ToolDb>;

    @ForeignKey(() => TaskExecutionDb)
    @Column({
        type: UUID,
        allowNull: false,
    })
    declare taskExecutionId: string;

    @BelongsTo(() => TaskExecutionDb, { foreignKey: "taskExecutionId", onDelete: "CASCADE", hooks: true })
    declare taskExecution: Awaited<TaskExecutionDb>;

    @Column({
        type: JSON,
        allowNull: true,
    })
    declare machineState?: string | null;

    @Column({
        type: TEXT,
        allowNull: true,
    })
    declare machineImage?: string | null;

    @Column({
        type: JSON,
        allowNull: true,
    })
    declare humanState?: string | null;

    public toModel<TMachineState>(): ToolState<TMachineState> {
        const toolState: ToolState<TMachineState> = {
            toolId: this.toolId,
            taskExecutionId: this.taskExecutionId,
            timestamp: (this.createdAt as Date).getTime(),

        };
        if (this.machineState) {
            toolState.machineState = jsonParse<TMachineState>(this.machineState);
        }

        if (this.machineImage) {
            toolState.machineImage = this.machineImage;
        }

        if (this.humanState) {
            toolState.humanState = jsonParse<HumanState>(this.humanState);
        }

        return toolState;
    }
}




