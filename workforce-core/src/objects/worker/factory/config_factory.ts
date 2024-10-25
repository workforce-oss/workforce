import { VariablesSchema } from "../../base/variables_schema.js";
import { AIWorkerMetadata } from "../impl/ai/ai_worker_metadata.js";
import { HumanWorkerMetadata } from "../impl/human/human_worker_metadata.js";
import { MockWorkerMetadata } from "../impl/mock/mock_worker_metadata.js";
import { WorkerConfig, WorkerType } from "../model.js";

export class WorkerConfigFactory {
	static variablesSchemaFor(config: WorkerConfig): VariablesSchema {
		switch (config.type) {
			case "mock-worker":
				return MockWorkerMetadata.variablesSchema();
			case "ai-worker":
				return AIWorkerMetadata.variablesSchema();
			case "human-worker":
				return HumanWorkerMetadata.variablesSchema();
			default:
				throw new Error(`WorkerFactory.variablesSchemaFor() unknown worker type ${config.type as string}`);
		}
	}

	static defaultConfigFor(orgId: string, subtype: WorkerType): WorkerConfig {
		switch (subtype) {
			case "mock-worker":
				return MockWorkerMetadata.defaultConfig(orgId);
			case "ai-worker":
				return AIWorkerMetadata.defaultConfig(orgId);
			case "human-worker":
				return HumanWorkerMetadata.defaultConfig(orgId);
			default:
				throw new Error(`WorkerFactory.defaultConfigFor() unknown worker type ${subtype as string}`);
		}
	}
}
