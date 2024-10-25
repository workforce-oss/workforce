import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { TrackerConfig } from "../../model.js";

export class TrelloTrackerMetadata {
    public static defaultConfig(orgId: string): TrackerConfig {
        return {
            id: crypto.randomUUID(),
            name: "Trello Tracker",
            description: "Trello Tracker",
            type: "trello-tracker",
            orgId: orgId,
            variables: {
                api_key: "",
                api_token: "",
                app_secret: "",
                board_name: "",
                board_id: "",
                to_do_column: "",
                in_progress_column: "",
                done_column: "",
                label: "",
            },
        };
    }

    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "tracker";
        const subtype = "trello-tracker";

        schema.set("board_name", {
            type: "string",
            description: "The name of the Trello Board",
            required: true
        });
        schema.set("to_do_column", {
            description: 'The name of the column where tickets should be pulled from or placed in.',
            type: "string",
            default: "To Do",
            required: true
        });
        schema.set("in_progress_column", {
            description: 'The name of the column for tickets that are currently being worked.',
            type: "string",
            default: "Doing",
            required: true
        });
        schema.set("done_column", {
            description: "The column where tickets are put when they are done.",
            type: "string",
            default: "Done",
            required: true
        });
        schema.set("label", {
            description: "The name of the label to watch.",
            type: "string",
            required: true
        });
        schema.set("api_key", {
            description: "The Trello API key",
            type: "string",
            sensitive: true,
            required: true
        });
        schema.set("api_token", {
            description: "The Trello API token",
            type: "string",
            required: true,
            sensitive: true
        });
        schema.set("app_secret", {
            description: "The secret used to verify the webhook",
            type: "string",
            required: true,
            sensitive: true
        })
        return new VariablesSchema(schema, type, subtype);

    }
}