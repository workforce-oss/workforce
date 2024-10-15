import { randomUUID } from "crypto";
import { INTEGER, Optional, STRING, UUID } from "sequelize";
import { BelongsTo, Column, ForeignKey, Model, Table } from "sequelize-typescript";
import { DocumentRepositoryDb } from "./db.js";
import { DocumentData } from "./model.js";

export interface DocumentAttributes {
    id: string;
    repositoryId: string;
    name: string;
    format: string;
    location: string;
    status: string;
    size?: number;
    hash?: string;
    externalId?: string;
}

type DocumentCreationAttributes = Optional<DocumentAttributes, "id">

@Table({
    tableName: "documents",
    indexes: [
        {
            unique: true,
            fields: ["repositoryId", "name"],
        },
    ],
})
export class DocumentDb extends Model<DocumentAttributes, DocumentCreationAttributes> {
    @Column({
        type: UUID,
        defaultValue: randomUUID,
        primaryKey: true
    })
    declare id: string;
    
    @ForeignKey(() => DocumentRepositoryDb)
    @Column({
        type: UUID,
        allowNull: false,
        unique: "repositoryName"
    })
    declare repositoryId: string;

    @BelongsTo(() => DocumentRepositoryDb, "repositoryId")
    declare repository: Awaited<DocumentRepositoryDb>;

    @Column({
        type: STRING,
        allowNull: false,
        unique: "repositoryName"
    })
    declare name: string;



    @Column({
        type: STRING,
        allowNull: false,
    })
    declare format: string;

    @Column({
        type: STRING,
        allowNull: false,
    })
    declare location: string;

    @Column({
        type: STRING,
        allowNull: false,
    })
    declare status: string;

    @Column({
        type: INTEGER,
        allowNull: true,
    })
    declare size?: number | null;

    @Column({
        type: STRING,
        allowNull: true,
    })
    declare hash?: string | null;

    @Column({
        type: STRING,
        allowNull: true,
    })
    declare externalId?: string | null;


    public toModel(): DocumentData {
        const data: DocumentData = {
            id: this.id,
            repositoryId: this.repositoryId,
            name: this.name,
            format: this.format,
            location: this.location,
            status: this.status,
        };

        if (this.size) {
            data.size = this.size;
        }

        if (this.hash) {
            data.hash = this.hash;
        }

        if (this.externalId) {
            data.externalId = this.externalId;
        }

        return data;
    }
  
}