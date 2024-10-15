import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { WorkerConfig } from "../../model.js";
import { anthropicModels, groqModels, openAIModels } from "./ai_models.js";

export class AIWorkerMetadata {
	
	public static defaultConfig(orgId: string): WorkerConfig {
		const config: WorkerConfig = {
			id: crypto.randomUUID(),
			orgId: orgId,
			name: "AI Worker",
			description: "AI Worker",
			type: "worker",
			subtype: "ai-worker",
			variables: {},
		};
		for (const [key, value] of this.variablesSchema()) {
			config.variables![key] = value.default;
		}
		return config;
	}

	static variablesSchema(): VariablesSchema {
		const schema = new Map<string, VariableSchemaElement>();
		const type = "worker";
		const subtype = "ai-worker";
		schema.set("model", {
			type: "string",
			description: "The name of the model to use for inference",
			required: true,
			default: "gpt-3.5-turbo",
			options: [
				...openAIModels,
				...anthropicModels,
				...groqModels
			],
		});
		// schema.set("explain_functions", {
		// 	type: "boolean",
		// 	description: "Whether or not the model should explain when it calls functions",
		// 	required: false,
		// 	default: false,
		// });
		// schema.set("critic_enabled", {
		// 	type: "boolean",
		// 	description: "Whether or not to use the critic",
		// 	required: false,
		// 	default: false,
		// });
		schema.set("api_token", {
			type: "string",
			description: "The API token",
			required: true,
			sensitive: true,
		});
		schema.set("temperature", {
			type: "number",
			description:
				"The temperature parameter of the model, lower values are more deterministic, higher are more random.",
			default: 0,
			min: 0,
			max: 1,
		});
		schema.set("max_tokens", {
			type: "number",
			description: "The maximum number of tokens to generate",
			default: 2048,
			min: 1,
			max: 128000,
		});
		schema.set("top_p", {
			type: "number",
			description:
				"The top P value to use.  Higher values are more deterministic, lower values are more chaotic.",
			default: 1,
			min: 0,
			max: 1,
		});

		return new VariablesSchema(schema, type, subtype);
	}
}
