import { randomUUID } from "crypto";
import { Optional, STRING, UUID } from "sequelize";
import { BelongsTo, Column, ForeignKey, Model, Table } from "sequelize-typescript";
import { SpaceDb } from "./db.space.js";
import { UserDb } from "./db.user.js";
import { WorkforceRole, WorkforceSpaceUserRelation } from "./model.js";

export interface SpaceUserRelationAttributes {
    id: string;
    spaceId: string;
    userId: string;
    role: string;
}

type SpaceUserRelationCreationAttributes = Optional<SpaceUserRelationAttributes, "id">

@Table({
    tableName: "space_user",
    indexes: [
        {
            unique: true,
            fields: ["spaceId", "userId", "role"]
        }
    ]
})
export class SpaceUserRelationDb extends Model<SpaceUserRelationAttributes, SpaceUserRelationCreationAttributes> {
    @Column({
        type: UUID,
        defaultValue: randomUUID,
        primaryKey: true
    })
    declare id: string;

    @ForeignKey(() => SpaceDb)
    @Column({
        type: UUID,
        allowNull: false,
    })
    declare spaceId: string;

    @BelongsTo(() => SpaceDb)
    declare space: Awaited<SpaceDb>;

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

    public toModel(): WorkforceSpaceUserRelation {
        return {
            id: this.id,
            spaceId: this.spaceId,
            userId: this.userId,
            role: this.role as WorkforceRole
        };
    }
}
