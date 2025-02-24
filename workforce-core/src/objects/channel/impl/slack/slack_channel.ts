import { SocketModeClient } from "@slack/socket-mode";
import { WebClient } from "@slack/web-api";
import { Logger } from "../../../../logging/logger.js";
import { VariablesSchema } from "../../../base/variables_schema.js";
import { Channel } from "../../base.js";
import { ChannelConfig, ChannelMessageEvent, MessageRequest } from "../../model.js";
import { SlackChannelMetadata } from "./slack_channel_metadata.js";
import { RequestHandler } from "express";


export class SlackChannel extends Channel {
    logger = Logger.getInstance("SlackChannel");

    private client: SocketModeClient;
    private workerClients = new Map<string, WebClient>();

    private channelId?: string;

    constructor(config: ChannelConfig, onFailure: (objectId: string, error: string) => void) {
        super(config, onFailure);
        this.channelId = config.variables?.channel_id as string | undefined;
        this.client = new SocketModeClient({
            appToken: config.variables?.app_token as string | undefined,
        });


        this.initClient();
    }

    public static defaultConfig(orgId: string): ChannelConfig {
        return SlackChannelMetadata.defaultConfig(orgId);
    }

    private initClient() {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.client.on("message", async ({ event, ack }) => {
            const msg = event as {
                user: string,
                channel: string,
                ts: string,
                text: string,
                type: string,
                subtype: string,
                thread_ts?: string,
                username?: string,
                bot_id?: string,
            };

            this.logger.debug(`Received a message event: user ${msg.user} in channel ${msg.channel} with thread ${msg.ts} says ${msg.text}`);
            await (ack as () => Promise<void>)();
            this.logger.debug(`acknowledged message event`)

            if (msg.channel !== this.channelId) {
                this.logger.debug(`event channel ${msg.channel} does not match channel id ${this.channelId}`);
                return;
            }
            //TODO: Handle user_typing event as an interrupt
            if (!(msg.type === "message" || msg.type === "app_mention")) {
                this.logger.debug(`event type ${msg.type} is not message or app_mention`);
                return;
            }

            if (msg.subtype) {
                this.logger.debug(`event subtype ${msg.subtype} is not null`);
                return;
            }

            const message = this.removeMention(msg.text);

            this.logger.debug(`Slack event: ${JSON.stringify(event)}`);
            let slackThread = msg.thread_ts;
            if (!slackThread || slackThread === "") {
                slackThread = msg.ts;
            }

            const threadSessionId = await this.dataCache.threadSessions.get(slackThread);

            let workerId = undefined;
            if (msg.username) {
                workerId = await this.dataCache.usernamesToWorkerIds.get(msg.username);
            } else if (msg.bot_id) {
                // Ignore bot messages without usernames
                return;
            }

            const channelEvent: ChannelMessageEvent = {
                channelId: this.config.id!,
                senderId: workerId ?? msg.user,
                users: msg.user ? [msg.user] : [msg.bot_id!],
                messageId: msg.ts,
                message: message,
                taskExecutionId: threadSessionId,
                channelMessageData: {
                    "thread_ts": msg.thread_ts ?? "",
                    "ts": msg.ts,
                    "threadId": slackThread,
                }
            };
            this.logger.debug(`SlackChannel.onMessage() sending event ${JSON.stringify(channelEvent)}`);
            this.subject.next(channelEvent);
        });
        this.client.on("ping", ({ ack }) => {
            (ack as () => Promise<void>)().catch((error) => {
                this.logger.error(`SlackChannel.ping() error=${error}`);
            });
        });
        this.client.start().catch((error: Error) => {
            this.logger.error(`SlackChannel.initClient() error=${error}`);
            this.onFailure(this.config.id!, error.message);
        });
    }



    private formatMessage(message: string): string {
        message = this.convertMarkdownToMrkdwn(message);
        message = this.convertRawLinktoMrkdwn(message);
        return message
    }

    private convertMarkdownToMrkdwn(message: string): string {
        // convert markdown to mrkdwn
        // links go from [text](url) to <url|text>
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        return message.replace(linkRegex, "<$2|$1>");
    }

    private convertRawLinktoMrkdwn(message: string): string {
        // convert raw link to mrkdwn
        // links go from <http://url> to <url>
        const linkRegex = /[^<]{0,1}http[s]?:\/\/[^ ]*/g;
        for (const linkMatch of message.matchAll(linkRegex)) {
            let link = linkMatch[0];
            if (!link.startsWith("http")) {
                link = link.slice(1);
            }

            const hostRegex = /http[s]?:\/\/[^/]*\//;
            const hostMatch = hostRegex.exec(link);
            if (!hostMatch) {
                message = message.replace(linkMatch[0], ` <${link}|Click Here>`);
                continue;
            } else {
                hostMatch.forEach(() => {
                    // now just get the last two parts of the host
                    const hostParts = hostMatch[0].split(".");
                    let host = hostParts[hostParts.length - 2] + "." + hostParts[hostParts.length - 1];
                    // if it ends with a slash, remove it
                    if (host.endsWith("/")) {
                        host = host.slice(0, -1);
                    }
                    message = message.replace(linkMatch[0], ` <${link}|${host}>`);
                });
            }
        }
        return message;
    }

    private removeMention(message: string): string {
        // remove <@[^>]*>
        const mentionRegex = new RegExp("<@[^>]*>");
        return message.replace(mentionRegex, "").trim();
    }
    async join(workerId: string, token: string, username?: string): Promise<void> {
        // remove trailing pipe from token, we can't figure out why it's there
        if (token.endsWith("|")) {
            token = token.slice(0, -1);
        }
        const webClient = new WebClient(token);
        const result = await webClient.auth.test().catch((error: Error) => {
            this.logger.error(`SlackChannel.join() workerId=${workerId} token=${token} error=${error.message}`);
        });
        if (!result || !result.ok || !result.user_id) {
            throw new Error(`SlackChannel.join() error joining workerId=${workerId} token=${token} result=${JSON.stringify(result)}`);
        }

        await this.dataCache.workerIdsToChannelUserIds.set(workerId, result.user_id);
        this.workerClients.set(workerId, webClient);
        if (username) {
            await this.dataCache.usernamesToWorkerIds.set(username, workerId);
        }
    }

    leave(workerId: string): Promise<void> {
        this.workerClients.delete(workerId);
        return this.dataCache.workerIdsToChannelUserIds.delete(workerId);
    }

    async establishSession(taskExecutionId: string, originalMessageData?: Record<string, string>): Promise<void> {
        if (await this.dataCache.sessionThreads.has(taskExecutionId) || await this.dataCache.threadSessions.has(taskExecutionId)) {
            this.logger.debug(`establishSession() Task exeuction ${taskExecutionId} already has a session`);
            return;
        }

        let threadId = originalMessageData?.thread_ts;
        if (!threadId || threadId === "") {
            threadId = originalMessageData?.ts;
        }

        if (threadId) {
            this.logger.debug(`SlackChannel.establishSession() taskExecutionId=${taskExecutionId} threadId=${threadId}`);
            await this.dataCache.sessionThreads.set(taskExecutionId, threadId);
            await this.dataCache.threadSessions.set(threadId, taskExecutionId);
        } else {
            this.logger.error(`SlackChannel.establishSession() threadId not found in originalMessageData ${JSON.stringify(originalMessageData)}`);
            throw new Error(`SlackChannel.establishSession() threadId not found in originalMessageData ${JSON.stringify(originalMessageData)}`);
        }
    }

    async appendToMessageByEditting(message: MessageRequest): Promise<void> {
        const webClient = this.workerClients.get(message.workerId);
        const slackMessageId = await this.dataCache.channelMessageIdsToImplementationIds.get(message.messageId);
        if (!slackMessageId) {
            // it should be there, try again in a bit

            this.logger.error(`SlackChannel.appendToMessageByEditting() slackMessageId not found for messageId ${message.messageId}`);
            return undefined;

        }
        if (!webClient) {
            this.logger.error(`SlackChannel.appendToMessageByEditting() workerId ${message.workerId} not found`);
            return undefined;
        }

        const existing = await this.dataCache.messageBuffers.get(message.messageId);
        await this.dataCache.messageBuffers.set(message.messageId, `${existing}${message.message}`);

        const newMessage = await this.dataCache.messageBuffers.get(message.messageId);
        await webClient.chat.update({
            channel: this.channelId!,
            ts: slackMessageId,
            text: newMessage,
        });
    }

    async overwriteMessageByEditting(message: MessageRequest): Promise<void> {
        const webClient = this.workerClients.get(message.workerId);
        const slackId = new Promise<string>((resolve, reject) => {
            let done = false;
            const interval = setInterval(() => {
                this.dataCache.channelMessageIdsToImplementationIds.get(message.messageId).then((slackMessageId) => {
                    if (slackMessageId) {
                        done = true;
                        clearInterval(interval);
                        resolve(slackMessageId);
                    }
                }).catch((error) => {
                    this.logger.error(`SlackChannel.overwriteMessageByEditting() error=${error}`);
                });
            }, 200);
            setTimeout(() => {
                clearInterval(interval);
                if (!done) {
                    reject(new Error("SlackChannel.overwriteMessageByEditting() slackMessageId not found"));
                }
            }, 5000);
        });
        const slackMessageId = await slackId;
        if (!slackMessageId) {
            this.logger.error(`SlackChannel.overwriteMessageByEditting() slackMessageId not found for messageId ${message.messageId}`);
            return undefined;
        }
        if (!webClient) {
            this.logger.error(`SlackChannel.overwriteMessageByEditting() workerId ${message.workerId} not found`);
            return undefined;
        }

        await this.dataCache.messageBuffers.set(message.messageId, message.message);
        await webClient.chat.update({
            channel: this.channelId!,
            ts: slackMessageId,
            text: message.message,
        });
    }

    private async shouldEditExistingMessage(message: MessageRequest): Promise<boolean> {
        return await this.dataCache.messageBuffers.has(message.messageId)
    }

    async message(message: MessageRequest): Promise<void> {
        this.logger.debug(`SlackChannel.message() sending message ${message.message} to channel ${this.channelId} with id ${message.messageId}`);
        if (!this.channelId) {
            this.logger.error(`SlackChannel.message() channelId not initialized`);
            throw new Error("SlackChannel.message() channelId not initialized");
        }

        const threadId = await this.dataCache.sessionThreads.get(message.taskExecutionId);

        this.logger.debug(`SlackChannel.message() threadId=${threadId} message=${message.message} messageId=${message.messageId}`);
        const webClient = this.workerClients.get(message.workerId);
        const botUserId = await this.dataCache.workerIdsToChannelUserIds.get(message.workerId);
        if (!webClient || !botUserId) {
            this.logger.error(`SlackChannel.message() workerId ${message.workerId} not found`);
            throw new Error(`SlackChannel.message() workerId ${message.workerId} not found`);
        }

        if (message.final) {
            if (message.message != "") {
                const messageBufferExists = await this.dataCache.messageBuffers.has(message.messageId);
                if (messageBufferExists) {
                    this.overwriteMessageByEditting(message).catch((error) => {
                        this.logger.error(`SlackChannel.message() error=${error}`);
                    });
                } else {
                    this.sendMessageToSlack(message, webClient, threadId).catch((error) => {
                        this.logger.error(`SlackChannel.message() error=${error}`);
                    });
                }
            }
            this.logger.debug(`SlackChannel.message() final message received for taskExecutionId=${message.taskExecutionId}`);
            setTimeout(() => {
                this.dataCache.channelMessageIdsToImplementationIds.delete(message.messageId).catch((error) => {
                    this.logger.error(`SlackChannel.message() error=${error}`);
                });
                this.dataCache.messageBuffers.delete(message.messageId).catch((error) => {
                    this.logger.error(`SlackChannel.message() error=${error}`);
                });
            }, 10000);
            return;
        }

        if (message.message !== "") {
            const messageBufferExists = await this.dataCache.messageBuffers.has(message.messageId);
            if (messageBufferExists) {
                this.appendToMessageByEditting(message).catch((error) => {
                    this.logger.error(`SlackChannel.message() error=${error}`);
                });
            } else {
                this.dataCache.messageBuffers.set(message.messageId, message.message).catch((error) => {
                    this.logger.error(`SlackChannel.message() error=${error}`);
                });
                this.sendMessageToSlack(message, webClient, threadId).catch((error) => {
                    this.logger.error(`SlackChannel.message() error=${error}`);
                });
            }
        }
    }

    private async sendMessageToSlack(message: MessageRequest, webClient: WebClient, threadId?: string): Promise<void> {
        const response = await webClient.chat.postMessage({
            channel: this.channelId!,
            text: this.formatMessage(message.message),
            thread_ts: threadId,
            username: message.username,
        });
        this.logger.debug(`SlackChannel.message() sent message ${message.message} to channel ${this.channelId}`);
        if (!threadId) {
            this.dataCache.sessionThreads.set(message.taskExecutionId, response.ts ?? "").catch((error) => {
                this.logger.error(`SlackChannel.message() error=${error}`);
            });
            this.dataCache.threadSessions.set(response.ts ?? "", message.taskExecutionId).catch((error) => {
                this.logger.error(`SlackChannel.message() error=${error}`);
            });
        }
        this.logger.debug(`SlackChannel.message() setting channelMessageIdsToSlackMessageIds ${message.messageId} to ${response.ts}`);
        this.dataCache.channelMessageIdsToImplementationIds.set(message.messageId, response.ts ?? "").catch((error) => {
            this.logger.error(`SlackChannel.message() error=${error}`);
        });
    }

    webhookHandler: RequestHandler = (req, res) => {
        this.logger.debug(`webhookHandler() req=${JSON.stringify(req.body)}`);
        res.send("OK");
    }


    async destroy(): Promise<void> {
        await this.client.disconnect();
        return super.destroy();
    }

    static variablesSchema(): VariablesSchema {
        return SlackChannelMetadata.variablesSchema();
    }
}