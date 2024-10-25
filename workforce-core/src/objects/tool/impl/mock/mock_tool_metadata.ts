import { VariablesSchema, mockVariablesSchema } from "../../../base/variables_schema.js";
import { ToolConfig } from "../../model.js";

export class MockToolMetadata {
    public static defaultConfig(orgId: string): ToolConfig {
        return {
            id: crypto.randomUUID(),
            orgId: orgId,
            name: "Mock Tool",
            description: "Mock Tool",
            type: "mock-tool",
        };
    }

    static variablesSchema(): VariablesSchema {
        return mockVariablesSchema("tool");
    }

}