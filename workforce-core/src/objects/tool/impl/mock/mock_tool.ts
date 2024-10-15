import { Logger } from "../../../../logging/logger.js";
import { FunctionDocuments } from "../../../../util/openapi.js";
import { VariablesSchema } from "../../../base/variables_schema.js";
import { Tool } from "../../base.js";
import { ToolConfig, ToolRequest, ToolResponse } from "../../model.js";
import { MockToolMetadata } from "./mock_tool_metadata.js";

export class MockTool extends Tool<ToolConfig> {
    workCompleteCallback(): Promise<void> {
        return Promise.resolve();
    }
    logger: Logger = Logger.getInstance("MockTool");

    public static defaultConfig(orgId: string): ToolConfig {
        return MockToolMetadata.defaultConfig(orgId);
    }

    public execute(toolRequest: ToolRequest): Promise<ToolResponse> {
        const response: ToolResponse = {
            toolId: this.config.id!,
            requestId: toolRequest.requestId,
            success: true,
            machine_state: {state: "test-machine-state"},
            machine_message: "Mock tool executed successfully.",
            taskExecutionId: toolRequest.taskExecutionId,
            timestamp: Date.now(),
            human_state: {
                name: "mock-tool",
                type: "iframe",
                embed: "mock-embed",
            },
        };
        return Promise.resolve(response);
    }

    public destroy(): Promise<void> {
        return Promise.resolve();
    }

    static variablesSchema(): VariablesSchema {
        return MockToolMetadata.variablesSchema();
    }

    public getTaskOutput(): Promise<string | undefined> {
        return Promise.resolve("mock-task-output");
    }

    public initSession(): Promise<void> {
        return Promise.resolve();
    }

    public schema(): Promise<FunctionDocuments> {
        return Promise.resolve({
            functions: [
                {
                    name: "mock-function",
                    arguments: [
                        {
                            name: "mock-argument",
                            type: "string",
                            required: true,
                        }
                    ]
                }
            ]
        });
    }
    public validateObject(): Promise<boolean> {
        return Promise.resolve(true);
    }

}