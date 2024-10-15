import { randomUUID } from "crypto";
import { Optional, STRING, UUID } from "sequelize";
import { Column, Model, Table } from "sequelize-typescript";
import { Prospect, ProspectStatus } from "./model.js";

export interface ProspectAttributes {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    role?: string;
    company?: string;
    customerNotes?: string;
    internalNotes?: string;
}

type ProspectCreationAttributes = Optional<ProspectAttributes, "id">

@Table({
    tableName: "prospects",
})
export class ProspectDb extends Model<ProspectAttributes, ProspectCreationAttributes> {
    @Column({
        type: UUID,
        defaultValue: randomUUID,
        primaryKey: true
    })
    declare id: string;

    @Column({
        type: STRING,
        allowNull: false,
    })
    declare firstName: string;

    @Column({
        type: STRING,
        allowNull: false,
    })
    declare lastName: string;

    @Column({
        type: STRING,
        allowNull: false,
    })
    declare email: string;

    @Column({
        type: STRING,
        allowNull: false,
    })
    declare status: string;

    @Column({
        type: STRING,
    })
    declare role?: string | null;

    @Column({
        type: STRING,
    })
    declare company?: string | null;

    @Column({
        type: STRING,
    })
    declare customerNotes?: string | null;

    @Column({
        type: STRING,
    })
    declare internalNotes?: string | null;

    public toModel(): Prospect {
        const data: Prospect = {
            id: this.id,
            firstName: this.firstName,
            lastName: this.lastName,
            email: this.email,
            status: this.status as ProspectStatus,
        };

        if (this.role) {
            data.role = this.role;
        }

        if (this.company) {
            data.company = this.company;
        }

        if (this.customerNotes) {
            data.customerNotes = this.customerNotes;
        }

        if (this.internalNotes) {
            data.internalNotes = this.internalNotes;
        }

        return data;
    }
}