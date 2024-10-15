import { randomUUID } from "crypto";
import { Configuration } from "../../../../config/configuration.js";
import { Logger } from "../../../../logging/logger.js";
import { AuthCallBackManager, AuthHookCallbackEvent } from "../../../../manager/auth_callback_manager.js";
import { BrokerManager } from "../../../../manager/broker_manager.js";
import { APICall, convertToAPICall, FunctionDocuments, getFunctions, performAPICall } from "../../../../util/openapi.js";
import { HumanState } from "../../../base/model.js";
import { Tool } from "../../base.js";
import { ToolConfig, ToolRequest, ToolResponse } from "../../model.js";
import { OpenAPIToolMetadata } from "./openapi_tool_metadata.js";
import { AuthData } from "./openapi_types.js";
import _ from "lodash";
import { jsonParse } from "../../../../util/json.js";
import { VariablesSchema } from "../../../base/variables_schema.js";
export class OpenAPITool extends Tool<ToolConfig> {
    logger: Logger = Logger.getInstance("OpenAPITool");

    // protected authCache: Map<string, AuthData> = new Map();

    public static defaultConfig(orgId: string): ToolConfig {
        return OpenAPIToolMetadata.defaultConfig(orgId);
    }

    public async execute(
        request: ToolRequest,
    ): Promise<ToolResponse> {
        const schema = await this.getSchema();
        this.logger.debug(`execute() converting to API call: ${JSON.stringify(request.toolCall)}`);
        const apiCall = convertToAPICall(request.toolCall, schema);

        const result = await performAPICall({
            apiCall,
            openApiDocument: schema,
            orgId: this.config.orgId,
            taskExecutionId: request.taskExecutionId,
            variables: this.config.variables!,
            channelThreadId: request.channelThreadId,
            logger: this.logger,
            additionalQueryParams: this.additionalQueryParams(apiCall),
            oauth2CallBackHandler: async (auth: AuthData) => {
                return await this.refreshAuth({
                    auth, 
                    channelId: request.channelId,
                    workerId: request.workerId,
                    taskExecutionId: request.taskExecutionId,
            
                });                
            },
        }).catch((err: Error) => {
            this.logger.error(`Error performing API call: ${err.message}`);
            return { error: err.message };
        });

        if (result.error) {
            return {
                toolId: this.config.id!,
                requestId: request.requestId,
                timestamp: Date.now(),
                taskExecutionId: request.taskExecutionId,
                success: false,
                machine_message: result.error as string | undefined,
            };
        } else {
            const machine_state = await this.extractMachineState(apiCall, result);
            const human_state = await this.extractHumanState(apiCall, result);
            // await this.updateState({
            //     taskExecutionId: request.taskExecutionId,
            //     machineState: machine_state,
            //     humanState: human_state,
            // }).catch((err) => {
            //     this.logger.error(`Error updating state: ${err.message}`);
            // });
            const filtered = this.filterOutput(apiCall, result);

            return {
                toolId: this.config.id!,
                requestId: request.requestId,
                timestamp: Date.now(),
                taskExecutionId: request.taskExecutionId,
                success: true,
                human_state: human_state,
                machine_state: machine_state,
                machine_message: JSON.stringify(filtered),
            };
        }
    }

    protected extractMachineState(apiCall: APICall, result: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
        const machineState = _.cloneDeep(result.machineState as Record<string, unknown>);
        delete result.machineState;
        return Promise.resolve(machineState);
    }

    protected extractHumanState(apiCall: APICall, result: Record<string, unknown>): Promise<HumanState | undefined> {
        const humanState = _.cloneDeep(result.humanState) as HumanState;
        delete result.humanState;
        return Promise.resolve(humanState);
    }

    protected filterOutput(apiCall: APICall, result: Record<string, unknown>): Record<string, unknown> {
        return result;
    }

    protected async awaitAuthCallback(args: {auth: AuthData, channelId?: string, workerId?: string, taskExecutionId: string}): Promise<boolean> {
        const { auth, channelId, workerId, taskExecutionId } = args;
        const toolConfig = this.config;
        if (!auth.state) {
            throw new Error("No state provided.");
        }
        const manager = await AuthCallBackManager.getInstance();

        manager.registerHook({
            objectId: this.config.id!,
            orgId: this.config.orgId,
            state: auth.state,
        });

        const callBackPromise = new Promise<AuthHookCallbackEvent | undefined>((resolve, reject) => {
            manager.subscribeToCallbackEvents(this.config.orgId, this.config.id!, auth.state!, (data) => {
                if (data.state && data.state === auth.state) {
                    this.logger.debug(`awaitAuthCallback() data=${JSON.stringify(data)}`);
                    resolve(data);
                } else {
                    reject(new Error("State mismatch."));
                }
            });
        });

        BrokerManager.channelBroker?.message({
            channelId: channelId!,
            message: `I'd like to connect to ${this.config.name} to complete your request.\n\n[Click here to authorize](${auth.authorizationUrl})`,
            messageId: randomUUID(),
            senderId: workerId!,
            taskExecutionId: taskExecutionId,
            workerId: workerId!,
            timestamp: Date.now(),
        }).catch((err: Error) => {
            this.logger.error(`awaitAuthCallback() error=${err.message}`);
        });


        const callbackData = await callBackPromise.catch((err: Error) => {
            this.logger.error(`awaitAuthCallback() error=${err.message}`);
            return undefined;
        });
        if (!callbackData) {
            return false;
        }
        this.logger.debug(`awaitAuthCallback() callbackData=${JSON.stringify(callbackData)}`);

        const code = (callbackData.queryParamaters as Record<string, string>).code;
        if (!code) {
            this.logger.error(`awaitAuthCallback() No code found in callbackData=${JSON.stringify(callbackData)}`);
            return false;
        }
        if (!auth.tokenUrl) {
            this.logger.error(`awaitAuthCallback() No tokenUrl found in auth=${JSON.stringify(auth)}`);
            return false;
        }

        if (!toolConfig.variables?.client_id) {
            this.logger.error(`awaitAuthCallback() No clientId found in toolConfig.variables=${JSON.stringify(toolConfig.variables)}`);
            return false;
        }

        if (!toolConfig.variables?.oauth2_audience) {
            this.logger.error(`awaitAuthCallback() No oauth2_audience found in toolConfig.variables=${JSON.stringify(toolConfig.variables)}`);
            return false;
        }

        const body = new URLSearchParams();
        body.append("grant_type", "authorization_code");
        body.append("code", code);
        body.append("client_id", toolConfig.variables.client_id as string);
        body.append("client_secret", toolConfig.variables.client_secret as string);
        body.append("redirect_uri", `${Configuration.BaseUrl}/workforce-api/auth/callback`);

        const headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        };

        const response = await fetch(auth.tokenUrl, {
            method: "POST",
            headers: headers,
            body: body
        });

        const json = await response.json() as { access_token: string, refresh_token: string, expires_in: number, token_type: string, error: string };
        if (json.error) {
            this.logger.error(`awaitAuthCallback() error=${json.error}`);
            return false;
        }
        auth.header = "Authorization"
        auth.headerValue = `${json.token_type} ${json.access_token}`;
        auth.refreshToken = json.refresh_token;
        auth.expiresIn = json.expires_in;
        auth.issuedAt = Date.now();
        return true;
    }

    protected async refreshAuth(args: {auth: AuthData, channelId?: string, workerId?: string, taskExecutionId: string}): Promise<boolean> {
        const { auth } = args;
        let authed = false;
        if (auth?.expiresIn && auth?.issuedAt) {
            const now = Date.now();
            const expiresAt = auth.issuedAt + (auth.expiresIn * 1000);
            if (now > expiresAt) {
                authed = false;
            } else {
                authed = true;
            }
        }

        if (authed) {
            return true;
        }

        if (!authed && auth.refreshToken && auth.tokenUrl) {
            const body = new URLSearchParams();
            body.append("grant_type", "refresh_token");
            body.append("refresh_token", auth.refreshToken);
            body.append("client_id", this.config.variables?.client_id as string);
            body.append("client_secret", this.config.variables?.client_secret as string);

            const headers = {
                "Content-Type": "application/x-www-form-urlencoded"
            };

            const response = await fetch(auth.tokenUrl, {
                method: "POST",
                headers: headers,
                body: body
            });

            const json = await response.json() as { access_token: string, refresh_token: string, expires_in: number, token_type: string, error: string };
            if (json.error) {
                this.logger.error(`refreshAuth() error=${json.error}`);
                return true
            }
            auth.header = "Authorization"
            auth.headerValue = `${json.token_type} ${json.access_token}`;
            auth.refreshToken = json.refresh_token;
            auth.expiresIn = json.expires_in;
            auth.issuedAt = Date.now();

            return true;
        }

        return this.awaitAuthCallback(args);

        
    }
    protected additionalQueryParams(apiCall: APICall): Record<string, string>;

    protected additionalQueryParams(): Record<string, string> {
        return {};
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

    private getHeaders(openApiDocument: Record<string, unknown>, auth: AuthData): Promise<Record<string, string>> {
        const headers: Record<string, string> = {};
        if (auth?.header && auth.headerValue) {
            headers[auth.header] = auth.headerValue;
        }
        headers["Content-Type"] = "application/json";
        if (this.config.variables?.custom_headers) {
            try {
                const customHeaders = jsonParse(this.config.variables.custom_headers as string) ?? {};
                for (const [key, value] of Object.entries(customHeaders)) {
                    headers[key] = value as string;
                }
            } catch (err) {
                this.logger.error(`Error parsing custom headers: ${err as Error}`);
            }
        }
        return Promise.resolve(headers);
    }



    public async schema(): Promise<FunctionDocuments> {
        const schema = await this.getSchema();
        const functions = getFunctions(schema);
        this.logger.debug(`schema() functions=${JSON.stringify(functions)}`);
        return {
            "functions": functions,
        };
    }

    public initSession(): Promise<void> {
        return Promise.resolve();
    }

    static variablesSchema(): VariablesSchema {
        return OpenAPIToolMetadata.variablesSchema();
    }

    public getTaskOutput(): Promise<string | undefined> {
        return Promise.resolve(undefined);
    }

    public async destroy(): Promise<void> {
        // Nothing to do
    }

    public async workCompleteCallback(): Promise<void> {
        // this.authCache.delete(taskExecutionId);
    }


    public validateObject(): Promise<boolean> {
        // Nothing to do, we rely on the web service to validate the request.
        return Promise.resolve(true);
    }
}