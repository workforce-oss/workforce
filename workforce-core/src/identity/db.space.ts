import { Optional, STRING, UUID } from "sequelize";
import { BelongsTo, Column, ForeignKey, Model, Table } from "sequelize-typescript";
import { WorkforceSpace } from "./model.js";
import { randomUUID } from "crypto";
import { OrgDb } from "./db.org.js";

export interface SpaceAttributes {
    id: string;
    orgId: string;
    name: string;
    description?: string;
}

type SpaceCreationAttributes = Optional<SpaceAttributes, "id">

@Table({
    tableName: "spaces",
})
export class SpaceDb extends Model<SpaceAttributes, SpaceCreationAttributes> {
    @Column({
        type: UUID,
        defaultValue: randomUUID,
        primaryKey: true
    })
    declare id: string;

    @ForeignKey(() => OrgDb)
    @Column({
        type: UUID,
        allowNull: false,
    })
    declare orgId: string;

    @BelongsTo(() => OrgDb, "orgId")
    declare org: Awaited<OrgDb>;

    @Column({
        type: STRING,
        allowNull: false,
    })
    declare name: string;

    @Column({
        type: STRING,
        allowNull: true,
    })
    declare description?: string | null;

    public toModel(): WorkforceSpace {
        const model: WorkforceSpace = {
            id: this.id,
            orgId: this.orgId,
            name: this.name
        };

        if (this.description) {
            model.description = this.description;
        }

        return model;
    }
}
