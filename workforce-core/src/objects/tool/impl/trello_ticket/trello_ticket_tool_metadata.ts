import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { ToolConfig } from "../../model.js";

export class TrelloTicketToolMetadata {
    public static defaultConfig(orgId: string): ToolConfig {
        return {
            id: crypto.randomUUID(),
            name: "Trello Ticket Tool",
            description: "A tool that creates a Trello ticket.",
            type: "tool",
            subtype: "trello-ticket-tool",
            orgId: orgId,
            variables: {
                purpose: "Create a Trello ticket.",
                board_name: "",
                column_name: "",
                label: "",
            },
        };
    }

    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "tool";
        const subtype = "trello-ticket-tool";
        schema.set("purpose", {
            type: "string",
            required: true,
            description: "The purpose of the tool.",
            multiline: true
        });
        schema.set("api_key", {
            type: "string",
            required: true,
            description: "The Trello API key.",
            sensitive: true
        });
        schema.set("api_token", {
            type: "string",
            required: true,
            description: "The Trello API token.",
            sensitive: true
        });
        schema.set("app_secret", {
            type: "string",
            required: true,
            description: "The Trello app secret.",
            sensitive: true
        });
        schema.set("board_name", {
            type: "string",
            required: true,
            description: "The name of the Trello Board."
        });
        schema.set("column_name", {
            type: "string",
            required: true,
            description: "The name of the column to create the ticket in."
        });
        schema.set("label", {
            type: "string",
            required: true,
            description: "The name of the label to apply to the ticket."
        });

        return new VariablesSchema(schema, type, subtype);
    }
}