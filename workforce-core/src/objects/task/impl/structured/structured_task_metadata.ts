import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { TaskConfig } from "../../model.js";

export class StructuredTaskMetadata {
    public static defaultConfig(orgId: string): TaskConfig {
        return {
            id: crypto.randomUUID(),
            orgId: orgId,
            name: "Structured Task",
            description: "A task with a pre-defined structure.",
            type: "task",
            subtype: "structured-task",
            variables: {}
        }
    }

    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "task";
        const subtype = "structured-task";
        schema.set("acceptance_critera", {
            type: "string",
            description: "The acceptance criteria for the task.",
            multiline: true,
            required: true,
        });
        schema.set("instructions", {
            type: "string",
            description: "Instructions explaining to the worker how to complete the task.",
            multiline: true,
            required: true,
        });
        schema.set("context", {
            type: "string",
            description: "Context that the worker should be aware of when completing the task.",
            multiline: true,
            required: true,
        });
        schema.set("definition_of_done", {
            type: "string",
            description: "A set of conditions that must be met for the task to be considered done.",
            multiline: true,
        });

        return new VariablesSchema(schema, type, subtype);
    }
}