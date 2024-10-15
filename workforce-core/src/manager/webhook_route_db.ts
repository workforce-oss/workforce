import { BOOLEAN, Optional, TEXT, UUID } from "sequelize";
import { BelongsTo, Column, ForeignKey, Model, Table } from "sequelize-typescript";
import { randomUUID } from "crypto";
import { OrgDb } from "../identity/db.org.js";

interface WebhookRouteAttributes {
    id: string;
    orgId: string;
    objectId: string;
    path: string;
    taskExecutionId?: string;
    webSocket?: boolean;
    authOptions?: string | null;
    anonymous_access?: boolean;
    client_identifier?: string;
    response?: string;
}

type WebhookRouteCreationAttributes = Optional<WebhookRouteAttributes, "id">

@Table({
    tableName: "webhook_routes",
})
export class WebhookRouteDb extends Model<WebhookRouteAttributes, WebhookRouteCreationAttributes> {
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
        type: UUID,
        allowNull: false,
    })
    declare objectId: string;
    
    @Column({
        type: TEXT,
        allowNull: false,
        unique: true,
    })
    declare path: string;

    @Column({
        type: UUID,
        allowNull: true,
    })
    declare taskExecutionId?: string;

    @Column({
        type: BOOLEAN,
        allowNull: true,
        defaultValue: false,
    })
    declare webSocket?: boolean;

    @Column({
        type: BOOLEAN,
        allowNull: true,
        defaultValue: false,
    })
    declare anonymous_access?: boolean;

    @Column({
        type: TEXT,
        allowNull: true,
    })
    declare authOptions?: string | null;

    @Column({
        type: TEXT,
        allowNull: true,
    })
    declare client_identifier?: string;

    @Column({
        type: TEXT,
        allowNull: true,
    })
    declare response?: string;
}