import { UUID } from "sequelize";
import { BelongsTo, Column, ForeignKey, HasMany, HasOne, Table } from "sequelize-typescript";
import { BaseModel } from "../base/db.js";
import { CredentialDb } from "../credential/db.js";
import { FlowDb } from "../flow/db.js";
import { ChannelMessageDb } from "./db.message.js";
import { ChannelConfig, ChannelType } from "./model.js";

@Table({
    tableName: "channels",
    indexes: [
        {
            unique: true,
            fields: ["flowId", "name"]
        }
    ]
})
export class ChannelDb extends BaseModel {
    @ForeignKey(() => FlowDb)
    @Column({
      type: UUID,
      allowNull: false,
      unique: "flowName",
      
    })
    declare flowId: string;

    @ForeignKey(() => CredentialDb)
    @Column({
        type: UUID,
        allowNull: true,
    })
    declare credentialId?: string | null;

    @HasOne(() => CredentialDb, "credentialId")
    declare credential?: Awaited<CredentialDb> | null;

    @HasMany(() => ChannelMessageDb, {onDelete: "CASCADE", foreignKey: "channelId"})
    declare messages?: ChannelMessageDb[];


    @BelongsTo(() => FlowDb)
    declare flow: Awaited<FlowDb>;
  
    public toModel(): ChannelConfig {
        const base = super.toModel();
        if (this.credentialId) {
            base.credential = this.credentialId;
        }
        return {
            ...base,
            subtype: this.subtype as ChannelType,
            flowId: this.flowId,
        };
    }

    public loadModel(model: ChannelConfig): ChannelDb {
        super.loadModel(model);
        if (model.flowId) {
            this.flowId = model.flowId;
        }
        this.credentialId = model.credential ?? null;
        return this;
    }
}
