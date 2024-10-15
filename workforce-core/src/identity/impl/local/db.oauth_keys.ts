import { INTEGER, Optional, TEXT } from "sequelize";
import { Column, Model, Table } from "sequelize-typescript";

export interface OAuthKeysAttributes {
    id: number;
    publicKey: string;
    privateKey: string;
}

type OAuthKeysCreationAttributes = Optional<OAuthKeysAttributes, "id">

@Table({
    tableName: "oauth_keys",
})
export class OAuthKeysDb extends Model<OAuthKeysAttributes, OAuthKeysCreationAttributes> {
    @Column({
        primaryKey: true,
        autoIncrement: true,
        type: INTEGER,
    })
    declare id: number;

    @Column({
        type: TEXT,
        allowNull: false,
    })
    declare publicKey: string;

    @Column({
        type: TEXT,
        allowNull: false,
    })
    declare privateKey: string;
}