import { STRING, UUID } from "sequelize";
import { Column, ForeignKey, HasMany, HasOne, Table } from "sequelize-typescript";
import { BaseModel } from "../base/db.js";
import { CredentialDb } from "../credential/db.js";
import { DocumentDb } from "./db.document.js";
import { DocumentRepositoryConfig, DocumentRepositoryType } from "./model.js";

@Table({
    tableName: "document_repositories",
    indexes: [
        {
            unique: true,
            fields: ["orgId", "name"]
        }
    ]
})
export class DocumentRepositoryDb extends BaseModel {
    @ForeignKey(() => CredentialDb)
    @Column({
        type: UUID,
        allowNull: true,
    })
    declare credentialId?: string | null;

    @HasOne(() => CredentialDb, {foreignKey: "credentialId", onDelete: "CASCADE"})
    declare credential?: Awaited<CredentialDb> | null;

    @HasMany(() => DocumentDb, {onDelete: "CASCADE", foreignKey: "repositoryId"})
    declare documents?: DocumentDb[];

    @Column({
        type: STRING,
        allowNull: true,
    })
    declare status?: string | null;

    public toModel(): DocumentRepositoryConfig {
        const base = super.toModel();
        const model: DocumentRepositoryConfig = {
            ...base,
            subtype: this.subtype as DocumentRepositoryType
        };
        if (this.credentialId) {
            model.credential = this.credentialId;
        }
        if (this.status) {
            model.status = this.status
        }
        return model;
    }

    public loadModel(model: DocumentRepositoryConfig): DocumentRepositoryDb {
        super.loadModel(model);
        if (model.id) {
            this.id = model.id;
        }
        this.credentialId = model.credential ?? null;
        return this;
    }
}