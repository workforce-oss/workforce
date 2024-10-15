import { Optional, TEXT, UUID, JSON } from "sequelize";
import { BelongsTo, Column, ForeignKey, Model, Table } from "sequelize-typescript";
import { ToolDb } from "./db.js";
import { randomUUID } from "crypto";
import { TaskExecutionDb } from "../task/db.task_execution.js";
import { ToolRequest, ToolRequestData, ToolRequestStatus, ToolResponse } from "./model.js";
import { jsonParse } from "../../util/json.js";

interface ToolRequestAttributes {
    id: string;
    toolId: string;
    taskExecutionId: string;
    status: string;
    request?: string;
    response?: string;
}

type ToolRequestCreationAttributes = Optional<ToolRequestAttributes, "id">

@Table({
    tableName: "tool_requests",
})
export class ToolRequestDb extends Model<ToolRequestAttributes, ToolRequestCreationAttributes> {
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

    @BelongsTo(() => TaskExecutionDb, {foreignKey: "taskExecutionId", onDelete: "CASCADE", hooks: true})
    declare taskExecution: Awaited<TaskExecutionDb>;

    @Column({
        type: TEXT,
    })
    declare status: string;

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

    public toModel(): ToolRequestData {
        const model: ToolRequestData = {
        
            id: this.id,
            toolId: this.toolId,
            taskExecutionId: this.taskExecutionId,
            status: this.status as unknown as ToolRequestStatus,
        };
        if (this.request) {
            model.request = jsonParse<ToolRequest>(this.request);
        }
        if (this.response) {
            model.response = jsonParse<ToolResponse>(this.response);
        }
        return model;
    }
}