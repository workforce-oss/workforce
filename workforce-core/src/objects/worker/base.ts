import { randomUUID } from "crypto";
import { BehaviorSubject, Subject, Subscription } from "rxjs";
import { BrokerManager } from "../../manager/broker_manager.js";
import { WebhookRouteManager } from "../../manager/webhook_route_manager.js";
import { jsonStringify } from "../../util/json.js";
import { BaseObject } from "../base/base.js";
import { SUBTASK_SUMMARY_FUNCTION_NAME, TASK_COMPLETE_FUNCTION_NAME, ToolCall } from "../base/model.js";
import { MessageRequest } from "../channel/model.js";
import { DocumentationDb } from "../documentation/db.js";
import { TaskExecutionDb } from "../task/db.task_execution.js";
import { ToolRequest, ToolResponse } from "../tool/model.js";
import { WorkRequestDb } from "./db.work_request.js";
import { WorkerChatMessageDb } from "./db.worker_chat_message.js";
import { WorkerChatSessionDb } from "./db.worker_chat_session.js";
import { ChatMessage, ChatSession, WorkRequest, WorkRequestData, WorkResponse, WorkerConfig } from "./model.js";
import { QueueService } from "./service.queue.js";
import { TaskExecutionUserDb } from "../task/db.task_execution_users.js";
import { RetrievalScopeType, TokenFillStrategyType } from "../documentation/model.js";
import { FunctionDocument, FunctionDocuments, FunctionParameters } from "../../util/openapi.js";

// TODO: Validate that function calling and recursion is doing what we want

export abstract class Worker extends BaseObject<WorkerConfig> {
    public toolResponseCallback: ((response: ToolResponse | { success: boolean; message: string | Record<string, unknown> }) => void) | undefined;

    public inferenceRequestSubject: Subject<WorkRequest> = new Subject<WorkRequest>;
    public inboundMessages: Subject<ChatMessage> = new Subject<ChatMessage>();
    public messageOutputStream: Subject<ChatMessage> = new Subject<ChatMessage>;

    public abortSubjects = new Map<string, BehaviorSubject<boolean>>();
    public cancelSubjects = new Map<string, BehaviorSubject<boolean>>();
    public sessionSubscriptions = new Map<string, Subscription>();

    private activeRequests = new Set<string>();
    private processingRequests = new Set<string>();

    private defaultCostLimit = 1.00;

    protected externalInference = false;

    public startRealtimeSession(workRequest: WorkRequest): Promise<{
        realtime_token?: string,
        realtime_base_url?: string,
        workerId?: string,
        model?: string,
    }> {
        this.logger.debug(`starting realtimeSession for ${workRequest.taskExecutionId}`)
        return Promise.resolve({});
    }


    constructor(config: WorkerConfig, onFailure: (objectId: string, error: string) => void) {
        super(config, onFailure);

        this.inboundMessages.subscribe((message) => {
            this.handleInboundMessage(message).catch((error) => {
                this.logger.error(`Error handling inbound message: ${error}`);
            });
        });
        this.inferenceRequestSubject.subscribe((request) => {
            this.handleInferenceRequest(request);
        })
        this.messageOutputStream.subscribe((message) => {
            this.handleOutboundMessage(message);
        });
    }

    public abstract inference(
        args: {
            chatSession: ChatSession;
            workRequest: WorkRequest;
            toolSchemas: Record<string, ToolCall[]>;
            messageOutputSubject: Subject<ChatMessage>;
            maxTokenCount?: number;
            currentTokenCount?: number;
            singleMessage?: boolean;
            intermediateCallback?: (message: ChatMessage) => Promise<void>;
            username?: string;
            enableCritic?: boolean;
        },
        cancel?: BehaviorSubject<boolean>
    ): Promise<void>;

    async work(workRequest: WorkRequest): Promise<void> {
        if (this.processingRequests.has(workRequest.taskExecutionId)) {
            this.logger.debug(`work() Work request ${workRequest.taskExecutionId} already processing`);
            return;
        } else {
            this.logger.debug(`work() Work request ${workRequest.taskExecutionId} added to processing set`);
            this.processingRequests.add(workRequest.taskExecutionId);
        }

        // Check if the request is already active
        if (this.activeRequests.has(workRequest.taskExecutionId)) {
            this.logger.debug(`work() Work request ${workRequest.taskExecutionId} already active`);
            return;
        }

        this.logger.debug(`work() loading tools for work request ${workRequest.taskExecutionId}`);
        const toolSchemas = await this.loadTools(workRequest.tools?.map((tool) => tool.id!) ?? []).catch((error) => {
            this.logger.error(`work() Error loading tools: ${error}`);
            return {};
        });

        // Double check if the request is already active after loading tools
        if (this.activeRequests.has(workRequest.taskExecutionId)) {
            this.logger.debug(`work() Work request ${workRequest.taskExecutionId} already active`);
            return;
        }
        const db = await WorkRequestDb.findOne({
            where: {
                taskExecutionId: workRequest.taskExecutionId,
            },
        }).catch((error) => {
            this.logger.error(`work() Error finding work request: ${error}`);
            return undefined;
        });


        if (db) {
            if (!db.toolSchemas) {
                db.toolSchemas = jsonStringify(toolSchemas);
            }
            db.status = "in-progress";
            await db.save();

            this.startSession(workRequest).then(() => {
                this.listenForSessionMessages(workRequest);
                this.inferenceRequestSubject.next(workRequest);
            }).catch((error) => {
                this.logger.error(`work() Error starting chat session: ${error}`);
                this.cancelSubjects.get(workRequest.taskExecutionId)?.next(true);
                this.cancelSubjects.delete(workRequest.taskExecutionId);
                this.abortSubjects.delete(workRequest.taskExecutionId);
            });
            this.activeRequests.add(workRequest.taskExecutionId);
            this.processingRequests.delete(workRequest.taskExecutionId);

        } else {
            this.logger.debug(`work() Work request ${workRequest.taskExecutionId} not found`);
        }
    }

    protected async startSession(workRequest: WorkRequest): Promise<ChatSession> {
        this.logger.debug(`startSession() Work request ${workRequest.taskExecutionId} starting chat session`);

        this.logger.debug(`startSession() Initializing tool sessions for tools: ${workRequest.tools?.map((tool) => tool.id).join(", ")}`)
        for (const tool of workRequest.tools ?? []) {
            if (tool.id) {
                this.logger.debug(`startSession() Work request ${workRequest.taskExecutionId} initializing tool session ${tool.id}`);
                await BrokerManager.toolBroker.initSession({
                    toolId: tool.id,
                    taskExecutionId: workRequest.taskExecutionId,
                    workerId: workRequest.workerId,
                    channelId: workRequest.channelId,
                }).catch((error) => {
                    this.logger.error(`startSession() Error initializing tool session ${tool.id}: ${error}`);
                });
            } else {
                this.logger.error(`startSession() Tool id not found for tool: ${JSON.stringify(tool)}`);
            }
        }

        const existingChatSession = await WorkerChatSessionDb.findOne({
            where: {
                taskExecutionId: workRequest.taskExecutionId,
            },
            include: [
                {
                    model: WorkerChatMessageDb,
                },
            ],
        });
        if (existingChatSession) {
            this.logger.debug(`startSession() Chat session ${existingChatSession.id} already exists`);
            return existingChatSession.toModel();
        }

        const chatSessionDb = await WorkerChatSessionDb.create({
            channelId: workRequest.channelId,
            taskExecutionId: workRequest.taskExecutionId,
        });
        if (!chatSessionDb) {
            throw new Error(`Failed to create chat session for task execution ${workRequest.taskExecutionId}`);
        }

        const systemMessageDb = await WorkerChatMessageDb.create({
            id: randomUUID(),
            sessionId: chatSessionDb.id,
            text: workRequest.input.systemMessage as string,
            role: "system",
            senderId: this.config.id!,
            timestamp: new Date().getTime(),
        });
        if (!systemMessageDb) {
            throw new Error(`newChatSession() Chat session ${chatSessionDb.id} error creating system message`);
        }

        const promptMessageDb = await WorkerChatMessageDb.create({
            id: randomUUID(),
            sessionId: chatSessionDb.id,
            text: workRequest.input.prompt as string,
            senderId: workRequest.taskExecutionId,
            role: "user",
            timestamp: new Date().getTime(),
        });
        if (!promptMessageDb) {
            throw new Error(`newChatSession() Chat session ${chatSessionDb.id} error creating prompt message`);
        }

        return chatSessionDb.toModel();
    }

    private async handleInboundMessage(chatMessage: ChatMessage): Promise<void> {
        this.logger.debug(`handleInboundMessage() Chat session ${chatMessage.sessionId} message received": ${JSON.stringify(chatMessage)}`);
        const chatSession = await WorkerChatSessionDb.findOne({
            where: {
                id: chatMessage.sessionId,
            },
            include: [
                {
                    model: WorkerChatMessageDb,
                },
            ],
        });
        if (!chatSession) {
            this.logger.error(`handleInboundMessage() chat session not found for task ${chatMessage.sessionId}`);
            return;
        }
        const workRequestDb = await WorkRequestDb.findOne({
            where: {
                taskExecutionId: chatSession.taskExecutionId
            },
        });
        if (!workRequestDb) {
            this.logger.error(`handleMessage() work request not found for task: ${chatMessage.sessionId}`);
            return;
        }
        const workRequest = workRequestDb.toModel();
        if (chatMessage.cost) {
            if (!workRequest.cost) {
                workRequest.cost = 0;
            }
            workRequest.cost += chatMessage.cost;
            workRequest.tokens = chatMessage.tokens;
            workRequestDb.cost = workRequest.cost;
            workRequestDb.tokens = workRequest.tokens;
            await workRequestDb.save();
        }

        const costLimit = workRequest.request?.costLimit ?? this.defaultCostLimit;

        if (workRequest.cost && workRequest.cost > costLimit) {
            this.logger.debug(`handleInboundMessage() Chat session ${chatMessage.sessionId} cost over $${costLimit} dollars, cancelling`);
            const response = this.handleInferenceError(`Cost exceeded limit. Limit is $${costLimit}, cost is $${workRequest.cost}. Please start a new session.`, chatSession.toModel(), workRequest.request!)
            this.handleWorkResponse(response);
            return;
        }


        this.logger.debug(`handleInboundMessage() calling addMessage`);
        this.addMessage(chatSession.toModel(), chatMessage).then((session) => {
            const abort = this.abortSubjects.get(session.taskExecutionId);
            const message = session.messages[session.messages.length - 1];
            this.logger.debug(`handleMessage() Chat session ${session.id} message added: ${JSON.stringify(message)}`);
            if (this.chatComplete(message) || abort?.value) {
                this.logger.debug(`handleMessage() Chat session ${session.id} ended with ${session.messages.length} messages`);
                if (message.toolCalls) {
                    for (const toolCall of message.toolCalls) {
                        toolCall.sessionId = session.id;
                    }
                }
                const toolCall = message.toolCalls?.find((toolCall) => toolCall.name === TASK_COMPLETE_FUNCTION_NAME);
                this.handleWorkResponse({
                    workerId: workRequest.workerId,
                    taskId: workRequest.request!.taskId,
                    taskExecutionId: workRequest.taskExecutionId,
                    timestamp: Date.now(),
                    output: toolCall ?? message.text ?? `No response found for "${workRequest.request?.input.text as string}"`,
                });
                return;
            } else if (message.toolCalls && this.nextMessageShouldBeFromTool(message)) {
                this.logger.debug(`handleMessage() Chat session ${session.id} next message should be from function`);
                this.toolCalls(
                    message.toolCalls,
                    session,
                    workRequest
                ).then((response) => {
                    this.inboundMessages.next(response);
                }).catch((error) => {
                    this.logger.error(`handleMessage() Error calling tool functions: ${error}`);
                });
            } else if (this.nextMessageShouldBeFromWorker(message) || !chatSession?.channelId) {
                this.logger.debug(`handleMessage() Chat session ${session.id} next message should be from worker`);
                // Last message was from a tool or user, so we need to get a response from the Worker
                this.inferenceRequestSubject.next(workRequest.request!);
            }
            this.logger.debug(`handleMessage() Chat session ${session.id} not complete, waiting for next message`);

        }).catch((error) => {
            this.logger.error(`handleMessage() Error adding message ${JSON.stringify(chatMessage)}: ${error}`);
        });
    }

    public handleInferenceRequest(request: WorkRequest): void {

        WorkRequestDb.findOne({
            where: {
                taskExecutionId: request.taskExecutionId
            },
        }).then((db) => {
            if (!db) {
                this.logger.error(`handleInferenceRequest() work request not found for task: ${request.taskExecutionId}`);
                return;
            }
            const workRequest = db.toModel();
            WorkerChatSessionDb.findOne({
                where: {
                    taskExecutionId: request.taskExecutionId
                },
                include: [
                    {
                        model: WorkerChatMessageDb,
                    }
                ]
            }).then((chatSessionDb) => {
                if (!chatSessionDb) {
                    this.logger.error(`handleInferenceRequest() chat session not found for task ${request.taskExecutionId}`);
                    return;
                }

                const chatSession = chatSessionDb.toModel();
                if (chatSession.messages.length > 0) {
                    const lastMessage = chatSession.messages[chatSession.messages.length - 1];
                    if (lastMessage.role === "worker" && lastMessage.username !== "critic" && lastMessage.username !== "thought" && lastMessage.username !== "manager" && workRequest.request?.channelId) {
                        this.logger.debug(`handleInferenceRequest() Chat session ${request.taskExecutionId} already has a final worker message`);
                        return;
                    }
                }
                const cancel = this.cancelSubjects.get(request.taskExecutionId);

                // When critique is enable we tweak the inference call to include thoughts, and critic
                let username = "worker";
                if (this.config.variables?.critic_enabled) {
                    const lastMessage = chatSession.messages[chatSession.messages.length - 1];
                    // If the last message was from a tool or user, we need to change the username to thought
                    // We also need to change the username to thought if the last message was from critic

                    // if the last message is a thought, we need to change the username to critic
                    if (lastMessage && lastMessage.role === "tool" || lastMessage.role === "user") {
                        username = "thought";
                    } else if (lastMessage && lastMessage.username === "thought") {
                        // inject critique prompt
                        const critiquePrompt = {
                            id: randomUUID(),
                            sessionId: chatSession.id,
                            role: "worker",
                            username: "manager",
                            text: "Please provide a critique of the previous response. If the response is satisfactory and follows the guidelines, please type only 'good' and do not explain yourself. If the response is not satisfactory, please provide feedback.",
                            done: true,
                            timestamp: new Date().getTime(),
                        } as ChatMessage;
                        this.messageOutputStream.next(critiquePrompt);
                        return;
                    } else if (lastMessage && lastMessage.username === "manager") {
                        // If the last message was from manager, we need to change the username to critic
                        username = "critic";
                    } else if (lastMessage.username === "critic" && lastMessage.text?.includes("good")) {
                        // If the last message was from critic and it was 'good', we need to change the username to worker
                        username = "worker";
                    } else if (lastMessage.username === "critic" && !lastMessage.text?.includes("good")) {
                        // If the last message was from critic and it was not 'good', we need to change the username to thought
                        username = "thought";
                    }

                }

                // check to see if there are any sequential duplicate messages, if so, we need to cancel the session
                const messages = chatSession.messages;
                if (messages.length > 1) {
                    const allMessages = new Map<string, number>();
                    let lastMessage = "";
                    let lastRole = "";
                    for (let i = messages.length - 1; i > 0; i--) {
                        if (messages[i].text) {
                            if (allMessages.has(messages[i].text ?? "")) {
                                allMessages.set(messages[i].text ?? "", allMessages.get(messages[i].text ?? "")! + 1);
                            } else {
                                allMessages.set(messages[i].text ?? "", 1);
                            }
                            if (allMessages.get(messages[i].text ?? "") === 10) {
                                this.logger.debug(`handleInferenceRequest() Chat session ${request.taskExecutionId} cancelling due to 10 duplicate messages`);
                                const response = this.handleInferenceError("10 duplicate messages", chatSession, workRequest.request!)
                                this.handleWorkResponse(response);

                                return;
                            }
                        }
                        if (messages[i].role === lastRole && messages[i].text === lastMessage) {
                            this.logger.debug(`handleInferenceRequest() Chat session ${request.taskExecutionId} cancelling due to sequential duplicate messages`);
                            const response = this.handleInferenceError("Sequential duplicate messages", chatSession, workRequest.request!)
                            this.handleWorkResponse(response);
                            return;
                        }
                        lastMessage = messages[i].text ?? "";
                        lastRole = messages[i].role;
                    }
                }

                this.inference({
                    chatSession: chatSessionDb.toModel(),
                    username: username,
                    workRequest: request,
                    currentTokenCount: workRequest.tokens,
                    maxTokenCount: this.config.variables?.max_tokens as number | undefined,
                    toolSchemas: workRequest.toolSchemas ?? {},
                    messageOutputSubject: this.messageOutputStream,
                    singleMessage: false,
                    intermediateCallback: (chatMessage: ChatMessage): Promise<void> => {
                        this.messageOutputStream.next(chatMessage);
                        return Promise.resolve();
                    },
                    enableCritic: this.config.variables?.critic_enabled as boolean | undefined,
                }, cancel).then(() => {
                    this.logger.debug('inference() inference complete');
                }).catch((error: Error) => {
                    this.logger.error(`handleInferenceRequest() Chat session ${request.taskExecutionId} error: ${error}`);
                    const response = this.handleInferenceError(error, chatSessionDb.toModel(), workRequest.request!)
                    this.logger.error(`handleInferenceRequest() Error cancelling session: ${error}`);
                    this.handleWorkResponse(response);
                });
            }).catch((error) => {
                this.logger.error(`handleInferenceRequest() Error finding chat session ${request.taskExecutionId}: ${error}`);
            });
        }).catch((error) => {
            this.logger.error(`handleInferenceRequest() Error finding work request ${request.taskExecutionId}: ${error}`);
        });
    }

    public handleInferenceError(
        error: Error | string,
        chatSession: ChatSession,
        workRequest: WorkRequest
    ): WorkResponse {
        this.logger.error(`handleInferenceError() Chat session ${chatSession.id} inference error: ${error}`);
        const errorText = error instanceof Error ? "We have encountered a technical issue, please try again later." : error;

        this.sendMessageToChannel(
            chatSession,
            {
                id: randomUUID(),
                role: "worker",
                sessionId: chatSession.id,
                timestamp: new Date().getTime(),
                done: true,
                text: errorText,
            }
        ).catch((error) => {
            this.logger.error(`handleInferenceError() Error sending message to channel ${error}`);
        });

        WebhookRouteManager.getInstance().then((manager) => {
            manager.removeRoute({
                path: `/${this.config.orgId}/${workRequest.taskExecutionId}`,
                orgId: this.config.orgId,
                objectId: workRequest.taskExecutionId,
            });
        }).catch((error) => {
            this.logger.error(`handleInferenceError() Error removing webhook route ${error}`);
        });
        return {
            workerId: workRequest.workerId,
            taskId: workRequest.taskId,
            taskExecutionId: workRequest.taskExecutionId,
            timestamp: Date.now(),
            output: {
                name: TASK_COMPLETE_FUNCTION_NAME,
                arguments: {
                    message:
                        errorText,
                },
            },
        };
    }

    public async queueWork(workRequest: WorkRequest): Promise<void> {
        const available = await QueueService.workerIsAvailable(workRequest.workerId, this.config.wipLimit ?? 0);
        if (available) {
            await this.work(workRequest);
        } else {
            this.logger.debug(`queueWork() Work request ${workRequest.taskExecutionId} queued`);
        }

    }

    public handleOutboundMessage(message: ChatMessage): void {
        WorkerChatSessionDb.findOne({
            where: {
                id: message.sessionId,
            },
            include: [
                {
                    model: WorkerChatMessageDb,
                },
            ],
        }).then((chatSessionDb) => {
            if (!chatSessionDb) {
                this.logger.error(`handleOutboundMessage() Chat session ${message.sessionId} not found`);
                return;
            }
            const chatSession = chatSessionDb.toModel();
            if (message.cancelled) {
                this.logger.debug(`handleOutboundMessage() Chat session ${message.sessionId} cancelled`);
                return;
            }
            if (message.done) {
                this.logger.debug(`handleOutboundMessage() Chat session ${message.sessionId} message is done: ${message.id}`);
                if (!message.toolCalls && !message.text) {
                    WorkRequestDb.findOne({
                        where: {
                            taskExecutionId: chatSession.taskExecutionId,
                        },
                    })
                        .then((workRequestDb) => {
                            if (!workRequestDb) {
                                this.logger.error(`handleOutboundMessage() Work request not found for task: ${chatSession.taskExecutionId}`);
                                return;
                            }
                            const model = workRequestDb.toModel();
                            const response = this.handleInferenceError("No response found", chatSession, model.request!);
                            this.handleWorkResponse(response);

                        })
                        .catch((error) => {
                            this.logger.error(`handleOutboundMessage() Error finding work request: ${error}`);
                            return undefined;
                        });
                    return;
                }
                this.inboundMessages.next(message);
            }
            if (message.toolCalls && !message.text) {
                // this.logger.debug(`handleOutboundMessage() Chat session ${message.sessionId} message has only tool calls, not sending to channel`);
                // return;
                this.logger.debug(`handleOutboundMessage() Chat session ${message.sessionId} message has only tool calls, sending to channel`);
            }
            if (message.username === "critic") {
                this.logger.debug(`handleOutboundMessage() Chat session ${message.sessionId} message is from critic, not sending to channel`);
                return;
            }
            if (message.username === "thought") {
                this.logger.debug(`handleOutboundMessage() Chat session ${message.sessionId} message is from thoughts, not sending to channel`);
                return;
            }
            if (message.username === "manager") {
                this.logger.debug(`handleOutboundMessage() Chat session ${message.sessionId} message is from manager, not sending to channel`);
                return;
            }
            if (message.channelMessageId) {
                this.logger.debug(`handleOutboundMessage() Chat session ${message.sessionId} message has channel message id`);
                message.id = message.channelMessageId;
            }

            this.sendMessageToChannel(chatSession, message).then(() => {
                this.logger.debug(`handleOutboundMessage() Chat session ${message.sessionId} message sent`);
            }).catch((error) => {
                this.logger.error(`handleOutboundMessage() Error sending message to channel ${error}`);
            });
        }).catch((error) => {
            this.logger.error(`handleOutboundMessage() Error finding chat session ${message.sessionId}: ${error}`);
        });


    }

    public async sendMessageToChannel(
        chatSession: ChatSession,
        message: ChatMessage,
    ): Promise<void> {
        this.logger.debug(
            `sendMessageToChannel() Chat session ${chatSession.id} send message to channel, done: ${message.done}`
        );

        let final = message.done ?? false;
        if (!final) {
            final = message.cancelled === true;
        }
        await BrokerManager.channelBroker.message({
            channelId: chatSession.channelId!,
            workerId: this.config.id!,
            taskExecutionId: chatSession.taskExecutionId,
            senderId: this.config.id!,
            messageId: message.id,
            message: message.text ?? "",
            timestamp: message.timestamp,
            messageType: "message",
            username: this.config.name,
            final,
            //TODO: Remove, this is tech debt to solve a UI bug
            toolCalls: message.text ? null : message.toolCalls,
            ignoreResponse: message.done !== true || message.cancelled === true,
            image: message.image,
        });
    }

    private stopListeningForSessionMessages(taskExecutionId: string) {
        this.logger.debug(`stopListeningForSessionMessage() taskExecutionId=${taskExecutionId}`)

        const subscription = this.sessionSubscriptions.get(taskExecutionId);
        subscription?.unsubscribe();
        this.sessionSubscriptions.delete(taskExecutionId);
    }

    private listenForSessionMessages(workRequest: WorkRequest, channelId?: string, retrycount?: number) {
        if (retrycount && retrycount > 5) {
            this.logger.error(`listenForSessionMessages() Chat session ${workRequest.taskExecutionId} failed to start`);
            return;
        }
        if (!channelId && !workRequest.channelId) {
            this.logger.debug(`listenForSessionMessages() no channel for workRequest: ${workRequest.taskExecutionId}`);
            return;
        }
        if (this.sessionSubscriptions.has(workRequest.taskExecutionId)) {
            this.logger.debug(`listenForSessionMessages() already subscribed to messages for workRequest: ${workRequest.taskExecutionId}`);
            return;
        }
        this.logger.debug(`listenForSessionMessages() listening to session for task: ${workRequest.taskExecutionId}`);
        if (!this.cancelSubjects.has(workRequest.taskExecutionId)) {
            this.cancelSubjects.set(workRequest.taskExecutionId, new BehaviorSubject<boolean>(false));
        }
        WorkerChatSessionDb.findOne({
            where: {
                taskExecutionId: workRequest.taskExecutionId,
            },
            include: [
                {
                    model: WorkerChatMessageDb,
                },
            ],
        }).then((chatSessionDb) => {
            try {
                const subscription = BrokerManager.channelBroker.subscribeToSession(
                    channelId ?? workRequest.channelId!,
                    workRequest.taskExecutionId,
                    workRequest.workerId,
                    ["message", "chat-message", "tool-call"],
                    (message: MessageRequest) => {
                        this.logger.debug(
                            `listenForSessionMessages() Chat session ${workRequest.taskExecutionId
                            } message received: ${JSON.stringify(message, null, 2)}`
                        );
                        if (message.message === "" && ((message.toolCalls?.length ?? 0) === 0)) {
                            this.logger.debug(
                                `listenForSessionMessages() Chat session ${workRequest.taskExecutionId} ignoring empty message`
                            );
                            return;
                        }
                        this.logger.debug(`listenForSessionMessages() senderId=${message.senderId} workerId=${workRequest.workerId}`)

                        if (message.senderId === workRequest.workerId) {
                            if (this.externalInference) {
                                const workerMessage: ChatMessage = {
                                    id: message.messageId,
                                    sessionId: chatSessionDb?.id ?? workRequest.taskExecutionId,
                                    senderId: message.senderId,
                                    text: message.message,
                                    role: "worker",
                                    timestamp: new Date().getTime(),
                                }
                                if (message.toolCalls) {
                                    workerMessage.toolCalls = message.toolCalls
                                }
                                this.inboundMessages.next(workerMessage)
                                this.logger.debug(
                                    `listenForSessionMessage() Chat session ${workRequest.taskExecutionId} forwarding external worker message to output stream`
                                )
                            } else {
                                this.logger.debug(
                                    `listenForSessionMessages() Chat session ${workRequest.taskExecutionId} ignoring own message`
                                );
                            }
                            return;
                        }

                        const userMessage: ChatMessage = {
                            id: message.messageId,
                            sessionId: chatSessionDb?.id ?? workRequest.taskExecutionId,
                            senderId: message.senderId,
                            text: message.message,
                            role: "user",
                            timestamp: new Date().getTime(),
                        };
                        this.cancelSubjects.get(workRequest.taskExecutionId)?.next(true);
                        this.inboundMessages.next(userMessage);
                    }
                )
                this.logger.debug(`listenForSessionMessages() Chat session ${workRequest.taskExecutionId} subscribed to messages`);
                this.sessionSubscriptions.set(workRequest.taskExecutionId, subscription);
            } catch (error) {
                this.logger.error(`listenForSessionMessages() Error subscribing to session for task: ${workRequest.taskExecutionId}: `, error);
                // wait 5 seconds and try again
                setTimeout(() => {
                    this.listenForSessionMessages(workRequest, workRequest.channelId, (retrycount ?? 0) + 1);
                }, 5000);
            }
        }).catch((error) => {
            this.logger.error(`listenForSessionMessages() Error finding chat session ${workRequest.taskExecutionId}: ${error}`);
            // wait 5 seconds and try again
            setTimeout(() => {
                this.listenForSessionMessages(workRequest, workRequest.channelId, (retrycount ?? 0) + 1);
            }, 5000);
        });
    }

    private async handleDocumentationQuery(query: string, chatSession: ChatSession, documentation?: string[]): Promise<string> {
        const repositoryResults = [];
        if (!documentation) {
            this.logger.debug(`handleDocumentationQuery() Chat session ${chatSession.id} no documentation provided`);
            return "No documentation available";
        }
        for (const documentationId of documentation) {
            const documentation = await DocumentationDb.findByPk(documentationId);
            if (!documentation) {
                continue;
            }
            const documentationModel = documentation.toModel();
            const result = await BrokerManager.documentRepositoryBroker.search({
                repositoryId: documentationModel.repository!,
                query: query,
                requestId: randomUUID(),
                documentIds: documentationModel.documents,
                retrievalScope: documentationModel.variables?.retrievalScope as RetrievalScopeType | undefined,
                desiredTokens: documentationModel.variables?.desiredTokens as number | undefined,
                maxTokens: documentationModel.variables?.maxTokens as number | undefined,
                tokenFillStrategy: documentationModel.variables?.tokenFillStrategy as TokenFillStrategyType | undefined,
            }).catch((error) => {
                this.logger.error(`handleDocumentationQuery() Chat session ${chatSession.id} documentation search error: ${error}`);
                return {
                    result: "Error executing search",
                    distance: 0,
                };
            });
            this.logger.debug(`handleDocumentationQuery() Chat session ${chatSession.id} documentation search result: ${JSON.stringify(result)}`);
            repositoryResults.push(result);
        }
        if (repositoryResults.length === 0) {
            return "No documentation available";
        }
        let topResult = repositoryResults[0];
        for (const result of repositoryResults) {
            if (result.distance < topResult.distance) {
                topResult = result;
            }
        }
        return topResult.result ?? "Error executing search";
    }

    private async executeSubtasks(
        workRequest: WorkRequest,
        toolCalls: ToolCall[],
        channelId?: string
    ): Promise<string | undefined> {
        const taskExecutionDb = await TaskExecutionDb.findByPk(workRequest.taskExecutionId, {
            include: [
                {
                    model: TaskExecutionUserDb,
                }
            ]
        }).catch((e) => {
            this.logger.error("executeSubtasks() error retrieving task execution", e);
        })
        if (!taskExecutionDb) {
            this.logger.debug(`executeSubtasks() No taskExecution found for ${workRequest.taskExecutionId}`);
            return undefined;
        }
        const task = BrokerManager.taskBroker.getObject(taskExecutionDb.taskId);
        if (!task) {
            this.logger.debug(`executeSubtasks() no task found for ${taskExecutionDb.taskId}`)
            return;
        }

        if (!task.config.subtasks || task.config.subtasks.length === 0) {
            this.logger.debug(`executeSubtasks() no subtasks found for ${workRequest.taskExecutionId}`)
            this.logger.debug(`executeSubtasks() ${JSON.stringify(task.config)}`)
            return;
        }
        this.logger.debug(`executeSubtasks() executing subtasks for ${workRequest.taskExecutionId}`)
        const subtaskData: {
            id: string,
            toolCall: ToolCall,
            inputs: Record<string, string>
        }[] = [];
        for (const toolCall of toolCalls) {
            const subTaskId = await task.getTaskIdForSubtaskFunctionName(toolCall.name);
            if (subTaskId) {
                this.logger.debug(`executeSubtasks() subtask found for ${workRequest.taskExecutionId}: ${subTaskId}`)

                const stringifiedArguments: Record<string, string> = {};
                for (const key in toolCall.arguments) {
                    if (typeof toolCall.arguments[key] === "string") {
                        stringifiedArguments[key] = toolCall.arguments[key];
                    } else {
                        stringifiedArguments[key] = jsonStringify(toolCall.arguments[key]);
                    }
                }

                subtaskData.push({
                    id: subTaskId,
                    inputs: stringifiedArguments,
                    toolCall: toolCall
                });
            }
        }
        if (subtaskData.length === 0) {
            this.logger.debug(`executeSubtasks() no subtaskId matches for ${workRequest.taskExecutionId}`)
            return;
        }

        for (const subtask of subtaskData) {
            const newTaskExecutionId = randomUUID();
            if (channelId) {
                this.logger.debug(`executeSubtasks() handing off session for ${workRequest.taskExecutionId} to ${newTaskExecutionId}`)
                await BrokerManager.channelBroker.handOffSession(channelId, workRequest.taskExecutionId, newTaskExecutionId);
                this.stopListeningForSessionMessages(workRequest.taskExecutionId);
            }

            // This is bad practice, but is expedient for now
            // eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor
            const taskCompletePromise = new Promise<string>(async (resolve) => {
                const subscription = await BrokerManager.taskBroker.subscribe(newTaskExecutionId, async (taskExecutionResponse) => {
                    this.logger.debug(`executeSubtasks() subtask ${subtask.id} response received: ${JSON.stringify(taskExecutionResponse)}`);
                    if (channelId) {
                        this.logger.debug(`executeSubtasks() handing off session for ${newTaskExecutionId} to ${workRequest.taskExecutionId}`)
                        this.listenForSessionMessages(workRequest, channelId)
                        await BrokerManager.channelBroker.handOffSession(channelId, newTaskExecutionId, workRequest.taskExecutionId);

                    }
                    subscription.unsubscribe();
                    if ((taskExecutionResponse.result as ToolCall)?.arguments?.[SUBTASK_SUMMARY_FUNCTION_NAME]) {
                        this.logger.debug(`executeSubtasks() subtask ${subtask.id} result: ${JSON.stringify((taskExecutionResponse.result as ToolCall).arguments[SUBTASK_SUMMARY_FUNCTION_NAME])}`);
                        resolve(JSON.stringify((taskExecutionResponse.result as ToolCall).arguments[SUBTASK_SUMMARY_FUNCTION_NAME]));
                    } else if (typeof taskExecutionResponse.result === "string") {
                        this.logger.debug(`executeSubtasks() subtask ${subtask.id} result: ${taskExecutionResponse.result}`);
                        resolve(taskExecutionResponse.result);
                    } else if (taskExecutionResponse.result.arguments) {
                        this.logger.debug(`executeSubtasks() subtask ${subtask.id} result: ${JSON.stringify(taskExecutionResponse.result.arguments)}`);
                        resolve(JSON.stringify(taskExecutionResponse.result.arguments));
                    } else {
                        this.logger.debug(`executeSubtasks() subtask ${subtask.id} result: ${JSON.stringify(taskExecutionResponse.result)}`);
                        resolve(jsonStringify(taskExecutionResponse.result));
                    }
                });
                const subtaskConfig = BrokerManager.taskBroker.getObject(subtask.id);
                BrokerManager.taskBroker.request({
                    taskExecutionId: newTaskExecutionId,
                    taskId: subtask.id,
                    users: taskExecutionDb.users?.map((user) => user.userId) ?? [],
                    orgId: this.config.orgId,
                    channelId: channelId,
                    inputs: subtask.inputs,
                    parentTaskExecutionId: workRequest.taskExecutionId,
                    taskName: subtaskConfig?.config.name,
                });
            })

            const result = await taskCompletePromise.catch(e => {
                return jsonStringify(e);
            })
            subtask.toolCall.result = result;
        }
    }

    public async toolCalls(
        toolCalls: ToolCall[],
        chatSession: ChatSession,
        workRequest: WorkRequestData

    ): Promise<ChatMessage> {
        let state = undefined;

        // start with subtasks immediately
        // TODO: Make resilient to restarts
        this.logger.debug(`toolCalls() Chat session ${chatSession.id} executing subtasks`);
        await this.executeSubtasks(workRequest.request!, toolCalls, chatSession.channelId);

        for (const toolCall of toolCalls) {
            if (toolCall.name === "query_documentation") {
                toolCall.result = await this.handleDocumentationQuery(toolCall.arguments.query as string, chatSession, workRequest.request?.documentation);
            } else {
                const toolId = this.getToolId(toolCall.name, workRequest.toolSchemas ?? {});
                //TODO: handle tool errors
                if (toolId) {
                    this.logger.debug(
                        `handleFunctionCall() Chat session ${chatSession.id} tool ${toolId} found for function ${toolCall.name}`
                    );
                    const toolRequest: ToolRequest = {
                        toolCall: toolCall,
                        requestId: randomUUID(),
                        toolId: toolId,
                        timestamp: Date.now(),
                        channelId: workRequest.request?.channelId,
                        taskExecutionId: workRequest.taskExecutionId,
                        workerId: this.config.id!,
                        workerChannelUserConfig: this.config.channelUserConfig,
                    }
                    const toolResponse = await BrokerManager.toolBroker.execute(toolRequest).catch((err: Error) => {
                        this.logger.error(`handleFunctionCall() Chat session ${chatSession.id} tool ${toolId} error: ${err}`);
                        return {
                            success: false,
                            message: err.message,
                        };
                    });
                    if (toolResponse && this.toolResponseCallback) {
                        this.logger.debug(`handleFunctionCall() Chat session ${chatSession.id} tool ${toolId} response received, calling callback`);
                        this.toolResponseCallback(toolResponse);
                    }

                    this.logger.debug(`handleFunctionCall() Chat session ${chatSession.id} tool ${toolId} response received`);
                    if (!toolResponse.success) {
                        toolCall.result = `Error calling tool "${toolCall.name}": ${(toolResponse as { success: boolean; message: string }).message}. Do not try again.`
                    } else {
                        if ((toolResponse as ToolResponse).human_state) {
                            this.handleHumanState(toolRequest, toolResponse as ToolResponse);
                        }

                        if ((toolResponse as ToolResponse).machine_state) {
                            state = (toolResponse as ToolResponse).machine_state;
                        }

                        if ((toolResponse as ToolResponse).image) {
                            toolCall.image = (toolResponse as ToolResponse).image;
                        }

                        if (!(toolResponse as ToolResponse).machine_message) {
                            toolCall.result = `No response found for "${toolCall.name}"`;
                        } else {
                            toolCall.result = (toolResponse as ToolResponse).machine_message;
                        }



                        if ((toolResponse as ToolResponse).updateChannelId) {
                            await BrokerManager.workerBroker.updateChatSessionChannel(this.config.id!, (toolResponse as ToolResponse).updateChannelId!, workRequest.taskExecutionId)
                                .then(() => {
                                    chatSession.channelId = (toolResponse as ToolResponse).updateChannelId!;
                                })
                                .catch((error) => {
                                    this.logger.error(`handleFunctionCall() Chat session ${chatSession.id} error updating channel: ${error}`);
                                });

                            const workRequestDb = await WorkRequestDb.findOne({
                                where: {
                                    taskExecutionId: workRequest.taskExecutionId,
                                },
                                include: [
                                    {
                                        all: true,
                                    },
                                ],
                            }).catch((error) => {
                                this.logger.error(`handleFunctionCall() Error finding work request: ${error}`);
                                return undefined;
                            });

                            if (workRequestDb) {
                                const workRequest = workRequestDb.toModel();
                                this.listenForSessionMessages(workRequest.request!, (toolResponse as ToolResponse).updateChannelId);
                            }
                        }
                    }
                } else if (!toolCall.result) {
                    this.logger.debug(
                        `handleFunctionCall() Chat session ${chatSession.id} tool not found for function ${toolCall.name}`
                    );
                    toolCall.result = `No tool found for "${toolCall.name}"`;
                }
            }
        }
        return {
            id: randomUUID(),
            sessionId: chatSession.id,
            senderId: this.config.id,
            timestamp: new Date().getTime(),
            role: "tool",
            state: state,
            toolCalls: toolCalls ?? null,
        } as ChatMessage;
    }

    public getToolId(
        functionName: string,
        toolSchemas: Record<string, ToolCall[]>
    ): string | undefined {
        this.logger.debug(`getToolForFunction() Looking for function ${functionName}`);
        for (const [toolid, functions] of Object.entries(toolSchemas)) {
            this.logger.debug(`getToolForFunction() Looking for function ${functionName} in tool ${toolid}`);
            if (functions.find((f) => f.name === functionName)) {
                this.logger.debug(`getToolForFunction() Found function ${functionName} in tool ${toolid}`);
                return toolid;
            }
        }
        return undefined;
    }

    private handleHumanState(request: ToolRequest, response: ToolResponse): void {
        if (response.human_state) {
            const channel = BrokerManager.channelBroker?.getObject(request.channelId ?? "");
            this.logger.debug(
                `execute() message=${JSON.stringify(response.human_state)} channel=${request.channelId} taskExecutionId=${request.taskExecutionId}`
            );
            if (channel && request.taskExecutionId) {
                const message: MessageRequest = {
                    messageId: request.requestId,
                    channelId: request.channelId!,
                    message: "",
                    toolCalls: [{
                        arguments: {},
                        name: request.toolCall.name,
                        sessionId: request.taskExecutionId,
                        humanState: response.human_state,
                        image: response.image,
                    }],
                    messageType: "tool-response",
                    final: false,
                    timestamp: Date.now(),
                    senderId: this.config.id!,
                    taskExecutionId: request.taskExecutionId,
                    workerId: this.config.id!,
                    ignoreResponse: true,
                    username: this.config.name,
                };
                channel
                    .message(message)
                    .then(() => {
                        this.logger.debug(
                            `execute() message=${JSON.stringify(response.human_state)} channel=${request.channelId} taskExecutionId=${request.taskExecutionId} sent`
                        );
                    })
                    .catch((error: Error) => {
                        this.logger.error(
                            `execute() message=${JSON.stringify(response.human_state)} channel=${request.channelId} taskExecutionId=${request.taskExecutionId} error=${error.message}`
                        );
                    });
            } else {
                this.logger.error(
                    `execute() channel=${request.channelId} taskExecutionId=${request.taskExecutionId} not found`
                );
            }
        }
    }

    public async addMessage(chatSession: ChatSession, message: ChatMessage): Promise<ChatSession> {
        if (chatSession.messages.find((m) => m.id === message.id)) {
            this.logger.debug(`addMessage() Chat session ${chatSession.id} message ${message.id} already exists`);
            return chatSession;
        }
        // if (message.state) {
        //     this.clearStates();
        // }
        this.logger.debug(`addMessage() Chat session ${chatSession.id} adding message`);
        await WorkerChatMessageDb.create({
            id: randomUUID(),
            sessionId: chatSession.id,
            text: message.text,
            role: message.role,
            senderId: message.senderId,
            timestamp: message.timestamp,
            done: message.done,
            state: message.state,
            username: message.username,
            image: message.image,
            functionCall: message.toolCalls ? jsonStringify(message.toolCalls) : undefined,
            channelMessageId: message.channelMessageId,
            cancelled: message.cancelled,
        }).catch((error: Error) => {
            this.logger.error(`addMessage() Error adding message ${JSON.stringify(message)}: ${error}`);
            throw error;
        });
        const chatSessionDb = await WorkerChatSessionDb.findOne({
            where: {
                id: chatSession.id,
            },
            include: [
                {
                    model: WorkerChatMessageDb,
                },
            ],
        }).catch((error: Error) => {
            this.logger.error(`addMessage() Error finding chat session ${chatSession.id}: ${error}`);
            throw error;
        });
        if (!chatSessionDb) {
            throw new Error(`Failed to find chat session ${chatSession.id}`);
        }
        return chatSessionDb.toModel();
    }

    public clearStates(): void {
        // const chatMessages = await WorkerChatMessageDb.findAll({
        //     where: {
        //         sessionId: sessionId,
        //     },
        //     include: [
        //         {
        //             nested: true,
        //             all: true,
        //         },
        //     ],
        // });
        // for (const chatMessage of chatMessages) {
        //     chatMessage.state = null;
        //     await chatMessage.save();
        // }
    }

    onWorkComplete(request: WorkRequest) {
        this.logger.debug(`onWorkComplete() taskExecutionId=${request.taskExecutionId} workerId=${request.workerId} taskId=${request.taskId}`);
    }

    handleWorkResponse(response: WorkResponse): void {
        WorkRequestDb.findOne({
            where: {
                taskExecutionId: response.taskExecutionId,
            },
            include: [
                {
                    all: true,
                },
            ],
        }).then((db) => {
            this.sessionSubscriptions.get(response.taskExecutionId)?.unsubscribe();
            this.sessionSubscriptions.delete(response.taskExecutionId);

            if (!db) {
                this.logger.error(`handleWorkResponse() work request not found for task: ${response.taskExecutionId}`);
                this.activeRequests.delete(response.taskExecutionId);

                return;
            }
            db.status = "complete";
            db.response = jsonStringify(response);
            const model = db.toModel();
            if (model.toolSchemas) {
                for (const toolId of Object.keys(model.toolSchemas)) {
                    BrokerManager.toolBroker.workCompleteCallback({ orgId: this.config.orgId, taskExecutionId: response.taskExecutionId, toolId }).catch((error) => {
                        this.logger.error(`handleWorkResponse() Error calling work complete callback for tool: ${toolId}: ${error}`);
                    });
                }
            }
            db.save().then(() => {
                this.onWorkComplete(model.request!);
                BrokerManager.workerBroker.respond(response);
                QueueService.getNext(response.workerId).then((workRequest) => {
                    if (workRequest) {
                        const request = workRequest.toModel();
                        if (request.request) {
                            this.queueWork(request.request).catch((error) => {
                                this.logger.error(`handleWorkResponse() Error queuing work request: ${error}`);
                            });
                        }
                    }
                }).catch((error) => {
                    this.logger.error(`handleWorkResponse() Error getting next work request: ${error}`);
                });
                this.activeRequests.delete(response.taskExecutionId);
            }).catch((error) => {
                this.logger.error(`Error saving work request: ${error}`);
                this.activeRequests.delete(response.taskExecutionId);
            });
        }).catch((error) => {
            this.logger.error(`handleWorkResponse() Error finding work request ${response.taskExecutionId}: ${error}`);
            this.activeRequests.delete(response.taskExecutionId);
        });


    }

    public chatComplete(response: ChatMessage | undefined): boolean {
        return response?.toolCalls?.some(tc => tc.name === TASK_COMPLETE_FUNCTION_NAME) ?? false;
    }

    public nextMessageShouldBeFromWorker(message: ChatMessage): boolean {
        if (message.cancelled) {
            this.logger.debug(`nextMessageShouldBeFromWorker() message cancelled`);
            return false;
        }
        const shouldBeFromWorker =
            message.role === "user" ||
            message.role === "tool" ||
            message.username === "critic" ||
            message.username === "thought" ||
            message.username === "manager";
        this.logger.debug(`nextMessageShouldBeFromWorker() shouldBeFromWorker=${shouldBeFromWorker}`);

        return shouldBeFromWorker;
    }

    public nextMessageShouldBeFromTool(response: ChatMessage | undefined): boolean {
        const shouldBeFromTool = response?.toolCalls !== undefined && !response.toolCalls.some(tc => tc.result);
        this.logger.debug(`nextMessageShouldBeFromTool() shouldBeFromTool=${shouldBeFromTool}`);
        return shouldBeFromTool;
    }

    public async loadTools(tools: string[]): Promise<Record<string, FunctionDocument[]>> {

        const toolSchemas: Record<string, FunctionDocument[]> = {};
        for (const toolid of tools ?? []) {
            if (toolSchemas[toolid]) {
                this.logger.debug(`loadTools() Tool ${toolid} already loaded`);
                continue;
            }
            this.logger.debug(`loadTools() Loading tool ${toolid}`);
            const toolSchema = await BrokerManager.toolBroker.getObject(toolid)?.schema();
            if (toolSchema) {
                this.addToolSchemaFunctions(toolid, toolSchema, toolSchemas);
            } else {
                this.logger.warn(`loadTools() Tool ${toolid} not found`);
                const resultPromise = new Promise<FunctionDocuments>((resolve) => {
                    let retries = 0;
                    const retryInterval = setInterval(() => {
                        BrokerManager.toolBroker.getObject(toolid)?.schema().then((toolSchema) => {
                            if (toolSchema) {
                                clearInterval(retryInterval);
                                resolve(toolSchema);
                            } else {
                                retries++;
                                if (retries > 5) {
                                    clearInterval(retryInterval);
                                    resolve({ functions: [] });
                                }
                            }
                        }).catch((error) => {
                            this.logger.error(`loadTools() Tool ${toolid} schema error: ${error}`);
                            clearInterval(retryInterval);
                            resolve({ functions: [] });
                        })
                    }, 5000);
                });
                const result = await resultPromise;
                this.addToolSchemaFunctions(toolid, result, toolSchemas);
            }
        }

        return toolSchemas;
    }

    private addToolSchemaFunctions(toolId: string, toolSchema: FunctionDocuments, toolSchemas: Record<string, FunctionDocument[]>): void {
        if (!toolSchema.functions) {
            this.logger.error(`loadTools() Tool ${toolId} has no functions`);
            return;
        }
        this.logger.debug(`loadTools() Tool ${toolId} loaded`);
        const functions = toolSchema.functions;
        if (!functions || functions.length === 0) {
            this.logger.error(`loadTools() Tool ${toolId} has no functions`);
        } else {
            this.logger.debug(`loadTools() Tool ${toolId} has ${functions.length} functions`);
        }
        toolSchemas[toolId] = toolSchema.functions;
    }

    public removeTask(taskExecutionId: string): void {
        this.logger.debug(`abortTask() taskExecutionId=${taskExecutionId}`);
        this.cancelSubjects.get(taskExecutionId)?.next(true);
        this.cancelSubjects.get(taskExecutionId)?.complete();
        this.cancelSubjects.delete(taskExecutionId);

        this.abortSubjects.get(taskExecutionId)?.unsubscribe();
        this.abortSubjects.delete(taskExecutionId);

        this.stopListeningForSessionMessages(taskExecutionId);
    }


    public topLevelObjectKey(): string {
        throw new Error("Method not implemented.");
    }
    public schema(): Promise<Record<string, FunctionParameters>> {
        throw new Error("Method not implemented.");
    }
    public override validateObject(): Promise<boolean> {
        throw new Error("Method not implemented.");
    }

}