import { randomUUID } from "crypto";
import { Optional, STRING, UUID } from "sequelize";
import { Column, Model, Table } from "sequelize-typescript";

export interface LocalIdentityAttributes {
    id: string;
    username: string;
    passwordHash: string;
}

type LocalIdentityCreationAttributes = Optional<LocalIdentityAttributes, "id">

@Table({
    tableName: "user_credentials",
})
export class LocalIdentityDb extends Model<LocalIdentityAttributes, LocalIdentityCreationAttributes> {
    @Column({
        type: UUID,
        defaultValue: randomUUID,
        primaryKey: true
    })
    declare id: string;

    @Column({
        type: STRING,
        allowNull: false,
        unique: true,
    })
    declare username: string;

    @Column({
        type: STRING,
        allowNull: false,
    })
    declare passwordHash: string;
}
