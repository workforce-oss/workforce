import { randomUUID } from "crypto";
import { Optional, STRING, UUID } from "sequelize";
import { Column, Model, Table } from "sequelize-typescript";
import { WorkforceOrg } from "./model.js";

export interface OrgAttributes {
    id: string;
    name: string;
    status: string;
    description?: string;
    company?: string;
}

type OrgCreationAttributes = Optional<OrgAttributes, "id">

@Table({
    tableName: "orgs",
})
export class OrgDb extends Model<OrgAttributes, OrgCreationAttributes> {
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
    declare name: string;

    @Column({
        type: STRING,
        allowNull: false,
    })
    declare status: string;

    @Column({
        type: STRING,
        allowNull: true,
    })
    declare description: string | null;

    @Column({
        type: STRING,
        allowNull: true,
    })
    declare company?: string | null;

    public toModel(): WorkforceOrg {
        const model: WorkforceOrg = {
            id: this.id,
            name: this.name,
            status: this.status,
        };

        if (this.description) {
            model.description = this.description;
        }

        if (this.company) {
            model.company = this.company;
        }

        return model;
    }
}

