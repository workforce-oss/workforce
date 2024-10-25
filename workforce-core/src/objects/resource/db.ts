import { STRING, UUID } from "sequelize";
import { BelongsTo, Column, ForeignKey, HasOne, Table } from "sequelize-typescript";
import { BaseModel } from "../base/db.js";
import { CredentialDb } from "../credential/db.js";
import { FlowDb } from "../flow/db.js";
import { ResourceConfig, ResourceType } from "./model.js";

@Table({
	tableName: "resources",
	indexes: [
		{
			unique: true,
			fields: ["flowId", "name"],
		},
	],
})
export class ResourceDb extends BaseModel {
	@ForeignKey(() => FlowDb)
	@Column({
		type: UUID,
		allowNull: false,
		unique: "flowName",
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
		type: STRING,
		allowNull: true,
	})
	declare example?: string | null;

	public toModel(): ResourceConfig {
		const base = super.toModel();
		const model: ResourceConfig = {
			...base,
			type: this.type as ResourceType,
			flowId: this.flowId,
		};
		if (this.credentialId) {
			model.credential = this.credentialId;
		}
		if (this.example) {
			model.example = this.example;
		}

		return model;
	}

	public loadModel(model: ResourceConfig): ResourceDb {
		super.loadModel(model);
		if (model.flowId) {
			this.flowId = model.flowId;
		}

		if (model.credential) {
			this.credentialId = model.credential;
		} else {
			this.credentialId = null;
		}
		
		this.example = model.example ?? null;

		return this;
	}
}
