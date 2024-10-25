import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { TrackerConfig } from "../../model.js";

export class GithubBoardTrackerMetadata {
    public static defaultConfig(orgId: string): TrackerConfig {
        const base: TrackerConfig = {
            id: crypto.randomUUID(),
            orgId: orgId,
            name: "Github Board Tracker",
            description: "A Github Board Tracker.",
            type: "github-board-tracker",
            variables:  {}
        };

        // use variables schema to populate default values
        const schema = GithubBoardTrackerMetadata.variablesSchema();
        schema.forEach((value, key) => {
            base.variables![key] = value.default;
        });

        return base;
    }

    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "tracker";
        const subtype = "github-board-tracker";

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
        schema.set("to_do_column", {
            description: 'The name of the column where tickets should be pulled from or placed in.',
            type: "string",
            default: "Todo",
        });
        schema.set("in_progress_column", {
            description: 'The name of the column for tickets that are currently being worked.',
            type: "string",
            default: "In Progress",
        });
        schema.set("done_column", {
            description: "The column where tickets are put when they are done.",
            type: "string",
            default: "Done",
        });
        schema.set("access_token", {
            description: "The Github access token",
            type: "string",
            sensitive: true,
            required: true
        });

        return new VariablesSchema(schema, type, subtype);
    }
}