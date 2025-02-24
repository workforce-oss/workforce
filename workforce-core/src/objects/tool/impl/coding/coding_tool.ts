import { Configuration } from "../../../../config/configuration.js";
import { Logger } from "../../../../logging/logger.js";
import { convertToAPICall, FunctionDocuments, getFunctions } from "../../../../util/openapi.js";
import { ChannelBroker } from "../../../channel/broker.js";
import { Tool } from "../../base.js";
import { ToolConfig, ToolRequest, ToolResponse } from "../../model.js";
import { CodingToolMetadata } from "./coding_tool_metadata.js";
import { KubernetesManager } from "./k8s_manager.js";
import schema from "./api_schema.js";
import { getHtml } from "./index_template.js";
import { WebhookRouteManager } from "../../../../manager/webhook_route_manager.js";
import { VsCodeInstanceManager } from "./instance_manager.js";
import { LocalManager } from "./local_manager.js";
import { VariablesSchema } from "../../../base/variables_schema.js";
export class CodingTool extends Tool<ToolConfig> {
    logger: Logger = Logger.getInstance("CodingTool");

    private instanceManager: VsCodeInstanceManager;
    constructor(config: ToolConfig) {
        super(config, () => undefined);
        if (config.variables?.mode === "remote") {
            this.instanceManager = KubernetesManager.getInstance();
        } else {
            const serverUrl = config.variables?.server_url as string | undefined;
            this.instanceManager = LocalManager.getInstance(serverUrl ?? "http://localhost:8084/vscode-extension-server");
        }
    }

    public static defaultConfig(orgId: string): ToolConfig {
        return CodingToolMetadata.defaultConfig(orgId);
    }

    public async execute(
        request: ToolRequest,
    ): Promise<ToolResponse> {
        this.logger.debug(`execute() request=${request.requestId} taskExecutionId=${request.taskExecutionId}`);
        const schema = await this.getSchema();
        if (!schema) {
            throw new Error("Error getting schema.");
        }

        const url = this.instanceManager.getApiUrl(request.taskExecutionId);
        this.logger.debug(`execute() url=${url}`);
        const apiCall = convertToAPICall(request.toolCall, schema);
        if (apiCall.path === "/collabUrl") {
            return {
                toolId: this.config.id!,
                requestId: request.requestId,
                success: true,
                timestamp: Date.now(),
                taskExecutionId: request.taskExecutionId,
                updateChannelId: this.config.channel,
                machine_message: this.getCollabUrl(request.taskExecutionId, request.channelThreadId),
            };
        }

        const method = apiCall.verb.toUpperCase();
        const headers = apiCall.headers ?? {};

        if (request.taskExecutionId) {
            headers["X-Session-Id"] = request.taskExecutionId;
            headers["X-Task-Execution-Id"] = request.taskExecutionId;
        }
        if (apiCall.headers) {
            for (const [key, value] of Object.entries(apiCall.headers)) {
                headers[key] = value;
            }
        }

        const bodyString = JSON.stringify(apiCall.body);
        this.logger.debug(
            `execute() url=${url} method=${method} headers=${JSON.stringify(
                headers
            )} body=${bodyString}`
        );

        const urlWithQueryParams = new URL(url + apiCall.path);

        for (const [key, value] of Object.entries(apiCall.queryParams)) {
            urlWithQueryParams.searchParams.append(key, value);
        }

        if (apiCall.body && typeof apiCall.body !== "string") {
            // set content type to json
            headers["Content-Type"] = "application/json";
            apiCall.body.repoUrl = this.config.variables?.index_repo_location;
        }

        const requestInit = {
            method,
            headers,
            body: method === "GET" ? null : bodyString,
        } as RequestInit;

        return fetch(urlWithQueryParams, {
            method: requestInit.method,
            headers: requestInit.headers,
            body: requestInit.body,
        })
            .then((response) => {
                if (!response.ok) {
                    const toolResponse: ToolResponse = {
                        toolId: this.config.id!,
                        requestId: request.requestId,
                        success: false,
                        timestamp: Date.now(),
                        taskExecutionId: request.taskExecutionId,
                        machine_message: `HTTP error: ${response.status}`,
                    }
                    return toolResponse;
                }
                this.logger.debug(`execute() response=${JSON.stringify(response)}`);
                return response.json();

            }).then((json: Record<string, unknown>) => {
                this.logger.debug(`execute() json=${JSON.stringify(json)}`);
                if (json.error) {
                    const toolResponse: ToolResponse = {
                    
                        toolId: this.config.id!,
                        requestId: request.requestId,
                        success: false,
                        timestamp: Date.now(),
                        taskExecutionId: request.taskExecutionId,
                        machine_message: json.error as string,
                    }
                    return toolResponse;
                }
                const jsonWithoutMachineState = { ...json };
                delete jsonWithoutMachineState.machineState;
                const toolResponse: ToolResponse = {
                    toolId: this.config.id!,
                    requestId: request.requestId,
                    success: true,
                    timestamp: Date.now(),
                    taskExecutionId: request.taskExecutionId,
                    machine_state: json.machineState as Record<string, unknown>,
                    machine_message: JSON.stringify(jsonWithoutMachineState),
                    updateChannelId: this.config.channel,
                };
                return toolResponse;
            }).catch((error: Error) => {
                this.logger.error(`execute() error=${error}`);
                this.logger.error(`execute() ${JSON.stringify(error)}`)
                const ToolResponse: ToolResponse = {
                    toolId: this.config.id!,
                    requestId: request.requestId,
                    success: false,
                    timestamp: Date.now(),
                    taskExecutionId: request.taskExecutionId,
                    machine_message: error.message,
                };
                return ToolResponse;
            });
    }

    private html(taskExecutionId: string): string {
        return getHtml({
            chatScriptUrl: Configuration.ChatScriptUrl,
            orgId: this.config.orgId,
            channelId: this.config.channel ?? "",
            sessionId: taskExecutionId,
            codeEditorUrl: `${Configuration.BaseUrl}/tools/${this.config.orgId}/${taskExecutionId}/code`
        })
    }

    private getCollabUrl(taskExecutionId: string, threadId?: string): string {
        return this.instanceManager.getCollabUrl({ orgId: this.config.orgId, taskExecutionId, repoUrl: this.config.variables?.index_repo_location as string, channelId: this.config.channel, threadId });
    }

    public async schema(): Promise<FunctionDocuments> {
        const schema = await this.getSchema();
        const functions = getFunctions(schema);


        if (this.config.variables?.read_only) {
            return {
                "functions": functions.filter((f) => f.name.toLowerCase().startsWith("get"))
            };
        } else {
            return {
                "functions": functions,
            };
        }
    }


    private getSchema(): Promise<Record<string, unknown>> {
        return Promise.resolve(schema);
    }

    public async initSession(taskExecutionId?: string  , workerId?: string  , channelId?: string  , channelBroker?: ChannelBroker  ): Promise<void> {
        this.logger.debug(`initSession() taskExecutionId=${taskExecutionId} workerId=${workerId} channelId=${channelId}`);
        if (!this.config.variables?.index_repo_location) {
            throw new Error("index_repo_location is required.");
        }
        if (!this.config.variables?.index_repo_username) {
            throw new Error("index_repo_username is required.");
        }
        if (!this.config.variables?.index_repo_password) {
            throw new Error("index_repo_password is required.");
        }
        const indexRepoBranch = this.config.variables?.index_repo_branch as string | undefined;

        await this.instanceManager.createVsCode({
            orgId: this.config.orgId,
            taskExecutionId: taskExecutionId!,
            indexRepoLocation: this.config.variables?.index_repo_location as string,
            indexRepoBranch: indexRepoBranch ?? "main",
            indexRepoUsername: this.config.variables?.index_repo_username as string,
            indexRepoPassword: this.config.variables?.index_repo_password as string,
        }).then((response) => {
            this.logger.debug(`initSession() response=${JSON.stringify(response)}`);
        });

        channelBroker?.message({
            messageId: "",
            channelId: channelId!,
            message: `${Configuration.BaseUrl}/tools/${this.config.orgId}/${taskExecutionId!}/code`,
            messageType: "visualization",
            timestamp: Date.now(),
            senderId: this.config.id!,
            taskExecutionId: taskExecutionId!,
            workerId: workerId!,
            ignoreResponse: true,
        }).catch((error: Error) => {
            this.logger.error(`initSession() error=${error}`);
        });

        // create a webhook that retuns the html
        const routeManager = await WebhookRouteManager.getInstance();
        const route = {
            path: `/tools/${this.config.orgId}/${taskExecutionId!}/index.html`,
            objectId: this.config.id!,
            orgId: this.config.orgId,
            taskExecutionId: taskExecutionId!,
            webSocket: false,
            response: this.html(taskExecutionId!),
        }
        routeManager.addRoute(route);
        routeManager.subscribeToWebhookEvents(this.config.orgId, this.config.id!, route.path, (event) => {
            this.logger.debug(`initSession() event=${JSON.stringify(event)}`);
        });
    }

    static variablesSchema(): VariablesSchema {
        return CodingToolMetadata.variablesSchema();
    }

    public getTaskOutput(): Promise<string | undefined> {
        return Promise.resolve(undefined);
    }

    public async destroy(): Promise<void> {
        const routeManager = await WebhookRouteManager.getInstance();
        routeManager.removeRoutesByObjectId(this.config.orgId, this.config.id!);
    }

    //TODO: Add a message to send to the user when the task is complete so that we can mark the task complete in vscode.
    public async workCompleteCallback(taskExecutionId: string): Promise<void> {
        await this.instanceManager.deleteVsCode({orgId: this.config.orgId, taskExecutionId});
        const routeManager = await WebhookRouteManager.getInstance();
        routeManager.removeRoute( {
            path: `/tools/${this.config.orgId}/${taskExecutionId}/index.html`,
            objectId: this.config.id!,
            orgId: this.config.orgId,
            taskExecutionId: taskExecutionId,
            webSocket: false,
            response: this.html(taskExecutionId),
        });
    }


    public validateObject(): Promise<boolean> {
        // Nothing to do, we rely on the web service to validate the request.
        return Promise.resolve(true);
    }

}