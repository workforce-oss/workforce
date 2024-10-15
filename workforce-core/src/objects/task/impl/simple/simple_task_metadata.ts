import { VariablesSchema} from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { TaskConfig } from "../../model.js";

export class SimpleTaskMetadata {
    public static defaultConfig(orgId: string): TaskConfig {
        return {
            id: crypto.randomUUID(),
            orgId: orgId,
            name: "Simple Task",
            description: "A simple task.",
            type: "task",
            subtype: "simple-task",
            costLimit: 2.00,
            variables: {
                purpose: "A simple task.",
                prompt_template: "",
                system_message_template: "",
            }
        }
    }

    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "task";
        const subtype = "simple-task";
        schema.set("purpose", {
            type: "string",
            description: "The purpose of the task",
            multiline: true,
            required: false,
        });
        schema.set("prompt_template", {
            type: "string",
            description: "The template for the prompt",
            multiline: true,
            required: true,
        });
        schema.set("system_message_template", {
            type: "string",
            description: "Template for a guidance message to steer the model.",
            multiline: true,
        });

        return new VariablesSchema(schema, type, subtype);
    }
}