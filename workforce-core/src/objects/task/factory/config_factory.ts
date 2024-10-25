import { VariablesSchema } from "../../base/variables_schema.js";
import { SimpleTaskMetadata } from "../impl/simple/simple_task_metadata.js";
import { StructuredTaskMetadata } from "../impl/structured/structured_task_metadata.js";
import { TaskConfig, TaskType } from "../model.js";

export class TaskConfigFactory {
	static variablesSchemaFor(config: TaskConfig): VariablesSchema {
		switch (config.type) {
			case "simple-task":
				return SimpleTaskMetadata.variablesSchema();
			case "structured-task":
				return StructuredTaskMetadata.variablesSchema();
			case "mock-task":
				return SimpleTaskMetadata.variablesSchema();
			default:
				throw new Error(`TaskFactory.variablesSchemaFor() unknown task type ${config.type as string}`);
		}
	}

	static defaultConfigFor(orgId: string, subtype: TaskType): TaskConfig {
		switch (subtype) {
			case "simple-task":
				return SimpleTaskMetadata.defaultConfig(orgId);
			case "structured-task":
				return StructuredTaskMetadata.defaultConfig(orgId);
			case "mock-task":
				return SimpleTaskMetadata.defaultConfig(orgId);
			default:
				throw new Error(`TaskFactory.defaultConfigFor() unknown task type ${subtype as string}`);
		}
	}
}
