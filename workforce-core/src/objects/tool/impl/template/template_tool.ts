import _ from "lodash";
import { Logger } from "../../../../logging/logger.js";
import { snakeify } from "../../../../util/snake.js";
import { VariablesSchema } from "../../../base/variables_schema.js";
import { ChannelBroker } from "../../../channel/broker.js";
import { MessageRequest } from "../../../channel/model.js";
import { Tool } from "../../base.js";
import { ToolConfig, ToolRequest, ToolResponse } from "../../model.js";
import { TemplateToolMetadata } from "./template_tool_metadata.js";
import Handlebars from "handlebars";
import { FunctionDocument, FunctionDocuments } from "../../../../util/openapi.js";

export class TemplateTool extends Tool<ToolConfig> {
  logger: Logger = Logger.getInstance("TemplateTool");
  private template: string | undefined = undefined;
  private taskData = new Map<string, Record<string, unknown>>();
  private _schema: FunctionDocument | undefined = undefined;

  public static defaultConfig(orgId: string): ToolConfig {
    return TemplateToolMetadata.defaultConfig(orgId);
  }

  public async execute(
    request: ToolRequest,
  ): Promise<ToolResponse> {

    const template = await this.getTemplate();
    if (!template) {
      return {
        toolId: this.config.id!,
        requestId: request.requestId,
        timestamp: Date.now(),
        taskExecutionId: request.taskExecutionId,
        success: false,
        machine_message: "No template found.",
      };
    }
    const compiledTemplate = Handlebars.compile(template);

    if (!this.taskData.has(request.taskExecutionId)) {
      this.taskData.set(request.taskExecutionId, {});
    }

    const merged = _.merge(this.taskData.get(request.taskExecutionId), request.toolCall.arguments);
    this.taskData.set(request.taskExecutionId, merged);

    const result = compiledTemplate(merged);

    return {
      toolId: this.config.id!,
      requestId: request.requestId,
      success: true,
      timestamp: Date.now(),
      taskExecutionId: request.taskExecutionId,
      machine_state: merged,
      machine_message: "Template was rendered successfully.",
      human_state: {
        embed: result,
        type: "iframe",
      }
    };
  }

  public getTaskOutput(taskExecutionId?: string): Promise<string | undefined> {
    if (!taskExecutionId) {
      return Promise.resolve(undefined);
    }
    const data = this.taskData.get(taskExecutionId);
    if (!data) {
      return Promise.resolve(undefined);
    }
    return Promise.resolve(JSON.stringify(data));
  }

  public async initSession(
    sessionId?: string,
    workerId?: string,
    channelId?: string,
    channelBroker?: ChannelBroker): Promise<void> {
    if (!sessionId) {
      return;
    }
    const template = await this.getTemplate();
    if (!template) {
      return;
    }
    const compiledTemplate = Handlebars.compile(template);
    const result = compiledTemplate({});
    const channel = channelBroker?.getObject(channelId ?? "");
    this.logger.debug(`initVisualizer() message=${result} channel=${channelId} sessionId=${sessionId}`);
    if (channel && sessionId) {
      const message: MessageRequest = {
        messageId: "",
        channelId: channelId!,
        message: result,
        messageType: "visualization",
        timestamp: Date.now(),
        senderId: this.config.id!,
        taskExecutionId: sessionId,
        workerId: workerId!,
        ignoreResponse: true,
      };
      await channel.message(message);
    } else {
      this.logger.error(`initVisualizer() channel=${channelId} sessionId=${sessionId} not found`);
    }
  }

  private async getTemplate(): Promise<string> {
    const templateLocation = this.config.variables?.template_location as string;
    if (!templateLocation) {
      throw new Error("No template location provided.");
    }
    if (this.template) {
      return this.template;
    }
    this.logger.debug(`getTemplate() template_location=${templateLocation}`);
    const response = await fetch(templateLocation).catch(
      (err: Error) => {
        this.logger.error(`getTemplate() error=${err.message}`);
        return undefined;
      }
    );
    if (!response) {
      return "";
    }
    const template = await response.text().catch((err: Error) => {
      this.logger.error(`getTemplate() error=${err.message}`);
      return undefined;
    });
    if (!template) {
      return "";
    }
    this.template = template;
    return template;
  }

  public async schema(): Promise<FunctionDocuments> {
    if (this._schema) {
      return {
        functions: [
          this._schema
        ]
      };
    }
    if (!this.config.variables?.template_schema_location) {
      throw new Error("No template schema location provided.");
    }
    const response = await fetch(
      this.config.variables.template_schema_location as string
    ).catch((err: Error) => {
      this.logger.error(`schema() error=${err.message}`);
      return undefined;
    });
    if (!response) {
      return {
        functions: []
      };
    }
    const schema = await response.json().catch((err: Error) => {
      this.logger.error(`schema() error=${err.message}`);
      return undefined;
    }) as FunctionDocument;
    if (!schema?.name) {
      return {
        functions: []
      };
    }
    schema.name = `template_${snakeify(schema.name)}`;
    this._schema = schema;
    return {
      functions: [
        schema
      ]
    };
  }

  static variableSchema(): VariablesSchema {
    return TemplateToolMetadata.variablesSchema();
  }

  public destroy(): Promise<void> {
    // Nothing to do.
    return Promise.resolve();
  }

  public workCompleteCallback(): Promise<void> {
    // Nothing to do.
    return Promise.resolve();
  }
  public async validateObject(): Promise<boolean> {
    // Nothing to do.
    return Promise.resolve(true);
  }
}
