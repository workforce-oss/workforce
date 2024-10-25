import { Logger } from "../../../../logging/logger.js";
import { BrokerManager } from "../../../../manager/broker_manager.js";
import { FunctionDocument, FunctionDocuments } from "../../../../util/openapi.js";
import { snakeify } from "../../../../util/snake.js";
import { CredentialHelper } from "../../../credential/helper.js";
import { Tool } from "../../base.js";
import { ToolConfig, ToolRequest, ToolResponse } from "../../model.js";

export class MessageChannelTool extends Tool<ToolConfig> {
    logger: Logger = Logger.getInstance("MessageChannelTool");

    async execute(request: ToolRequest): Promise<ToolResponse> {
        const message = request.toolCall.arguments.message as string | undefined;
        if (!message) {
            throw new Error("Message not provided.");
        }
        this.logger.debug(`execute() request=${JSON.stringify(request, null, 2)}`);

        if (!this.config.channel) {
            throw new Error("Channel not configured.");
        }

        const channelSubType = BrokerManager.channelBroker.getObject(this.config.channel)?.config.type;
        if (!channelSubType) {
            throw new Error("Channel subtype not configured.");
        }

        const workerTokenCredentialId = request.workerChannelUserConfig?.[channelSubType];
        if (!workerTokenCredentialId) {
            throw new Error("Channel worker token credential not configured.");
        }

        const workerTokenCredential = await CredentialHelper.instance.getSecret(workerTokenCredentialId);
        if (!workerTokenCredential?.token) {
            throw new Error("Channel worker token credential not found.");
        }

        let workerToken = workerTokenCredential.token as string;
        this.logger.debug(`execute() workerToken=${workerToken}`);

        // remove any pipes
        workerToken = workerToken.replace(/\|/g, "");
        
        const workerConfig = BrokerManager.workerBroker.getObject(request.workerId)?.config;

        await BrokerManager.channelBroker.join(this.config.channel, request.workerId, workerToken, workerConfig?.name ?? "Assistant").catch((err) => {
            this.logger.error(`Error joining channel ${this.config.channel}`, err);
            throw err;
        });
        
        await BrokerManager.channelBroker?.message({
            channelId: this.config.channel,
            message: message,
            messageId: request.requestId,
            senderId: this.config.id!,
            taskExecutionId: request.taskExecutionId,
            workerId: request.workerId,
            final: true,
            timestamp: Date.now(),
        }).catch((err) => {
            this.logger.error(`Error sending message to channel ${this.config.channel}`, err);
            throw err;
        });

        return Promise.resolve({
            toolId: this.config.id!,
            requestId: request.requestId,
            taskExecutionId: request.taskExecutionId,
            timestamp: Date.now(),
            success: true,
            machine_message: "Message sent successfully.",
        });
        
    }

    initSession(): Promise<void> {
        return Promise.resolve();
    }
    getTaskOutput(): Promise<string | undefined> {
        return Promise.resolve(undefined);
    }
    workCompleteCallback(): Promise<void> {
        return Promise.resolve();
    }

    public destroy(): Promise<void> {
        // nothing to do
        return Promise.resolve();
    }
    public schema(): Promise<FunctionDocuments> {
        const document: FunctionDocument = {
            name: `send_message_${snakeify(this.config.name)}`,
            description: this.config.variables?.purpose as string | undefined,
            summary: "Send a message to a channel.",
            parameters: {
                type: "object",
                properties: {
                    message: {
                        description: "The message to send.",
                        type: "string",
                    }

                },
                required: ["message"],
            }
        }
        return Promise.resolve({
            "functions": [document]
        });
    }
    public validateObject(): Promise<boolean> {
        return Promise.resolve(true);
    }


}