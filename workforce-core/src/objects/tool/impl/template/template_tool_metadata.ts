import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { ToolConfig } from "../../model.js";

export class TemplateToolMetadata {
    public static defaultConfig(orgId: string): ToolConfig {
        return {
            id: crypto.randomUUID(),
            name: "Template Tool",
            description: "A tool that renders a template.",
            type: "template-tool",
            orgId: orgId,
            variables: {
                template_location: "",
                template_schema_location: "",
            },
        };
    }

    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "tool";
        const subtype = "template-tool";
        schema.set("template_location", {
            type: "string",
            required: true,
            description: "The location of the template."
        });
        schema.set("template_schema_location", {
            type: "string",
            required: true,
            description: "The location of the template schema."
        });
        return new VariablesSchema(schema, type, subtype);
    }
}