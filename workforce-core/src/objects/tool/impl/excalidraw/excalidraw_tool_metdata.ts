import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { ToolConfig } from "../../model.js";

export class ExcalidrawToolMetadata {
    public static defaultConfig(orgId: string): ToolConfig {
        return {
            id: crypto.randomUUID(),
            name: "Excalidraw Tool",
            description: "A tool that interacts with Excalidraw.",
            type: "tool",
            subtype: "excalidraw-tool",
            orgId: orgId,
            variables: {},
        }
    }

    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "tool";
        const subtype = "google-drive-tool";
        
        return new VariablesSchema(schema, type, subtype);
    }
}

export interface ExcalidrawMachineState extends Record<string, unknown> {
    text: string;
    image?: string;
}