import { randomUUID } from "crypto";
import { Optional, TEXT, UUID } from "sequelize";
import { BelongsTo, Column, ForeignKey, Model, Table } from "sequelize-typescript";
import { Skill } from "./model.js";
import { OrgDb } from "../../identity/db.org.js";

interface SkillAttributes {
    id: string;
    orgId: string;
    name: string;
    description: string;
}

type SkillCreationAttributes = Optional<SkillAttributes, "id">

@Table({
    tableName: "skills",
})
export class SkillDb extends Model<SkillAttributes, SkillCreationAttributes> {
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
        unique: "org_skill_name", 
    })
    declare orgId: string;

    @BelongsTo(() => OrgDb)
    declare org: Awaited<OrgDb>;

    @Column({
        type: TEXT,
        allowNull: false,
        unique: "org_skill_name",
    })
    declare name: string;

    @Column({
        type: TEXT,
        allowNull: true,
    })
    declare description?: string | null;

    toModel(): Skill {
        const model: Skill = {
            id: this.id,
            orgId: this.orgId,
            name: this.name,
           
        };
        if (this.description) {
            model.description = this.description;
        }
        return model;
    }

    loadModel(model: Skill): void {
        this.id = model.id ?? this.id;
        this.orgId = model.orgId;
        this.name = model.name;
        this.description = model.description ?? null;
    }
}