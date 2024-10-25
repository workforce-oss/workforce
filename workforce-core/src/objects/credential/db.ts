import { Column, Table } from "sequelize-typescript";
import { BaseModel } from "../base/db.js";
import { UUID } from "sequelize";
import { CredentialConfig } from "./model.js";

@Table({
    tableName: "credentials",
    indexes: [
        {
            unique: true,
            fields: ["orgId", "name"]
        }
    ]
})
export class CredentialDb extends BaseModel {
    @Column ({
        type: UUID,
        unique: true
    })
    declare secretId: string;

    public toModel(withoutSecretId?: boolean): CredentialConfig {
        const base = super.toModel();
        return withoutSecretId ? {
            ...base 
        } : {
            ...base,
            secretId: this.secretId,
        }
    }

    public loadModel(model: CredentialConfig): CredentialDb {
        const withoutVariables = {
            id: model.id,
            name: model.name,
            description: model.description,
            orgId: model.orgId,
            type: model.type,
        }
        super.loadModel(withoutVariables);
        this.secretId = model.secretId!;
        return this;
    }
    
}