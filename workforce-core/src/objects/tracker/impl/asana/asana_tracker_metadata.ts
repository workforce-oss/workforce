import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { TrackerConfig } from "../../model.js";

export class AsanaTrackerMetadata {
   public static defaultConfig(orgId: string): TrackerConfig {
       return {
           id: crypto.randomUUID(),
           name: "Asana Tracker",
           description: "Asana Tracker",
           type: "asana-tracker",
           orgId: orgId,
           variables: {
               client_id: "",
               client_secret: "",
               workspace: "",
               project_id: "",
               todo_section: "",
               in_progress_section: "",
               complete_section: "",
           },
       };
   }

   static variablesSchema(): VariablesSchema {
    const schema = new Map<string, VariableSchemaElement>();
    schema.set("client_id", {
        type: "string",
        required: true,
        sensitive: true,
        description: "The Asana client id"
    });
    schema.set("client_secret", {
        type: "string",
        required: true,
        sensitive: true,
        description: "The Asana client secret"
    });
    schema.set("workspace", {
        type: "string",
        required: true,
        description: "The Asana workspace"
    });
    schema.set("project_id", {
        type: "string",
        required: true,
        description: "The Asana project id"
    });
    schema.set("todo_section", {
        type: "string",
        required: true,
        description: "The Asana section for todo tickets"
    });
    schema.set("in_progress_section", {
        type: "string",
        required: true,
        description: "The Asana section for in progress tickets"
    });
    schema.set("complete_section", {
        type: "string",
        required: true,
        description: "The Asana section for completed tickets"
    });

    return new VariablesSchema(schema, "tracker", "asana-tracker");
}

}