import { Subscription } from "rxjs";
import { Logger } from "../../../../logging/logger.js";
import { Channel } from "../../base.js";
import { ChannelConfig, MessageRequest } from "../../model.js";
import { WebhookAuthClaimsValidation, WebhookRoute, WebhookRouteManager } from "../../../../manager/webhook_route_manager.js";
import { jsonParse } from "../../../../util/json.js";
import { CustomChannelClient } from "./custom_channel_client.js";
import { RequestHandler } from "express";
import { CustomChannelEvent, CustomChannelMessageEvent } from "./custom_channel_model.js";

export class CustomChannel extends Channel {
    logger: Logger = Logger.getInstance("custom-channel");
    webhookRoute: WebhookRoute;
    webhookPath: string;
    subscription?: Subscription;
    ensureRouteDaemon?: NodeJS.Timeout;
    customChannelClient: CustomChannelClient;

    constructor(config: ChannelConfig, onFailure: (objectId: string, error: string) => void) {
        super(config, onFailure);
        this.webhookPath = `/${config.orgId}/${this.config.id}/chat`;
        if (!config.variables?.base_url) {
            throw new Error("Missing base_url variable");
        }
        this.customChannelClient = new CustomChannelClient(config, onFailure);

        let claims: Record<string, WebhookAuthClaimsValidation> | undefined = undefined
        if (config.variables?.oauth2_claims) {
            claims = jsonParse<Record<string, WebhookAuthClaimsValidation>>(config.variables?.oauth2_claims as string);
        }

        this.webhookRoute = {
            objectId: config.id!,
            path: this.webhookPath,
            orgId: config.orgId,
            authOptions: {
                authRequired: !config.variables?.anonymous_access,
                issuerBaseURL: config.variables?.oauth2_issuer_uri as string | undefined,
                audience: config.variables?.oauth2_audience as string | undefined,
                claims
            },
            client_identifier: "threadId",
            webSocket: true
        };

        // do a short delay to ensure any existing destroy() calls have completed
        this.initWebsocket();
        this.ensureRoute();

    }

    private initWebsocket() {
        WebhookRouteManager.getInstance().then((manager) => {
            manager.addRoute(this.webhookRoute);
            this.logger.debug(`initWebsocket() added route ${JSON.stringify(this.webhookRoute)}`);
            if (this.subscription) {
                this.subscription.unsubscribe();
            }
            this.subscription = manager.subscribeToWebhookEvents(this.config.orgId, this.config.id!, this.webhookRoute.path, (event) => {
                this.logger.debug(`Received event ${JSON.stringify(event)}`);
                const channelEvent = jsonParse<CustomChannelEvent>(event.body as string);
                if (!channelEvent) {
                    this.logger.error(`Invalid message received ${event.body as string}`);
                    return;
                }
                if (channelEvent.senderId === this.config.id) {
                    this.logger.debug(`Ignoring message from self`);
                    return;
                }
                
                if (channelEvent.eventType === "message" || channelEvent.eventType === "message_part" || channelEvent.eventType === "message_end") {
                    this.handleMessage(channelEvent).catch((error) => {
                        this.logger.error(`Error handling message `, error);
                    });
                }
            });
            this.logger.debug(`initWebsocket() subscribed to events for orgId=${this.config.orgId}, objectId=${this.config.id}`);
        }).catch((error: Error) => {
            this.logger.error(`initWebsocket() error adding route `, error);
            this.onFailure?.(this.config.id!, error.message);
        });
    }

    private async handleMessage(event: CustomChannelMessageEvent): Promise<void> {
        this.logger.debug(`Received message ${JSON.stringify(event)}`);

        let threadId: string | undefined = event?.threadId as string | undefined;
        let sessionId: string | undefined = event.taskExecutionId;


        if (sessionId) {
            threadId = await this.dataCache.sessionThreads.get(sessionId) ?? threadId;
        } else if (threadId) {
            sessionId = await this.dataCache.threadSessions.get(threadId) ?? sessionId;
        }


        this.logger.debug(`CustomChannel.handleMessage() Emitting message event ${JSON.stringify(event)}`);
        this.subject.next({
            channelId: this.config.id!,
            message: event.text ?? "",
            senderId: event.senderId!,
            messageId: event.messageId,
            users: [],
            channelMessageData: { threadId },
            taskExecutionId: sessionId,
            image: event.images?.[0]?.data,
            messageType: "chat-message",
            toolCalls: event.toolCalls
        });

    }


    private ensureRoute() {
        if (this.ensureRouteDaemon) {
            clearInterval(this.ensureRouteDaemon);
        }
        this.ensureRouteDaemon = setInterval(() => {
            WebhookRouteManager.routeExists(this.webhookRoute.path).then((exists) => {
                if (!exists) {
                    this.initWebsocket();
                }
            }).catch((error: Error) => {
                this.logger.error(`Error checking if route exists: ${error.message}`);
            });
        }, 1000 * 5);
    }


    message(message: MessageRequest): Promise<void> {
        return this.customChannelClient.message({
            message,
            threadId: message.channelMessageData?.threadId as string,
            displayName: this.config.variables?.display_name as string | undefined
        });
    }

    async establishSession(taskExecutionId: string, originalMessageData?: Record<string, string>): Promise<void> {
        if (await this.dataCache.sessionThreads.has(taskExecutionId) || await this.dataCache.threadSessions.has(taskExecutionId)) {
            this.logger.debug(`establishSession() Task exeuction ${taskExecutionId} already has a session`);
            return;
        }
        const threadId = originalMessageData?.threadId;
        if (!threadId) {
            this.logger.error(`establishSession() No threadId found for task execution`, taskExecutionId);
            throw new Error(`establishSession() threadId not found in originalMessageData=${JSON.stringify(originalMessageData)}`);
        }
        this.logger.debug(`establishSession() taskExecutionId=${taskExecutionId} threadId=${threadId}`);
        await this.dataCache.sessionThreads.set(taskExecutionId, threadId);
        await this.dataCache.threadSessions.set(threadId, taskExecutionId);
        return this.customChannelClient.establishSession({taskExecutionId, threadId});
    }

    async join(workerId: string, token: string, username?: string): Promise<void> {
        await this.dataCache.workerIdsToChannelUserIds.set(workerId, username ?? "Assistant").catch((error) => {
            this.logger.error(`Error setting workerId to channelUserId mapping`, error);
            throw error;
        });
        return this.customChannelClient.join({workerId, token, username});
    }

    async leave(): Promise<void> {
        // not implemented
    }

    async destroy(): Promise<void> {
        clearInterval(this.ensureRouteDaemon);
        this.customChannelClient.destroy(this.config.id!).catch((error) => {
            this.logger.error(`Error destroying custom channel client`, error);
        });
        return super.destroy();
    }

    webhookHandler: RequestHandler = (req, res) => {
        this.logger.debug(`webhookHandler() req=${JSON.stringify(req.body)}`);
        res.status(200).send("OK");
    }
}