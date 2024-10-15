import { Optional, STRING, UUID } from "sequelize";
import { BelongsTo, Column, ForeignKey, Model, Table } from "sequelize-typescript";
import { OrgDb } from "./db.org.js";
import { randomUUID } from "crypto";
import { UserDb } from "./db.user.js";
import { WorkforceOrgUserRelation, WorkforceRole } from "./model.js";

export interface OrgUserRelationAttributes {
    id: string;
    orgId: string;
    userId: string;
    role: string;
}

type OrgUserRelationCreationAttributes = Optional<OrgUserRelationAttributes, "id">

@Table({
    tableName: "org_user",
    indexes: [
        {
            unique: true,
            fields: ["orgId", "userId", "role"]
        }
    ]
})
export class OrgUserRelationDb extends Model<OrgUserRelationAttributes, OrgUserRelationCreationAttributes> {
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

    @BelongsTo(() => OrgDb)
    declare org: Awaited<OrgDb>;

    @ForeignKey(() => UserDb)
    @Column({
        type: UUID,
        allowNull: false,
    })
    declare userId: string;

    @BelongsTo(() => UserDb)
    declare user: Awaited<UserDb>;

    @Column({
        type: STRING,
        allowNull: false,
    })
    declare role: string;

    public toModel(): WorkforceOrgUserRelation {
        return {
            id: this.id,
            orgId: this.orgId,
            userId: this.userId,
            role: this.role as WorkforceRole
        };
    }
}