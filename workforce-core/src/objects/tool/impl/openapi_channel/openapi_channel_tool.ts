import _ from "lodash";
import { Logger } from "../../../../logging/logger.js";
import { BrokerManager } from "../../../../manager/broker_manager.js";
import { FunctionDocuments, getFunctions } from "../../../../util/openapi.js";
import { HumanState, ToolCall } from "../../../base/model.js";
import { ChannelBroker } from "../../../channel/broker.js";
import { CredentialHelper } from "../../../credential/helper.js";
import { Tool } from "../../base.js";
import { ToolConfig, ToolRequest, ToolResponse } from "../../model.js";
import { OpenAPIChannelToolMetadata } from "./openapi_channel_tool_metadata.js";
import { jsonParse, jsonStringify } from "../../../../util/json.js";

export class OpenAPIChannelTool extends Tool<ToolConfig> {
    logger: Logger = Logger.getInstance("OpenAPIChannelTool");

    public static defaultConfig(orgId: string): ToolConfig {
        return OpenAPIChannelToolMetadata.defaultConfig(orgId);
    }

    public async execute(request: ToolRequest): Promise<ToolResponse> {
        if (!request.channelId) {
            this.logger.error("Channel not configured.");
            throw new Error("Channel not configured.");
        }
        const channelSubType = BrokerManager.channelBroker.getObject(request.channelId)?.config.subtype;
        if (!channelSubType) {
            this.logger.error("Channel subtype not configured.");
            throw new Error("Channel subtype not configured.");
        }

        const workerTokenCredentialId = request.workerChannelUserConfig?.[channelSubType];
        if (!workerTokenCredentialId) {
            this.logger.error("Channel worker token credential not configured.");
            throw new Error("Channel worker token credential not configured.");
        }

        const workerTokenCredential = await CredentialHelper.instance.getSecret(workerTokenCredentialId);
        if (!workerTokenCredential?.token) {
            this.logger.error("Channel worker token credential not found.");
            throw new Error("Channel worker token credential not found.");
        }

        const workerToken = workerTokenCredential.token as string;
        this.logger.debug(`execute() workerToken=${workerToken}`);

        const workerConfig = BrokerManager.workerBroker.getObject(request.workerId)?.config;

        await BrokerManager.channelBroker.join(request.channelId, request.workerId, workerToken, workerConfig?.name ?? this.displayName, request.taskExecutionId);

        const completionPromise = new Promise<ToolResponse>((resolve, reject) => {
            const rejectionTimeout = setTimeout(() => {
                this.logger.error(`Timeout waiting for response for request ${request.requestId}`);
                subscription.unsubscribe();
                reject(new Error(`Timeout waiting for response for request ${request.requestId}`));
            }, 60000);

            const subscription = BrokerManager.channelBroker?.subscribeToSession(request.channelId!, request.taskExecutionId, request.workerId, ["tool_response"], (message) => {
                const toolCalls = message.toolCalls;
                if (!toolCalls) {
                    return;
                }
                for (const toolCall of toolCalls) {
                    if (toolCall.toolRequestId === request.requestId) {
                        clearTimeout(rejectionTimeout);
                        this.logger.debug(`Received tool response: ${JSON.stringify(toolCall)}`);
                        subscription.unsubscribe();
                        const result = jsonParse<Record<string, unknown>>(toolCall.result) ?? {};
                        const machineState = this.extractMachineState(result);
                        const humanState = this.extractHumanState(result);
                        resolve({
                            toolId: this.config.id!,
                            requestId: request.requestId,
                            success: true,
                            taskExecutionId: request.taskExecutionId,
                            timestamp: Date.now(),
                            machine_message: jsonStringify(result),
                            machine_state: machineState as Record<string, unknown>,
                            human_state: humanState,
                        });
                    }
                }
            });

            this.addHumanState(request.toolCall);

            BrokerManager.channelBroker?.message({
                messageId: request.requestId,
                channelId: request.channelId!,
                message: "",
                messageType: "tool_request",
                toolCalls: [{
                    name: request.toolCall.name,
                    arguments: request.toolCall.arguments,
                    call_id: request.toolCall.call_id,
                    humanState: request.toolCall.humanState,
                    sessionId: request.toolCall.sessionId,
                    toolRequestId: request.requestId,
                    toolType: this.config.subtype,
                    timestamp: Date.now(),
                }],
                senderId: this.config.id!,
                taskExecutionId: request.taskExecutionId,
                workerId: request.workerId,
                timestamp: Date.now(),
                ignoreResponse: true,

            }).catch((err: Error) => {
                this.logger.error(`Error sending message to channel ${request.channelId}`, err);
                clearTimeout(rejectionTimeout);
                reject(err);
            });
        });

        return completionPromise;
    }

    protected extractMachineState<TMachineState>(result: Record<string, unknown>): TMachineState | undefined {
        if (!result.machineState) {
            return undefined;
        }
        const machineState = _.cloneDeep(result.machineState);
        delete result.machineState;
        return machineState as TMachineState;
    }

    protected extractHumanState(result: Record<string, unknown>): HumanState | undefined {
        if (!result.humanState) {
            return undefined;
        }
        const humanState = _.cloneDeep(result.humanState);
        delete result.humanState;
        return humanState as HumanState;
    }

    protected addHumanState(toolCall: ToolCall): void;

    protected addHumanState(): void {
        // No-op
    }



    initSession(taskExecutionId?: string, workerId?: string, channelId?: string, channelBroker?: ChannelBroker): Promise<void>;

    initSession(): Promise<void> {
        return Promise.resolve();
    }
    getTaskOutput(taskExecutionId?: string  ): Promise<string | undefined>;

    getTaskOutput(): Promise<string | undefined> {
        return Promise.resolve(undefined);
    }
    workCompleteCallback(taskExecutionId: string): Promise<void>;

    workCompleteCallback(): Promise<void> {
        return Promise.resolve();
    }
    public destroy(): Promise<void> {
        return Promise.resolve();
    }

    protected async getSchema(): Promise<Record<string, unknown>> {
        if (this.config.variables?.raw_schema) {
            return jsonParse(this.config.variables.raw_schema as string) ?? {};
        }
        const schemaUrl = this.config.variables?.schema_url;
        if (!schemaUrl) {
            throw new Error("No raw_schema or schema_url provided.");
        }
        const resp = await fetch(schemaUrl as string);
        const json = await resp.json() as Record<string, unknown>;
        return json;
    }

    public async schema(): Promise<FunctionDocuments> {
        const schema = await this.getSchema();
        const functions = getFunctions(schema);
        this.logger.debug(`schema() functions: ${JSON.stringify(functions)}`);
        return {
            "functions": functions,
        }

    }
    public validateObject(): Promise<boolean> {
        // No validation needed
        return Promise.resolve(true);
    }
}