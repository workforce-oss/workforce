import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { ToolConfig } from "../../model.js";

export class GithubBoardTicketMetadata {
    public static defaultConfig(orgId: string): ToolConfig {
        return {
            id: crypto.randomUUID(),
            orgId: orgId,
            name: "Github Board Ticket Tool",
            description: "A Github Board Ticket Tool.",
            type: "tool",
            subtype: "github-board-ticket-tool",
            variables: {
                purpose: "Create a ticket in a Github Board",
                org_name: "",
                project_name: "",
                column_name: "",

            }
        }
    }

    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "tool";
        const subtype = "github-board-ticket-tool";

        schema.set("purpose", {
            type: "string",
            description: "The purpose of the tool",
            required: true,
            multiline: true
        });
        schema.set("org_name", {
            type: "string",
            description: "The name of the Github Organization",
            required: true
        });

        schema.set("project_name", {
            type: "string",
            description: "The name of the Github Project",
            required: true
        });

        schema.set("column_name", {
            type: "string",
            description: "The name of the column where tickets should be placed",
            required: true
        });

        schema.set("access_token", {
            type: "string",
            description: "The Github access token",
            sensitive: true,
            required: true
        });

        return new VariablesSchema(schema, type, subtype);
    }
}