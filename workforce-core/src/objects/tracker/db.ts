import { BOOLEAN, UUID } from "sequelize";
import { BelongsTo, Column, ForeignKey, HasOne, Table } from "sequelize-typescript";
import { BaseModel } from "../base/db.js";
import { FlowDb } from "../flow/db.js";
import { TrackerConfig, TrackerType } from "./model.js";
import { CredentialDb } from "../credential/db.js";

@Table({
    tableName: "trackers",
    indexes: [
        {
            unique: true,
            fields: ["flowId", "name"]
        }
    ]
})
export class TrackerDb extends BaseModel {
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

    @Column({
        type: BOOLEAN,    
    })
    declare webhooksEnabled: boolean;

    public toModel(): TrackerConfig {
        const base = super.toModel();
        const model: TrackerConfig = {
            ...base,
            subtype: this.subtype as TrackerType,
            flowId: this.flowId,
        };
        if (this.credentialId) {
            model.credential = this.credentialId;
        }
        if (this.webhooksEnabled) {
            model.webhooksEnabled = this.webhooksEnabled;
        }
        return model;
    }

    public loadModel(model: TrackerConfig): TrackerDb {
        super.loadModel(model);
        if (model.flowId) {
            this.flowId = model.flowId;
        }
        // We are intentionally not setting to null because of hidden logic in the model
        // Undesireable, but necessary for now
        if (model.webhooksEnabled) {
            this.webhooksEnabled = model.webhooksEnabled;
        } 
        
        this.credentialId = model.credential ?? null;
        return this;
    }
}