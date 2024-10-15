import { VariablesSchema, mockVariablesSchema } from "../../../base/variables_schema.js";
import { WorkerConfig } from "../../model.js";

export class MockWorkerMetadata {
    public static defaultConfig(orgId: string): WorkerConfig {
        return {
            id: crypto.randomUUID(),
            orgId: orgId,
            name: "Mock Worker",
            description: "A worker that mocks a chat session",
            type: "worker",
            subtype: "mock",
        }
    }

    static variablesSchema(): VariablesSchema {
        return mockVariablesSchema("worker");
    }
}