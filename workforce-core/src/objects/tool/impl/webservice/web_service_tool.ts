import { Logger } from "../../../../logging/logger.js";
import { FunctionDocuments } from "../../../../util/openapi.js";
import {
  VariablesSchema
} from "../../../base/variables_schema.js";
import { ChannelBroker } from "../../../channel/broker.js";
import { MessageRequest } from "../../../channel/model.js";
import { Tool } from "../../base.js";
import { ToolConfig, ToolRequest, ToolResponse } from "../../model.js";
import { WebServiceToolMetadata } from "./web_service_tool_metadata.js";

export class WebServiceTool extends Tool<ToolConfig> {
  logger: Logger = Logger.getInstance("WebServiceTool");

  public static defaultConfig(orgId: string): ToolConfig {
    return WebServiceToolMetadata.defaultConfig(orgId);
  }

  public async execute(
    request: ToolRequest,
  ): Promise<ToolResponse> {
    const url = this.config.variables?.url as string | undefined;
    if (!url) {
      throw new Error("No url provided.");
    }
    const method = (this.config.variables?.method as string | undefined) ?? "GET";
    const headers = this.getHeaders();
    if (request.taskExecutionId) {
      headers["X-Session-Id"] = request.taskExecutionId;
    }
    if (request.taskExecutionId) {
      headers["X-Task-Execution-Id"] = request.taskExecutionId;
    }

    const bodyString = JSON.stringify(request.toolCall);
    this.logger.debug(
      `execute() url=${url} method=${method} headers=${JSON.stringify(
        headers
      )} body=${bodyString}`
    );

    return fetch(url, {
      method,
      headers,
      body: bodyString,
    })
      .then((response) => {
        this.logger.debug(`execute() response=${JSON.stringify(response)}`);
        return response.json();
      })
      .then((json: Record<string,unknown>) => {
        this.logger.debug(`execute() json=${JSON.stringify(json)}`);
        if (json.error) {
          return {
            toolId: this.config.id!,
            requestId: request.requestId,
            timestamp: Date.now(),
            taskExecutionId: request.taskExecutionId,
            success: false,
            message: json.error,
          };
        }
        return {
          toolId: this.config.id!,
          requestId: request.requestId,
          timestamp: Date.now(),
          taskExecutionId: request.taskExecutionId,
          success: true,
          message: JSON.stringify(json),
        };
      })
      .catch((err: Error) => {
        return {
          toolId: this.config.id!,
          requestId: request.requestId,
          taskExecutionId: request.taskExecutionId,
          timestamp: Date.now(),
          success: false,
          message: err.message,
        };
      });
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const authHeader = this.getAuthHeader();
    if (authHeader) {
      headers.Authorization = authHeader;
    }
    headers["Content-Type"] = "application/json";
    return headers;
  }

  private getAuthHeader(): string | undefined {
    if (this.config.variables?.bearer_token) {
      return `Bearer ${this.config.variables.bearer_token as string}`;
    } else if (
      this.config.variables?.username &&
      this.config.variables?.password
    ) {
      const encoded = btoa(
        `${this.config.variables.username as string}:${this.config.variables.password as string}`
      );
      return `Basic ${encoded}`;
    }
  }

  public async schema(): Promise<FunctionDocuments> {
    if (!this.config.variables?.schema_url) {
      throw new Error("No schema_url provided.");
    }
    const response = await fetch(this.config.variables.schema_url as string).catch(
      (err: Error) => {
        this.logger.error(`schema() error=${err.message}`);
        return undefined;
      }
    );
    if (!response) {
      return {
        functions: [],
      };
    }
    const schema = await response.json() as FunctionDocuments;
    return schema;
  }

  public async initSession(
    sessionId?: string,
    workerId?: string,
    channelId?: string,
    channelBroker?: ChannelBroker,

  ): Promise<void> {
    if (!this.config.variables?.visualizer_url) {
      this.logger.error("No visualizer_url provided.");
      return;
    }
    if (!channelBroker) {
      this.logger.error("No channelBroker provided.");
      return;
    }
    if (!sessionId) {
      this.logger.error("No sessionId provided.");
      return;
    }
    if (!channelId) {
      this.logger.error("No channel provided.");
      return;
    }

    const url = this.config.variables.visualizer_url as string;
    this.logger.debug(`initVisualizer() url=${url}`);
    const message: MessageRequest = {
      messageId: "",
      channelId: channelId,
      message: url,
      messageType: "visualization",
      senderId: this.config.id!,
      timestamp: Date.now(),
      taskExecutionId: sessionId,
      workerId: this.config.id!,
      ignoreResponse: true,
    };
    await channelBroker.message(message);

    channelBroker.subscribeToSession(
      channelId,
      sessionId,
      workerId!,      
      ["action_caption"],
      (message: MessageRequest) => {
        this.handle_action_caption(message).catch((err: Error) => {
          this.logger.error(`initSession() error=${err.message}`);
        });
      }
    );
  }

  private async handle_action_caption(event: MessageRequest): Promise<void> {
    if (!this.config.variables?.action_caption_webhook_url) {
      throw new Error("No action_caption_webhook_base_url provided.");
    }
    
    await fetch(
      `${this.config.variables.action_caption_webhook_url as string}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caption: event.message,
          sessionId: event.taskExecutionId,
        }),
      }
    )
    .catch((err: Error) => {
      this.logger.error(`handle_action_caption() error=${err.message}`);
      return undefined;
    });
  }

  static variablesSchema(): VariablesSchema {
    return WebServiceToolMetadata.variablesSchema();
  }

  public getTaskOutput(): Promise<string | undefined> {
    return Promise.resolve(undefined);
  }

  public destroy(): Promise<void> {
    // Nothing to do.
    return Promise.resolve();
  }

  public workCompleteCallback(): Promise<void> {
    // Nothing to do.
    return Promise.resolve();
  }

  public validateObject(): Promise<boolean> {
    // Nothing to do, we rely on the web service to validate the request.
    return Promise.resolve(true);
  }
}
