import { UUID, TEXT, Optional, INTEGER } from "sequelize";
import { Column, Model, Table } from "sequelize-typescript";

interface OutboxAttributes {
    id: number;
    type: string;
    objectId: string;
    eventType: string;
}

type OutboxCreationAttributes = Optional<OutboxAttributes, "id">;

@Table({
    tableName: "outbox",
})
export class Outbox extends Model<OutboxAttributes, OutboxCreationAttributes> {
    @Column({
        type: INTEGER,
        primaryKey: true,
        autoIncrement: true,
    })
    declare id: number;

    @Column({
        type: TEXT,
        allowNull: false
    })
    declare type: string;

    @Column({
        type: UUID,
        allowNull: false,
    })
    declare objectId: string;

    @Column({
        type: TEXT,
        allowNull: false
    })
    declare eventType: string;
}

export interface OutboxEvent {
    eventId: number;
    type: string;
    objectId: string;
    eventType: "update" | "delete";
}