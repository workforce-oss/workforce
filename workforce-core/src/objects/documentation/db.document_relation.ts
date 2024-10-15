import { randomUUID } from "crypto";
import { Optional, UUID } from "sequelize";
import { BelongsTo, Column, ForeignKey, Model, Table } from "sequelize-typescript";
import { DocumentDb } from "../document_repository/db.document.js";
import { DocumentationDb } from "./db.js";

export interface DocumentRelationAttributes {
    id: string;
    documentId: string;
    documentationId: string;
}

type DocumentRelationCreationAttributes = Optional<DocumentRelationAttributes, "id">

@Table({
    tableName: "document_relations",
    indexes: [
        {
            fields: ["documentId", "documentationId"],
            unique: true,
        },
    ],
})
export class DocumentRelationDb extends Model<DocumentRelationAttributes, DocumentRelationCreationAttributes> {
    @Column({
        type: UUID,
        defaultValue: randomUUID,
        primaryKey: true
    })
    declare id: string;

    @ForeignKey(() => DocumentDb)
    @Column({
        type: UUID,
        allowNull: false,
    })
    declare documentId: string;

    @BelongsTo(() => DocumentDb, "documentId")
    declare document: Awaited<DocumentDb>;

    @ForeignKey(() => DocumentationDb)
    @Column({
        type: UUID,
        allowNull: false,
    })
    declare documentationId: string;

    @BelongsTo(() => DocumentationDb, "documentationId")
    declare documentation: Awaited<DocumentationDb>;
}

