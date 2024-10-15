import { UUID } from "sequelize";
import { BelongsTo, Column, ForeignKey, HasMany, HasOne, Table } from "sequelize-typescript";
import { BaseModel } from "../base/db.js";
import { CredentialDb } from "../credential/db.js";
import { FlowDb } from "../flow/db.js";
import { ToolRequestDb } from "./db.tool_request.js";
import { ToolConfig, ToolType } from "./model.js";

@Table({
    tableName: "tools",
    indexes: [
        {
            unique: true,
            fields: ["flowId", "name"]
        }
    ]
})
export class ToolDb extends BaseModel {
    @ForeignKey(() => FlowDb)
    @Column({
        type: UUID,
        allowNull: false,
        unique: "flowName"
    })
    declare flowId: string;

    @BelongsTo(() => FlowDb)
    declare flow: Awaited<FlowDb>;

    @ForeignKey(() => CredentialDb)
    @Column({
        type: UUID,
		allowNull: true,
    })
    declare credentialId?: string | null;

    @HasOne(() => CredentialDb, "credentialId")
    declare credential?: Awaited<CredentialDb> | null;

    @HasMany(() => ToolRequestDb, {onDelete: "CASCADE", foreignKey: "toolId"})
    declare toolRequests?: ToolRequestDb[];

    @Column({
        type: UUID,
        allowNull: true,
    })
    declare channelId?: string | null;

    public toModel(): ToolConfig {
        const base = super.toModel();
        const model: ToolConfig = {
            ...base,
            subtype: this.subtype as ToolType,
            flowId: this.flowId,
        };
        if (this.credentialId) {
            model.credential = this.credentialId;
        }

        if (this.channelId) {
            model.channel = this.channelId;
        }

        return model;
    }

    public loadModel(model: ToolConfig): ToolDb {
        super.loadModel(model);
        if(model.flowId) {
            this.flowId = model.flowId;
        }
        this.credentialId = model.credential ?? null;
        this.channelId = model.channel ?? null;
        
        return this;
    }
}