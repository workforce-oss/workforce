import { RequestHandler } from "express";
import { Logger } from "../../../../logging/logger.js";
import { VariablesSchema } from "../../../base/variables_schema.js";
import { Channel } from "../../base.js";
import { ChannelConfig, ChannelMessageEvent, MessageRequest } from "../../model.js";
import { MockChannelMetadata } from "./mock_channel_metadata.js";

export class MockChannel extends Channel {
    logger = Logger.getInstance("MockChannel");
    private _messageCount = 0;
    private _endCount = 0;

    constructor(config: ChannelConfig, onFailure: (objectId: string, error: string) => void) {
        super(config, onFailure);
        if (config.variables?.endCount) {
            this._endCount = config.variables.endCount as number;
        }
    }

    public static defaultConfig(orgId: string): ChannelConfig {
        return MockChannelMetadata.defaultConfig(orgId);
    }

    message(message: MessageRequest): Promise<void> {
        this.logger.debug(`message() message=${JSON.stringify(message)}`);
        if (message.senderId == this.config.id) {
            return Promise.resolve();
        }
        const userMessageEvent: ChannelMessageEvent = {
            channelId: this.config.id!,
            taskExecutionId: message.taskExecutionId,
            senderId: this.config.id!,
            users: [message.senderId],
            messageId: message.messageId,
            message: `mock-message-${this._messageCount}`,
            messageType: message.messageType
        }

        this.logger.debug(`message() messageCount=${this._messageCount} endCount=${this._endCount}`);

        const messages = this.config.variables?.messages as string[] | undefined;
        
        let finalMessage = this.config.variables?.finalMessage as string | undefined | null
        if (!finalMessage) {
            finalMessage = "mock-final-message";
        }
        

        if (messages && this._messageCount < messages.length) {
            userMessageEvent.message = messages[this._messageCount];
        } else if (messages && this._messageCount === messages.length) {
            userMessageEvent.message = finalMessage;
        } else if (this._messageCount > this._endCount) {
            return Promise.resolve();
        } else if (this._messageCount === this._endCount || this._messageCount === this._endCount - 1) {
            this.logger.error(`message() messageCount=${this._messageCount} endCount=${this._endCount}`);
            userMessageEvent.message = finalMessage;
        }

        this._messageCount++;
        this.logger.debug(`message() userMessageEvent=${JSON.stringify(userMessageEvent)}`);
        setTimeout(() => {
            this.subject.next(userMessageEvent);
        }, 100);
        return Promise.resolve();
    }

    establishSession(taskExecutionId: string): Promise<void> {
        this.logger.debug(`establishSession() taskExecutionId=${taskExecutionId}`);
        return Promise.resolve();
    }

    static variablesSchema(): VariablesSchema {
        return MockChannelMetadata.variablesSchema();
    }

    webhookHandler: RequestHandler = (req, res) => {
        this.logger.debug(`webhookHandler() req=${JSON.stringify(req.body)}`);
        res.send("OK");
    }

    join(): Promise<void> {
        return Promise.resolve();
    }
    leave(): Promise<void> {
        return Promise.resolve();
    }
}