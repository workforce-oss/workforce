import { VariablesSchema, mockVariablesSchema } from "../../../base/variables_schema.js";
import { ChannelConfig } from "../../model.js";

export class MockChannelMetadata {
    public static defaultConfig(orgId: string): ChannelConfig {
        return {
            id: crypto.randomUUID(),
            name: "Mock Channel",
            description: "Mock Channel",
            type: "mock-channel",
            orgId: orgId,
        };
    }
    static variablesSchema(): VariablesSchema {
        return mockVariablesSchema("channel");
    }
}