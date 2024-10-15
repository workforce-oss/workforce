import { randomUUID } from "crypto";
import { Optional, TEXT, UUID, JSON } from "sequelize";
import { BelongsTo, Column, ForeignKey, Model, Table } from "sequelize-typescript";
import { TrackerDb } from "./db.js";
import { Ticket, TicketData, TicketStatus } from "./model.js";

interface TicketAttributes {
    id: string;
    trackerId: string;
    ticketId: string;
    status: string;
    data: TicketData;
}

type TicketCreationAttributes = Optional<TicketAttributes, "id">

@Table({
    tableName: "tickets",
    indexes: [
        {
            unique: true,
            fields: ["trackerId", "ticketId"]
        }
    ]
})
export class TicketDb extends Model<TicketAttributes, TicketCreationAttributes> {
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
        type: UUID,
        allowNull: false,
    })
    declare ticketId: string;

    @Column({
        type: TEXT,
        allowNull: false,
    })
    declare status: string;

    @Column({
        type: JSON,
        allowNull: false,
    })
    declare data: TicketData;

    public toModel(): Ticket {
        const model: Ticket = {
            id: this.id,
            trackerId: this.trackerId,
            ticketId: this.ticketId,
            status: this.status as TicketStatus,
            data: this.data,
        };
        return model;
    }

    public loadModel(model: Ticket): TicketDb {
        this.trackerId = model.trackerId;
        this.ticketId = model.ticketId;
        this.status = model.status;
        this.data = model.data;
        return this;
    }
}