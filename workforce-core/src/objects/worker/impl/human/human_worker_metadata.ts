import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { WorkerConfig } from "../../model.js";

export class HumanWorkerMetadata {
    public static defaultConfig(orgId: string): WorkerConfig {
        const config: WorkerConfig = {
            id: crypto.randomUUID(),
            orgId: orgId,
            name: "Human Worker",
            description: "Human Worker",
            type: "worker",
            subtype: "human-worker",
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
        const subtype = "human-worker";
        schema.set("user_id", {
            type: "string",
            description: "The user id of the worker",
            required: true,
        });

        return new VariablesSchema(schema, type, subtype);
    }
}