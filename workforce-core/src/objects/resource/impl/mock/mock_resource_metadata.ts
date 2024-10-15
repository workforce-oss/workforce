import { VariablesSchema, mockVariablesSchema } from "../../../base/variables_schema.js";
import { ResourceConfig } from "../../model.js";

export class MockResourceMetadata {
    public static defaultConfig(orgId: string): ResourceConfig {
        return {
            id: crypto.randomUUID(),
            name: "Mock Resource",
            description: "Mock Resource",
            type: "resource",
            subtype: "mock",
            orgId: orgId,
        };
    }

    static variablesSchema(): VariablesSchema {
        return mockVariablesSchema("resource");
    }
}