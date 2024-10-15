import { randomUUID } from "crypto";
import { BIGINT, Optional, TEXT, UUID, JSON, BOOLEAN } from "sequelize";
import { BelongsTo, Column, ForeignKey, Model, Table } from "sequelize-typescript";
import { WorkerChatSessionDb } from "./db.worker_chat_session.js";
import { ChatMessage, ChatRole } from "./model.js";
import { jsonParse } from "../../util/json.js";

interface WorkerChatMessageAttributes {
    id: string;
    sessionId: string;
    role: string;
    timestamp: number;
    username?: string;
    senderId?: string;
    text?: string;
    state?: Record<string, unknown> | string;
    done?: boolean;
    functionCall?: string;
    image?: string;
    channelMessageId?: string;
    cancelled?: boolean;
}

type WorkerChatMessageCreationAttributes = Optional<WorkerChatMessageAttributes, "id">

@Table({
    tableName: "worker_chat_messages",
})
export class WorkerChatMessageDb extends Model<WorkerChatMessageAttributes, WorkerChatMessageCreationAttributes> {
    @Column({
        type: UUID,
        defaultValue: randomUUID,
        primaryKey: true
    })
    declare id: string;
    
    @ForeignKey(() => WorkerChatSessionDb)
    @Column({
        type: UUID,
        allowNull: false,
    })
    declare sessionId: string;

    @BelongsTo(() => WorkerChatSessionDb, {foreignKey: "sessionId", onDelete: "CASCADE", hooks: true})
    declare session: Awaited<WorkerChatSessionDb>;

    @Column({
        type: TEXT,
    })
    declare role: string;

    @Column({
        type: BIGINT,
    })
    declare timestamp: number;

    @Column({
        type: TEXT,
        allowNull: true,
    })
    declare senderId?: string | null;

    @Column({
        type: TEXT,
        allowNull: true,
    })
    declare username?: string | null;

    @Column({
        type: TEXT,
        allowNull: true,
    })
    declare text?: string | null;

    @Column({
        type: TEXT,
        allowNull: true,
    })
    declare image?: string | null;

    @Column({
        type: JSON,
        allowNull: true,
    })
    declare state?: Record<string, unknown> | string | null;

    @Column({
        type: BOOLEAN,
        allowNull: true,
    })
    declare done?: boolean | null;

    @Column({
        type: JSON,
        allowNull: true,
    })
    declare functionCall?: string | null;

    @Column({
        type: TEXT,
        allowNull: true,
    })
    declare channelMessageId?: string | null;

    @Column({
        type: BOOLEAN,
        allowNull: true,
    })
    declare cancelled?: boolean | null;

    public toModel(): ChatMessage {
        const model: ChatMessage = {
            id: this.id,
            sessionId: this.sessionId,
            role: this.role as ChatRole,
            timestamp: this.timestamp,
        };
        if (this.senderId) {
            model.senderId = this.senderId;
        }
        if (this.username) {
            model.username = this.username;
        }
        if (this.text) {
            model.text = this.text;
        }
        if (this.image) {
            model.image = this.image;
        }
        if (this.state) {
            model.state = this.state;
        }
        if (this.done) {
            model.done = this.done as boolean;
        }
        if (this.functionCall) {
            model.toolCalls = jsonParse(this.functionCall);
        }
        if (this.channelMessageId) {
            model.channelMessageId = this.channelMessageId;
        }
        if (this.cancelled) {
            model.cancelled = this.cancelled as boolean;
        }
        return model;
    }
}