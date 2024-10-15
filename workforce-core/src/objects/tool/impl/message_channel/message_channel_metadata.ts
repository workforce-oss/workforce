import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { ToolConfig } from "../../model.js";

export class MessageChannelToolMetadata {
    public static defaultConfig(orgId: string): ToolConfig {
        return {
            id: crypto.randomUUID(),
            name: "Message Channel Tool",
            description: "A tool that sends messages to a channel.",
            type: "tool",
            subtype: "message-channel-tool",
            orgId: orgId,
            variables: {},
        }
    }

    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "tool";
        const subtype = "message-channel-tool";
        return new VariablesSchema(schema, type, subtype);
    }
}