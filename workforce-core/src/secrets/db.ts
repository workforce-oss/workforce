import { Optional, UUID, TEXT } from "sequelize";
import { BelongsTo, Column, ForeignKey, IsUUID, Model, Table } from "sequelize-typescript";
import { SecretData } from "./model.js";
import { randomUUID } from "crypto";
import { OrgDb } from "../identity/db.org.js";

interface BaseSecretModelAttributes {
    id: string;
    orgId: string;
}

type BaseModelSecretCreationAttributes = Optional<BaseSecretModelAttributes, "id">

@Table
export class SecretDb extends Model<BaseSecretModelAttributes, BaseModelSecretCreationAttributes> {
    @Column({
        type: UUID,
        defaultValue: randomUUID,
        primaryKey: true
    })
    declare id: string;

    @ForeignKey(() => OrgDb)
    @IsUUID(4)
    @Column({
        type: UUID,
        allowNull: false
    })
    declare orgId: string;

    @BelongsTo(() => OrgDb)
    declare org: OrgDb;

    @Column({
        type: TEXT,
        allowNull: false
    })
    declare data: string;

    public toModel(): SecretData {
        return {
            id: this.id,
            orgId: this.orgId,
            data: this.data,
        }
    }

    public loadModel(model: SecretData) {
        this.orgId = model.orgId;
        this.data = model.data;
    }
}