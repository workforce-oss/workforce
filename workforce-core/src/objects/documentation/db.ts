import { SaveOptions, UUID } from "sequelize";
import { BelongsTo, Column, ForeignKey, HasMany, Table } from "sequelize-typescript";
import { BaseModel } from "../base/db.js";
import { DocumentRepository } from "../document_repository/base.js";
import { DocumentRepositoryDb } from "../document_repository/db.js";
import { FlowDb } from "../flow/db.js";
import { DocumentRelationDb } from "./db.document_relation.js";
import { DocumentationConfig, DocumentationType } from "./model.js";

@Table({
    tableName: "documentation",
    indexes: [
        {
            unique: true,
            fields: ["flowId", "name"]
        }
    ]
})
export class DocumentationDb extends BaseModel {
    @ForeignKey(() => FlowDb)
    @Column({
        type: UUID,
        allowNull: false,
        unique: "flowName"
    })
    declare flowId: string;

    @BelongsTo(() => FlowDb)
    declare flow: Awaited<FlowDb>;

    @ForeignKey(() => DocumentRepositoryDb)
    @Column({
        type: UUID,
        allowNull: true
    })
    declare repositoryId?: string | null;

    @BelongsTo(() => DocumentRepositoryDb)
    declare repository: Awaited<DocumentRepository>;

    @HasMany(() => DocumentRelationDb, {foreignKey: "documentationId", onDelete: "CASCADE"})
    declare documentRelations: DocumentRelationDb[];


    public toModel(): DocumentationConfig {
        const base = super.toModel();
        const model: DocumentationConfig = {
            ...base,
            subtype: this.subtype as DocumentationType,
            flowId: this.flowId,
        };

        if (this.repositoryId) {
            model.repository = this.repositoryId;
        }

        if (this.documentRelations && this.documentRelations.length > 0) {
            model.documents = this.documentRelations.map(relation => relation.documentId);
        }

        return model;
    }

    public loadModel(model: DocumentationConfig): DocumentationDb {
        super.loadModel(model);
        if (model.flowId) {
            this.flowId = model.flowId;
        }

        if (model.repository) {
            this.repositoryId = model.repository;
        } else {
            this.repositoryId = null;
        }
        
        if (model.documents) {
            for (const documentId of model.documents) {
                if (!this.documentRelations) {
                    this.documentRelations = [];
                }

                if (this.documentRelations?.find(relation => relation.documentId === documentId)) {
                    continue
                }

                const relation = new DocumentRelationDb();
                relation.documentId = documentId;
                relation.documentationId = this.id;
                this.documentRelations.push(relation);
            }

            for (const relation of this.documentRelations || []) {
                if (!model.documents?.includes(relation.documentId)) {
                    this.documentRelations = this.documentRelations.filter(r => r !== relation);
                }
            }
        } else {
            this.documentRelations = [];
        }

        return this;
    }

    public async save(options?: SaveOptions): Promise<this> {
        await super.save(options);

        if (this.documentRelations) {
            for (const relation of this.documentRelations) {
                await relation.save();
            }
            for (const relation of await DocumentRelationDb.findAll({
                where: {
                    documentationId: this.id
                }
            })) {
                if (!this.documentRelations.find(r => r.id === relation.id)) {
                    await relation.destroy();
                }
            }
        } else {
            await DocumentRelationDb.destroy({
                where: {
                    documentationId: this.id
                }
            });
        }

        return this;
    }
}