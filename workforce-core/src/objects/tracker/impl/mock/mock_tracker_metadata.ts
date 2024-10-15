import { VariablesSchema, mockVariablesSchema } from "../../../base/variables_schema.js";
import { TrackerConfig } from "../../model.js";

export class MockTrackerMetadata {
    public static defaultConfig(orgId: string): TrackerConfig {
        return {
            id: crypto.randomUUID(),
            name: "Mock Tracker",
            description: "Mock Tracker",
            type: "tracker",
            subtype: "mock",
            orgId: orgId,
        };
    }

    static variablesSchema(): VariablesSchema {
        return mockVariablesSchema("tracker");
    }
}