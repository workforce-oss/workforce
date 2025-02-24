import { randomUUID } from "crypto";
import { Logger } from "../../../../logging/logger.js";
import { WebhookRouteManager } from "../../../../manager/webhook_route_manager.js";
import { ChannelConfig, MessageRequest } from "../../model.js";
import { CustomChannelDestroyEvent, CustomChannelJoinEvent, CustomChannelMessageEvent, CustomChannelNewSessionEvent, CustomChannelRegisterEvent } from "./custom_channel_model.js";

export class CustomChannelClient {
    webhookPath: string;
    baseUrl: string;
    logger: Logger;
    config: ChannelConfig;

    constructor(config: ChannelConfig, onFailure: (objectId: string, error: string) => void) {
        this.webhookPath = `/${config.orgId}/${config.id}/chat`;
        this.baseUrl = config.variables?.base_url as string;
        this.logger = Logger.getInstance("custom-channel-client");
        this.config = config;

        if (!this.baseUrl) {
            throw new Error("Missing base_url variable");
        }

        this.register().catch((err: Error) => {
            if (onFailure) {
                onFailure(config.id!, err.message);
            }
        });
    }

    async join(args: {workerId: string, token: string, taskExecutionId?: string, threadId?: string, username?: string}): Promise<void> {
        const {workerId, token, taskExecutionId, threadId, username} = args;
        const manager = await WebhookRouteManager.getInstance();
        const event: CustomChannelJoinEvent = {
            channelId: this.config.id!,
            eventId: randomUUID(),
            timestamp: Date.now(),
            taskExecutionId,
            threadId,
            eventType: "join",
            workerId,
            token,
            username
        };
        return manager.sendWebhookEvent({
            orgId: this.config.orgId,
            objectId: this.config.id!,
            path: this.webhookPath,
            clientId: workerId,
            body: event
        });
    }

    async message(args: {message: MessageRequest, threadId: string, displayName?: string}): Promise<void> {
        const {message, threadId, displayName} = args;
        const manager = await WebhookRouteManager.getInstance();
        const event: CustomChannelMessageEvent = {
            channelId: this.config.id!,
            eventId: message.messageId,
            eventType: message.final ? "message_end" : "message_part",
            senderId: message.senderId,
            messageId: message.messageId,
            threadId: threadId,
            text: message.message,
            displayName: displayName,
            timestamp: message.timestamp,
            taskExecutionId: message.taskExecutionId,
        };
        if (message.image) {
            event.images = [{
                type: "base64",
                data: message.image,
                mediaType: "image/png"
            }];
        }
        if (message.toolCalls) {
            event.toolCalls = message.toolCalls;
        }
        return manager.sendWebhookEvent({
            orgId: this.config.orgId,
            objectId: this.config.id!,
            body: event,
            path: this.webhookPath,
            clientId: message.senderId
        });
    }

    async establishSession(args: {taskExecutionId: string, threadId: string}): Promise<void> {
        const {taskExecutionId, threadId} = args;
        const manager = await WebhookRouteManager.getInstance();
        const event: CustomChannelNewSessionEvent = {
            channelId: this.config.id!,
            eventId: randomUUID(),
            timestamp: Date.now(),
            taskExecutionId,
            eventType: "new_session",
            threadId,
        };
        return manager.sendWebhookEvent({
            orgId: this.config.orgId,
            objectId: this.config.id!,
            body: event,
            path: this.webhookPath,
            clientId: this.config.id!
        });
        
    }

    async destroy(id: string): Promise<void> {
        const manager = await WebhookRouteManager.getInstance();
        const event: CustomChannelDestroyEvent = {
            channelId: this.config.id!,
            eventId: randomUUID(),
            timestamp: Date.now(),
            eventType: "destroy",
        };
        return manager.sendWebhookEvent({
            path: this.webhookPath,
            clientId: id,
            orgId: this.config.orgId,
            objectId: this.config.id!,
            body: event,
        });   
    }

    async register(): Promise<void> {
        const manager = await WebhookRouteManager.getInstance();
        const event: CustomChannelRegisterEvent = {
            channelId: this.config.id!,
            eventId: randomUUID(),
            timestamp: Date.now(),
            eventType: "register",
            config: this.config
        };
        return manager.sendWebhookEvent({
            path: this.webhookPath,
            clientId: this.config.id!,
            orgId: this.config.orgId,
            objectId: this.config.id!,
            body: event,
        });
    }
}