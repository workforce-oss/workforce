import { VariablesSchema} from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { ResourceConfig } from "../../model.js";

export class RawTextResourceMetadata {
    static defaultConfig(orgId: string): ResourceConfig {
        return {
            id: crypto.randomUUID(),
            orgId: orgId,
            name: "Raw Text Resource",
            description: "A raw text resource.",
            type: "raw-text-resource",
            variables: {
                text: "",
            }
        }
    }

    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "resource";
        const subtype = "raw-text-resource";
        schema.set("text", {
            type: "string",
            required: true,
            description: "The text to use as the resource.",
            multiline: true,
        });
        return new VariablesSchema(schema, type, subtype);
    }
}