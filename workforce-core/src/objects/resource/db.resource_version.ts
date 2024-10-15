import { randomUUID } from "crypto";
import { BIGINT, JSON, Optional, UUID } from "sequelize";
import { BelongsTo, Column, ForeignKey, Model, Table } from "sequelize-typescript";
import { ResourceDb } from "./db.js";

interface ResourceVersionAttributes {
    id: string;
    resourceId: string;
    timestamp: number;
    data?: string;
}

type ResourceVersionCreationAttributes = Optional<ResourceVersionAttributes, "id">

@Table({
    tableName: "resource_versions",
})
export class ResourceVersionDb extends Model<ResourceVersionAttributes, ResourceVersionCreationAttributes> {
    @Column({
        type: UUID,
        defaultValue: randomUUID,
        primaryKey: true
    })
    declare id: string;
    
    @ForeignKey(() => ResourceDb)
    @Column({
        type: UUID,
        allowNull: false,
    })
    declare resourceId: string;

    @BelongsTo(() => ResourceDb, "resourceId")
    declare resource: Awaited<ResourceDb>;

    @Column({
        type: BIGINT,
        allowNull: false,
    })
    declare timestamp: number;

    @Column({
        type: JSON
    })
    declare data?: string;

    public toModel(): ResourceVersionAttributes {
        return {
            id: this.id,
            timestamp: this.timestamp,
            resourceId: this.resourceId,
            data: this.data,
        };
    }
}