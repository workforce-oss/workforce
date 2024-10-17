import { Subject, Subscription } from "rxjs";
import { Logger } from "../../../../logging/logger.js";
import { WebhookAuthClaimsValidation, WebhookRoute, WebhookRouteManager } from "../../../../manager/webhook_route_manager.js";
import { VariablesSchema } from "../../../base/variables_schema.js";
import { Channel } from "../../base.js";
import { ChannelMessageDb } from "../../db.message.js";
import { ChannelConfig, ChannelMessageEvent, MessageRequest } from "../../model.js";
import { NativeChannelMetadata } from "./native_channel_metadata.js";
import { NativeChannelMessage } from "./native_channel_model.js";
import { NativeChannelVoiceInterface } from "./native_channel_voice_interface.js";
import { RequestHandler } from "express";
import { jsonParse } from "../../../../util/json.js";
import { TaskExecutionDb } from "../../../task/db.task_execution.js";

export class NativeChannel extends Channel {
    logger = Logger.getInstance("NativeChannel");
    webhookRoute: WebhookRoute;
    webhookPath: string;
    subscription?: Subscription;
    voiceInterface?: NativeChannelVoiceInterface;
    ensureRouteDaemon?: NodeJS.Timeout;

    constructor(config: ChannelConfig, onFailure: (objectId: string, error: string) => void) {
        super(config, onFailure);
        this.webhookPath = `/${config.orgId}/${this.config.id}/chat`;

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
        if (this.config.variables?.voice_enabled) {
            this.setupVoiceInterface();
        }
        // do a short delay to ensure any existing destroy() calls have completed
        this.initWebsocket();
        this.ensureRoute();
    }

    public static defaultConfig(orgId: string): ChannelConfig {
        return NativeChannelMetadata.defaultConfig(orgId);
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
                const message = jsonParse<NativeChannelMessage>(event.body as string);
                if (!message) {
                    this.logger.error(`Invalid message received ${event.body as string}`);
                    return;
                }
                this.handleMessage(message).catch((error) => {
                    this.logger.error(`Error handling message `, error);
                });
            });
            this.logger.debug(`initWebsocket() subscribed to events for orgId=${this.config.orgId}, objectId=${this.config.id}`);
        }).catch((error: Error) => {
            this.logger.error(`initWebsocket() error adding route `, error);
            this.onFailure?.(this.config.id!, error.message);
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

    private setupVoiceInterface() {
        const transcriptionSubject = new Subject<{
            senderId: string,
            threadId: string,
            messageId: string,
            transcription: string
        }>();
        transcriptionSubject.subscribe({
            next: (transcription) => {
                this.dataCache.sessionThreads.get(transcription.threadId).then((threadSessionId) => {
                    this.logger.debug(`Received voice transcription
                threadId=${transcription.threadId}
                senderId=${transcription.senderId}
                messageId=${transcription.messageId}
                threadSessionId=${threadSessionId}
                `);
                    WebhookRouteManager.getInstance().then((manager) => {
                        const nativeMessage: NativeChannelMessage = {
                            threadId: transcription.threadId,
                            timestamp: Date.now(),
                            senderId: transcription.senderId,
                            messageId: transcription.messageId,
                            text: transcription.transcription,
                            final_part: true
                        }

                        manager.sendWebhookEvent({
                            body: nativeMessage,
                            objectId: this.config.id!,
                            orgId: this.config.orgId,
                            path: this.webhookPath,
                            clientId: transcription.threadId
                        })
                    }).catch((error: Error) => {
                        this.logger.error(`Error sending voice transcription to client: ${error.message}`);
                    });

                    const channelEvent: ChannelMessageEvent = {
                        channelId: this.config.id!,
                        senderId: transcription.senderId,
                        users: [transcription.senderId],
                        messageId: transcription.messageId,
                        message: transcription.transcription,
                        taskExecutionId: threadSessionId,
                        channelMessageData: {
                            "threadId": transcription.threadId,
                        }
                    }
                    this.subject.next(channelEvent);
                }).catch((error: Error) => {
                    this.logger.error(`Error getting session thread for voice transcription: ${error.message}`);
                });

            },
            error: (error: Error) => {
                this.logger.error(`Error in voice transcription: ${error.message}`);
            }
        });
        this.voiceInterface = new NativeChannelVoiceInterface({ config: this.config, transcriptionSubject });
    }

    private async handleMessage(message: NativeChannelMessage): Promise<void> {
        this.logger.debug(`Received message ${JSON.stringify(message)}`);
        let threadId: string | undefined = message.threadId;
        let sessionId: string | undefined = message.taskExecutionId;

        if (sessionId) {
            threadId = await this.dataCache.sessionThreads.get(sessionId) ?? threadId;
        } else if (threadId) {
            sessionId = await this.dataCache.threadSessions.get(threadId) ?? sessionId;
        }

        if (message.command === "join" && sessionId) {
            await this.addUser(sessionId);
            return;
        }

        const channelEvent: ChannelMessageEvent = {
            channelId: this.config.id!,
            senderId: message.senderId,
            users: [message.senderId],
            messageId: message.messageId,
            message: message.text,
            taskExecutionId: sessionId,
            channelMessageData: {
                "threadId": threadId,
            }
        }

        if (message.toolCalls) {
            channelEvent.toolCalls = message.toolCalls?.map((toolCall) => {
                return {
                    name: toolCall.name ?? "",
                    arguments: toolCall.arguments ?? {},
                    call_id: toolCall.call_id,
                    sessionId: threadId,
                    result: toolCall.result,
                    humanState: toolCall.humanState,
                    toolRequestId: toolCall.toolRequestId,
                    toolType: toolCall.toolType,
                    timestamp: toolCall.timestamp,
                    image: toolCall.image
                }
            });
            channelEvent.messageType = "tool_response";
        }
        if (message.image) {
            channelEvent.image = message.image;
        }

        this.logger.debug(`NativeChannel.handleMessage() Emitting message event ${JSON.stringify(channelEvent)}`);
        this.subject.next(channelEvent);

    }

    private async addUser(taskExecutionId: string) {
        const threadId = await this.dataCache.sessionThreads.get(taskExecutionId);
        if (!threadId) {
            this.logger.error(`No thread found for taskExecutionId=${taskExecutionId}`);
            throw new Error(`No thread found for taskExecutionId=${taskExecutionId}`);
        }
        this.logger.debug(`addUser() threadId=${threadId}`);
        // broadcast all messages
        const messages = await ChannelMessageDb.findAll({
            where: {
                taskExecutionId: taskExecutionId,
                channelId: this.config.id,
            }
        });

        const manager = await WebhookRouteManager.getInstance();

        // wait 1 second1 before sending messages to ensure the client has had time to connect
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const taskExecution = await TaskExecutionDb.findByPk(taskExecutionId);
        if (taskExecution?.status === "completed") {
            this.logger.debug(`addUser() Task execution ${taskExecutionId} is completed, not sending messages`);
            return;
        }

        messages.forEach((message) => {
            const request: MessageRequest | undefined = jsonParse(message.request);
            if (!request) {
                this.logger.error(`addUser() Invalid message request ${message.request}`);
                return;
            }
            const nativeMessage: NativeChannelMessage = {
                threadId: threadId,
                senderId: request.workerId,
                messageId: request.messageId,
                timestamp: request.timestamp,
                text: request.message,
                final_part: request.final,
                image: request.image
            }
            this.logger.debug(`addUser() sending message in channel ${this.config.id} message=${nativeMessage.text}`);
            manager.sendWebhookEvent({
                body: nativeMessage,
                objectId: this.config.id!,
                orgId: this.config.orgId,
                path: this.webhookPath,
                clientId: threadId
            })
        });
    }

    join(workerId: string, token: string, username?: string): Promise<void> {
        return this.dataCache.workerIdsToChannelUserIds.set(workerId, username ?? "Assistant");
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
    }

    async leave(): Promise<void> {
        // nothing to do    
    }

    async message(message: MessageRequest): Promise<void> {
        this.logger.debug(`message() sending message to workerId=${message.workerId} in channel ${this.config.id} message=${message.message}`);
        const threadId = await this.dataCache.sessionThreads.get(message.taskExecutionId);
        if (!threadId) {
            this.logger.error(`No thread found for taskExecutionId=${message.taskExecutionId}`);
            throw new Error(`No thread found for taskExecutionId=${message.taskExecutionId}`);
        }

        const userName = (await this.dataCache.workerIdsToChannelUserIds.get(message.workerId)) ?? "Assistant";

        const nativeMessage: NativeChannelMessage = {
            threadId: threadId,
            senderId: message.workerId,
            messageId: message.messageId,
            timestamp: message.timestamp,
            text: message.message,
            final_part: message.final,
            image: message.image,
            taskExecutionId: message.taskExecutionId,
            displayName: userName
        }

        if (message.toolCalls) {
            nativeMessage.toolCalls = message.toolCalls.map((toolCall) => {
                return {
                    name: toolCall.name,
                    arguments: toolCall.arguments,
                    call_id: toolCall.call_id,
                    sessionId: message.taskExecutionId,
                    result: toolCall.result,
                    humanState: toolCall.humanState,
                    toolType: toolCall.toolType,
                    toolRequestId: toolCall.toolRequestId,
                    timestamp: toolCall.timestamp,
                    image: toolCall.image,
                    taskExecutionId: message.taskExecutionId
                }
            });
        }
        if (message.image) {
            nativeMessage.image = message.image;
        }
        WebhookRouteManager.getInstance().then((manager) => {
            manager.sendWebhookEvent({
                body: nativeMessage,
                objectId: this.config.id!,
                orgId: this.config.orgId,
                path: this.webhookPath,
                clientId: threadId
            })
        }).catch((error: Error) => {
            this.logger.error(`Error sending message to client: ${error.message}`);
        });

        this.voiceInterface?.handleTextMessage(nativeMessage.threadId, nativeMessage.text);
    }

    webhookHandler: RequestHandler = (req, res) => {
        this.logger.debug(`webhookHandler() req=${JSON.stringify(req.body)}`);
        res.status(200).send("OK");
    }


    destroy(): Promise<void> {
        this.logger.info(`destroy() channel ${this.config.id}`);
        if (this.ensureRouteDaemon) {
            clearInterval(this.ensureRouteDaemon);
        }
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
        if (this.voiceInterface) {
            this.voiceInterface.destroy();
        }
        WebhookRouteManager.getInstance().then((manager) => {
            manager.removeRoute(this.webhookRoute);
        }).catch((error) => {
            this.logger.error(`destroy() error removing route `, error);
        });

        return super.destroy();
    }

    static VariablesSchema(): VariablesSchema {
        return NativeChannelMetadata.variablesSchema();
    }

}