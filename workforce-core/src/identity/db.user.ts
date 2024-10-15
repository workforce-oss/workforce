import { randomUUID } from "crypto";
import { Optional, STRING, UUID } from "sequelize";
import { Column, Model, Table } from "sequelize-typescript";
import { WorkforceUser } from "./model.js";

export interface UserAttributes {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    idpId?: string;

}

type UserCreationAttributes = Optional<UserAttributes, "id">

@Table({
    tableName: "users",
})
export class UserDb extends Model<UserAttributes, UserCreationAttributes> {
    @Column({
        type: UUID,
        defaultValue: randomUUID,
        primaryKey: true
    })
    declare id: string;

    @Column({
        type: UUID,
        allowNull: true,
    })
    declare idpId?: string | null;

    @Column({
        type: STRING,
        allowNull: false,
    })
    declare username: string;

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

    public toModel(): WorkforceUser {
        const model: WorkforceUser = {
            id: this.id,
            username: this.username,
            firstName: this.firstName,
            lastName: this.lastName,
            email: this.email,
        };
        if (this.idpId) {
            model.idpId = this.idpId;
        }

        return model;
    }
}
