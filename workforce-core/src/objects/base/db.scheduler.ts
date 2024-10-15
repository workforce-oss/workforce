import { JSON, Optional, UUID } from "sequelize";
import { Column, Model, Table } from "sequelize-typescript";
import { randomUUID } from "crypto";

interface ObjectSchedulingAttributes {
    id: string;
    objectId: string;
    owningNode?: string;
    status?: string;
    history?: string;
}

type ObjectSchedulingCreationAttributes = Optional<ObjectSchedulingAttributes, "id">

@Table({
    tableName: "object_scheduling",
})
export class ObjectSchedulingDb extends Model<ObjectSchedulingAttributes, ObjectSchedulingCreationAttributes> {
    @Column({
        type: UUID,
        defaultValue: randomUUID,
        primaryKey: true
    })
    declare id: string;
    
    @Column({
        type: UUID,
        allowNull: false,
    })
    declare objectId: string;

    @Column({
        type: UUID,
        allowNull: false,
    })
    declare owningNode: string;


    @Column({
        type: JSON,
    })
    declare status?: string;

    @Column({
        type: JSON,
    })
    declare history?: string;
}