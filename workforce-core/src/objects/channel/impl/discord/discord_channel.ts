import { AnyThreadChannel, ChannelType, Client, Events, GatewayIntentBits, Message, MessageType } from "discord.js";
import { Logger } from "../../../../logging/logger.js";
import { VariablesSchema } from "../../../base/variables_schema.js";
import { Channel } from "../../base.js";
import { ChannelConfig, ChannelMessageEvent, MessageRequest } from "../../model.js";
import { DiscordChannelMetadata } from "./discord_channel_metadata.js";
import { RequestHandler } from "express";

export class DiscordChannel extends Channel {
    logger = Logger.getInstance("DiscordChannel");

    private client: Client;
    private channelId?: string;

    constructor(config: ChannelConfig, onFailure: (objectId: string, error: string) => void) {
        super(config, onFailure);
        this.client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildIntegrations] });
        this.channelId = config.variables?.channel_id as string | undefined;
        this.initClient();
    }

    private static defaultConfig(orgId: string): ChannelConfig {
        return DiscordChannelMetadata.defaultConfig(orgId);
    }

    private initClient() {
        if (!this.config.variables) {
            this.logger.error("Discord channel config is missing variables");
            throw new Error("Discord channel config is missing variables");
        }
        if (!this.config.variables.bot_token) {
            this.logger.error("Discord channel config is missing bot_token");
            throw new Error("Discord channel config is missing bot_token");
        }

        this.client.once(Events.ClientReady, () => {
            this.logger.info("Discord client is ready");
        });

        this.client.on(Events.MessageCreate, message => async () => {
            this.logger.debug(`Discord Message: ${JSON.stringify(message)}`);
            const threadExistsForChannel = await this.dataCache.sessionThreads.has(message.channelId);
            if (message.channelId !== this.channelId && !threadExistsForChannel) {
                this.logger.debug("Received message from channel", message.channelId, "but expected", this.channelId);
                return;
            }

            if (message.channel.type === ChannelType.DM) {
                this.logger.info("Received DM from", message.author.username);
                this.handleDirectMessage(message).catch((error) => {
                    this.logger.error("Failed to handle direct message", error);
                });
            } else if (message.channel.type === ChannelType.PublicThread || message.channel.type === ChannelType.PrivateThread) {
                this.logger.info("Received message in guild", message.guild?.name, "from", message.author.username, "in thread", message.channel.name);
                this.handleThreadedMessage(message).catch((error) => {
                    this.logger.error("Failed to handle threaded message", error);
                });
            } else if (message.channel.type === ChannelType.GuildText) {
                this.logger.info("Received message in guild", message.guild?.name, "from", message.author.username, "in channel", message.channel.name);
                this.handleChannelMessage(message).catch((error) => {
                    this.logger.error("Failed to handle channel message", error);
                });
            }
        });

        this.client.login(this.config.variables.bot_token as string).then(() => {
            this.logger.info("Discord client logged in");

        }).catch((error) => {
            this.logger.error("Discord client failed to login", error);
            this.onFailure(this.config.id!, "Discord client failed to login");
        });
    }

    private async handleDirectMessage(message: Message) {
        if (!message.author.id) {
            this.logger.error("Received DM from unknown user");
            return;
        }
        let workerId = undefined;
        if (message.author.username) {
            workerId = await this.dataCache.usernamesToWorkerIds.get(message.author.username);
            this.logger.debug(`DiscordChannel.handleDirectMessage() workerId=${workerId}`);
        }

        this.logger.warn("DMs are not supported yet");
    }

    private async handleThreadedMessage(message: Message) {
        if (!message.author.id) {
            this.logger.error("Received message from unknown user");
            return;
        }

        const threadSessionId = await this.dataCache.sessionThreads.get(message.channelId ?? "");
        if (!threadSessionId) {
            this.logger.error("Received message from unknown thread");
            return;
        }
        this.logger.debug(`DiscordChannel.handleThreadedMessage() message=${JSON.stringify(message)}`);

        let workerId = undefined;
        if (message.author.username) {
            workerId = await this.dataCache.usernamesToWorkerIds.get(message.author.username);
            this.logger.debug(`DiscordChannel.handleThreadedMessage() workerId=${workerId}`);
        } else if (message.author.bot) {
            // Ignore bot messages without author usernames
            return;
        }

        // Username may be set incorrectly for some bots, so we need to check the workerUserIds map
        if (!workerId && message.author.id) {
            workerId = await this.dataCache.userIdsToWorkerIds.get(message.author.id);
            this.logger.debug(`DiscordChannel.handleThreadedMessage() workerId=${workerId}`);
        }

        const channelMessageEvent: ChannelMessageEvent = {
            channelId: this.config.id!,
            senderId: workerId ?? message.author.id,
            users: [message.author.id],
            messageId: message.id,
            message: message.content,
            taskExecutionId: threadSessionId,
            channelMessageData: {
                "thread_id": message.channelId ?? "",
            }
        }

        this.logger.debug("DiscordChannel.handleThreadedMessage() sending event", channelMessageEvent);
        this.subject.next(channelMessageEvent);
    }

    //handleChannelMessage creates a new private thread for the worker to respond to the message
    private async handleChannelMessage(message: Message) {
        if (message.type !== MessageType.Default) {
            this.logger.debug("Ignoring non-default message type", message.type);
            return;
        }
        if (!message.author.id) {
            this.logger.error("Received message from unknown user");
            return;
        }

        let workerId: string | undefined = undefined;
        if (message.author.username) {
            workerId = await this.dataCache.usernamesToWorkerIds.get(message.author.username);
        } else if (message.author.bot) {
            // Ignore bot messages without author usernames
            return;
        }

        message.startThread({
            name: "Response to " + message.author.username + "-" + message.id,
            autoArchiveDuration: 60,
            reason: "Worker response to message from " + message.author.username,
        }).then(thread => {
            this.logger.info("Started thread", thread.name, "for worker", message.author.username);
            this.dataCache.threadSessions.get(thread.id).then((threadSessionId) => {
                const channelMessageEvent: ChannelMessageEvent = {
                    channelId: this.config.id!,
                    senderId: workerId ?? message.author.id,
                    users: [message.author.id],
                    messageId: message.id,
                    message: message.content,
                    taskExecutionId: threadSessionId,
                    channelMessageData: {
                        "thread_id": thread.id,
                    }
                }

                this.logger.debug("DiscordChannel.handleChannelMessage() sending event", channelMessageEvent);
                this.subject.next(channelMessageEvent);
            }).catch((error) => {
                this.logger.error("Failed to start thread for worker", message.author.username, error);
            });
        }).catch((error) => {
            this.logger.error("Failed to start thread for worker", message.author.username, error);
        });
    }

    async join(workerId: string, token: string, username?: string): Promise<void> {
        this.logger.info("Joining worker", workerId, "to Discord channel", this.config.id);
        if (!username) {
            this.logger.warn("No username provided for worker", workerId);
            return;
        }
        this.logger.debug(`DiscordChannel.join() workerId=${workerId} username=${username}, setting workerUserId=${this.client.user?.id}`);
        await this.dataCache.workerIdsToChannelUserIds.set(workerId, this.client.user?.id ?? "");
        if (this.client.user?.id) {
            await this.dataCache.userIdsToWorkerIds.set(this.client.user?.id, workerId);
        }
        await this.dataCache.usernamesToWorkerIds.set(username, workerId);
    }

    async leave(workerId: string): Promise<void> {
        this.logger.info("Leaving worker", workerId, "from Discord channel", this.config.id);
        await this.dataCache.workerIdsToChannelUserIds.delete(workerId);
    }

    async establishSession(taskExecutionId: string, originalMessageData?: Record<string, string>): Promise<void> {
        if (await this.dataCache.sessionThreads.has(taskExecutionId) || await this.dataCache.threadSessions.has(taskExecutionId)) {
            this.logger.debug(`establishSession() Task exeuction ${taskExecutionId} already has a session`);
            return;
        }
        const threadId = originalMessageData?.thread_id;
        if (!threadId || threadId === "") {
            this.logger.error("No thread_id provided for task execution", taskExecutionId);
            throw new Error("No thread_id provided for task execution");
        }

        this.logger.info("Establishing session for task execution", taskExecutionId);
        await this.dataCache.sessionThreads.set(threadId, taskExecutionId);
        await this.dataCache.threadSessions.set(taskExecutionId, threadId);
    }

    async message(message: MessageRequest): Promise<void> {
        this.logger.debug(`DiscordChannel.message() sending message to worker ${message.workerId} in channel ${this.config.id} with message ${message.message}`);
        if (!this.channelId) {
            this.logger.error("Discord channel is not initialized");
            throw new Error("Discord channel is not initialized");
        }
        const threadId = await this.dataCache.threadSessions.get(message.taskExecutionId);
        if (!threadId) {
            this.logger.error("No thread found for task execution", message.taskExecutionId);
            throw new Error("No thread found for task execution");
        }

        if (message.final) {
            // We are done, clear the buffer
            // provide a timeout to clear the buffer in case the message is not sent
            this.logger.debug(`DiscordChannel.message() final message received, clearing buffer for thread ${threadId} with messageId ${message.messageId}`);
            setTimeout(() => {
                this.dataCache.channelMessageIdsToImplementationIds.delete(message.messageId).catch((error) => {
                    this.logger.error("Failed to clear buffer for thread", threadId, error);
                });
                this.dataCache.messageBuffers.delete(message.messageId).catch((error) => {
                    this.logger.error("Failed to clear buffer for thread", threadId, error);
                });
            }, 3000);
            return;
        }

        if (message.message !== "") {
            this.logger.debug(`DiscordChannel.message() sending message to thread ${threadId} with message ${message.message}`);
            this.client.channels.fetch(threadId).then(async channel => {
                if (channel?.isThread()) {
                    channel.sendTyping().catch((error) => {
                        this.logger.warn("Failed to send typing indicator to thread", threadId, error);
                    });
                    if (!await this.dataCache.messageBuffers.has(message.messageId) && !await this.dataCache.messageImages.has(message.messageId)) {
                        if (message.messageType === "image") {
                            if (!await this.dataCache.messageImages.has(message.messageId)) {
                                await this.dataCache.messageImages.set(message.messageId, [message.message]);
                            } else {
                                await this.dataCache.messageImages.set(message.messageId, (await this.dataCache.messageImages.get(message.messageId) ?? []).concat([message.message]));
                            }
                        } else {
                           await this.dataCache.messageBuffers.set(message.messageId, message.message);
                        }
                        this.logger.debug(`DiscordChannel.message() creating new buffer for thread ${threadId} with messageId ${message.messageId} and message ${message.message}`);
                        this.sendNewMessage(channel, message.message, message.messageId, threadId, message.username);
                    } else {
                        if (message.messageType === "image") {
                            if (!await this.dataCache.messageImages.has(message.messageId)) {
                                await this.dataCache.messageImages.set(message.messageId, [message.message]);
                            } else {
                                await this.dataCache.messageImages.set(message.messageId, (await this.dataCache.messageImages.get(message.messageId) ?? []).concat([message.message]));
                            }
                            this.logger.debug(`DiscordChannel.message() buffering image to thread ${threadId} with messageId ${message.messageId} and message ${message.message}`);
                            this.updateExistingMessage(channel, message.message, message.messageId, threadId, message.username).catch((error) => {
                                this.logger.error("Failed to update message in channel", channel.id, error);
                            });
                        }
                        await this.dataCache.messageBuffers.set(message.messageId, await this.dataCache.messageBuffers.get(message.messageId) + message.message);
                        this.logger.debug(`DiscordChannel.message() buffering message to thread ${threadId} with messageId ${message.messageId} and message ${message.message}`);
                        this.updateExistingMessage(channel, await this.dataCache.messageBuffers.get(message.messageId) ?? "", message.messageId, threadId, message.username).catch((error) => {
                            this.logger.error("Failed to update message in channel", channel.id, error);
                        });
                    }
                } else {
                    this.logger.error("Failed to fetch thread", threadId);
                }
            }).catch((error) => {
                this.logger.error("Failed to fetch thread", threadId, error);
            });
        }
    }

    sendNewMessage(channel: AnyThreadChannel, message: string, channelMessageId: string, threadId?: string, username?: string): void {
        this.logger.debug(`DiscordChannel.sendNewMessage() sending message to channel ${channel.id} with message ${message}`);
        channel.send({
            content: message,
            options: {
                threadId: threadId,
                username: username,

            }
        }).then(async sentMessage => {
            await this.dataCache.channelMessageIdsToImplementationIds.set(channelMessageId, sentMessage.id);
            this.logger.debug(`DiscordChannel.sendNewMessage() sent message to channel ${channel.id} with message ${message}`);
        }).catch((error) => {
            this.logger.error("Failed to send message to channel", channel.id, error);
        });
    }

    async updateExistingMessage(channel: AnyThreadChannel, message: string, channelMessageId: string, threadId?: string, username?: string): Promise<void> {
        this.logger.debug(`DiscordChannel.updateExistingMessage() updating message in channel ${channel.id} with message ${message}`);
        const discordMessageId = await this.dataCache.channelMessageIdsToImplementationIds.get(channelMessageId);
        if (!discordMessageId) {
            this.logger.error("No discord message found for channel message", channelMessageId);
            return;
        }
        channel.messages.fetch(discordMessageId).then(msg => {
            msg.edit({
                content: message,


                options: {
                    threadId: threadId,
                    username: username,
                }
            }).then(() => {
                this.logger.debug(`DiscordChannel.updateExistingMessage() updated message in channel ${channel.id} with message ${message}`);
            }).catch((error) => {
                this.logger.error("Failed to update message in channel", channel.id, error);
            });
        }).catch((error) => {
            this.logger.error("Failed to fetch message in channel", channel.id, error);
        });
    }

    destroy(): Promise<void> {
        this.logger.info("Destroying Discord channel", this.config.id);
        this.client.destroy().catch((error) => {
            this.logger.error("Failed to destroy Discord client", error);
        });
        return super.destroy();
    }

    static VariablesSchema(): VariablesSchema {
        return DiscordChannelMetadata.variablesSchema();
    }

    webhookHandler: RequestHandler = (req, res) => {
        this.logger.debug(`DiscordChannel.webhookHandler() req=${JSON.stringify(req.body)}`);
        res.send("OK");
    }
}