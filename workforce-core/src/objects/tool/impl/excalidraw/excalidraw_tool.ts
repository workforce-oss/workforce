import { randomUUID } from "crypto";
import { Logger } from "../../../../logging/logger.js";
import { BrokerManager } from "../../../../manager/broker_manager.js";
import { jsonParse } from "../../../../util/json.js";
import { ToolCall, ToolState } from "../../../base/model.js";
import { OpenAPIChannelTool } from "../openapi_channel/openapi_channel_tool.js";
import schema from "./api_schema.js";
import { ExcalidrawMachineState } from "./excalidraw_tool_metdata.js";

export class ExcalidrawTool extends OpenAPIChannelTool {
    logger = Logger.getInstance("ExcalidrawTool");
    override getSchema(): Promise<Record<string, unknown>> {
        return Promise.resolve(schema);
    }

    override displayName = "Excalidraw";

    override addHumanState(toolCall: ToolCall): void {
        toolCall.humanState = {
            name: "Excalidraw",
            type: "excalidraw",
        }
    }
    override async getState(
        args: {
            currentState?: ToolState<ExcalidrawMachineState> | undefined;
            channelId?: string | undefined;
            channelThreadId?: string | undefined;
            taskExecutionId?: string | undefined;
            workerId?: string | undefined;
        }): Promise<ToolState<ExcalidrawMachineState> | undefined> {
            const requestId = randomUUID();
        const { channelId, taskExecutionId, workerId } = args;
        const completionPromise = new Promise<ToolState<ExcalidrawMachineState> | undefined>((resolve, reject) => {
            const rejectionTimeout = setTimeout(() => {
                this.logger.error(`Timeout waiting for response for request ${requestId}`);
                subscription.unsubscribe();
                reject(new Error(`Timeout waiting for response for request ${requestId}`));
            }, 60000);

            const subscription = BrokerManager.channelBroker?.subscribeToSession(channelId!, taskExecutionId!, workerId!, ["tool-response"], (message) => {
                this.logger.debug(`Received message: ${JSON.stringify(message)}`);
                const toolCalls = message.toolCalls;
                if (!toolCalls) {
                    return;
                }
                for (const toolCall of toolCalls) {
                    if (toolCall.toolRequestId === requestId) {
                        clearTimeout(rejectionTimeout);
                        this.logger.debug(`Received tool response: ${JSON.stringify(toolCall)}`);
                        subscription.unsubscribe();
                        const result = jsonParse<Record<string, unknown>>(toolCall.result) ?? {};
                        if (!result) {
                            this.logger.error("Result is undefined");
                            resolve(undefined);
                        }
                        const machineState = this.extractMachineState<ExcalidrawMachineState>(result);
                        if (!machineState) {
                            this.logger.error("Machine state is undefined");
                            resolve(undefined);
                            return;
                        }
                        const machineImage = toolCall.image;
                        if (toolCall.image) {
                            delete toolCall.image;
                        }
                        const toolState: ToolState<ExcalidrawMachineState> = {
                            toolId: this.config.id!,
                            taskExecutionId: taskExecutionId!,
                            machineState,
                            machineImage,
                            humanState: {
                                name: "Excalidraw",
                                type: "excalidraw",
                            },
                            timestamp: Date.now(),
                        }
                        resolve(toolState);
                    }
                }
            });

            const toolCall: ToolCall = {
                name: "get_excalidraw_elements",
                arguments: {},
                toolRequestId: requestId,
                call_id: requestId,
                humanState: {
                    name: "Excalidraw",
                    type: "excalidraw",
                },
                sessionId: taskExecutionId!,
                toolType: "excalidraw-tool",
                timestamp: Date.now(),
            }

            BrokerManager.channelBroker?.message({
                messageId: requestId,
                channelId: channelId!,
                message: "",
                messageType: "tool_request",
                toolCalls: [toolCall],
                senderId: this.config.id!,
                taskExecutionId: taskExecutionId!,
                workerId: workerId!,
                timestamp: Date.now(),
                ignoreResponse: true,
            }).catch((err: Error) => {
                this.logger.error(`Error sending message to channel ${channelId}`, err);
                clearTimeout(rejectionTimeout);
                reject(err);
            });
        });
        
        return completionPromise;       
    }
}