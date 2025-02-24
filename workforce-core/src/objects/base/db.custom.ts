import { randomUUID } from "crypto";
import { Optional, TEXT, UUID } from "sequelize";
import { BelongsTo, Column, ForeignKey, Is, IsUUID, Model, Table } from "sequelize-typescript";
import { OrgDb } from "../../identity/db.org.js";
import { SpaceDb } from "../../identity/db.space.js";
import { CustomObject, CustomObjectVariablesSchema } from "./model.js";
import { ObjectType } from "../../model.js";
import { jsonParse } from "../../util/json.js";

interface CustomObjectAttributes {
    id: string;
    orgId: string;
    spaceId?: string;
    name: string;
    description: string;
    baseUrl: string;
    objectType: string;
    typeName: string;
    securityScheme?: string;
    variablesSchema?: string;
}

type CustomObjectCreationAttributes = Optional<CustomObjectAttributes, "id">;

@Table({
    tableName: "custom_object",
    indexes: [
        {
            fields: ["typeName", "orgId"],
            unique: true,
        }
    ]
})
export class CustomObjectDb extends Model<CustomObjectAttributes, CustomObjectCreationAttributes> implements CustomObjectAttributes {
    @Column({
        type: UUID,
        defaultValue: randomUUID,
        primaryKey: true
    })
    
    declare id: string;
    
    @IsUUID(4)
    @ForeignKey(() => OrgDb)
    @Column({
        type: UUID,
        allowNull: false,
    })
    declare orgId: string;

    @BelongsTo(() => OrgDb)
    declare org: Awaited<OrgDb>;

    @ForeignKey(() => SpaceDb)
    @Column({
        type: UUID,
        allowNull: true,
    })
    declare spaceId: string;

    @BelongsTo(() => SpaceDb)
    declare space: Awaited<SpaceDb>;

    @Is("name", (value: string) => {
        if (value.length > 255) {
            throw new Error("Name must be less than 255 characters");
        }
    })
    @Column({
        type: TEXT,
        allowNull: false,
    })
    declare name: string;

    @Is("description", (value: string) => {
        if (value.length > 2048) {
            throw new Error("Description must be less than 2048 characters");
        }
    })
    @Column({
        type: TEXT,
    })
    declare description: string;

    @Column({
        type: TEXT,
        allowNull: false,
    })
    declare baseUrl: string;

    @Column({
        type: TEXT,
        allowNull: false,
    })
    declare objectType: ObjectType;

    @Column({
        type: TEXT,
        allowNull: false,
    })
    declare typeName: string;

    @Column({
        type: TEXT,
    })
    declare variablesSchema?: string;

    @Column({
        type: TEXT,
    })
    declare securityScheme?: string

    public toModel(): CustomObject {
        const model: CustomObject = {
            id: this.id,
            orgId: this.orgId,
            name: this.name,
            description: this.description,
            baseUrl: this.baseUrl,
            objectType: this.objectType,
            typeName: this.typeName,    
        };

        if (this.spaceId) {
            model.spaceId = this.spaceId;
        }

        if (this.variablesSchema) {
            model.variablesSchema = jsonParse<CustomObjectVariablesSchema>(this.variablesSchema);
        }

        if (this.securityScheme) {
            model.securityScheme = jsonParse<Record<string, unknown>>(this.securityScheme);
        }

        return model;
    }

    public loadModel(model: CustomObject): CustomObjectDb {
        if (model.id) {
            this.id = model.id;
        }
        this.orgId = model.orgId;
        this.name = model.name;
        this.description = model.description;
        this.baseUrl = model.baseUrl;
        this.objectType = model.objectType;
        this.typeName = model.typeName;

        if (model.spaceId) {
            this.spaceId = model.spaceId;
        }

        if (model.variablesSchema) {
            this.variablesSchema = JSON.stringify(model.variablesSchema);
        }

        if (model.securityScheme) {
            this.securityScheme = JSON.stringify(model.securityScheme);
        }

        return this
    }


}