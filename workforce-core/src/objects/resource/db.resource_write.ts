import { randomUUID } from "crypto";
import { BIGINT, JSON, Optional, TEXT, UUID } from "sequelize";
import { BelongsTo, Column, ForeignKey, Model, Table } from "sequelize-typescript";
import { jsonParse } from "../../util/json.js";
import { ResourceDb } from "./db.js";
import { ResourceWrite, ResourceWriteStatus } from "./model.js";

interface ResourceWriteAttributes {
    id: string;
    resourceId: string;
    timestamp: number;
    status: string;
    data?: string;
}

type ResourceWriteCreationAttributes = Optional<ResourceWriteAttributes, "id">

@Table({
    tableName: "resource_writes",
})
export class ResourceWriteDb extends Model<ResourceWriteAttributes, ResourceWriteCreationAttributes> {
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
        type: TEXT,
    })
    declare status?: string;


    @Column({
        type: JSON
    })
    declare data?: string;

    public toModel(): ResourceWrite {
        return {
            id: this.id,
            resourceId: this.resourceId,
            timestamp: this.timestamp,
            status: this.status as unknown as ResourceWriteStatus,
            data: jsonParse(this.data),
        };
    }
}
