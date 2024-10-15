import { randomUUID } from "crypto";
import { BIGINT, JSON, Optional, TEXT, UUID } from "sequelize";
import { BelongsTo, Column, ForeignKey, Model, Table } from "sequelize-typescript";
import { jsonParse } from "../../util/json.js";
import { TrackerDb } from "./db.js";
import { TicketRequest, TicketRequestStatus } from "./model.js";

interface TicketRequestAttributes {
    id: string;
    trackerId: string;
    timestamp: number;
    status: string;
    type: string;
    data?: string;
}

type TicketRequestCreationAttributes = Optional<TicketRequestAttributes, "id">

@Table({
    tableName: "ticket_create_requests",
})
export class TicketRequestDb extends Model<TicketRequestAttributes, TicketRequestCreationAttributes> {
    @Column({
        type: UUID,
        defaultValue: randomUUID,
        primaryKey: true
    })
    declare id: string;
    
    @ForeignKey(() => TrackerDb)
    @Column({
        type: UUID,
        allowNull: false,
    })
    declare trackerId: string;

    @BelongsTo(() => TrackerDb, "trackerId")
    declare tracker: Awaited<TrackerDb>;

    @Column({
        type: BIGINT,
        allowNull: false,
    })
    declare timestamp: number;

    @Column({
        type: TEXT,
    })
    declare status: string;

    @Column({
        type: TEXT,
    })
    declare type: string;

    @Column({
        type: JSON,
    })
    declare data?: string;

    public toModel(): TicketRequest {
        const model: TicketRequest = {
            id: this.id,
            trackerId: this.trackerId,
            timestamp: this.timestamp,
            status: this.status as unknown as TicketRequestStatus,
            type: this.type,
        
        };

        if (this.data) {
            model.data = jsonParse(this.data);
        }
        return model;
    }
}