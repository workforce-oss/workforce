import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { ResourceConfig } from "../../model.js";

export class GithubResourceMetadata {
    static defaultConfig(orgId: string): ResourceConfig {
        return {
            id: crypto.randomUUID(),
            orgId: orgId,
            name: "Github Resource",
            description: "A Github resource.",
            type: "resource",
            subtype: "github-repo-resource",
            variables: {
                branch: "main",
                path_template: "{{filename}}",
            }
        }
    }

    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "resource";
        const subtype = "github-repo-resource";
        schema.set("repo", {
            type: "string",
            required: true,
            description: "The name(slug) of the Github repository to use."
        });
        schema.set("owner", {
            type: "string",
            required: true,
            description: "The name(slug) of owner of the Github repository."
        });
        schema.set("branch", {
            type: "string",
            description: "The branch name.",
            default: "main",
        });
        schema.set("path_template", {
            type: "string",
            description: "The path template to use to generate the path to the file. This can also just be the name of a particular or directory. Defaults to {{filename}}.",
            default: "{{filename}}",
        })
        schema.set("org_name", {
            type: "string",
            description: "The name of the Github organization to use for webhooks.",
            required: true,
        })
        schema.set("webhooks_enabled", {
            type: "boolean",
            description: "Whether to enable webhooks for this resource.",
            default: false,
            advanced: true,
        });
        schema.set("access_token", {
            type: "string",
            description: "The token to use for authentication.",
            sensitive: true,
        });
        return new VariablesSchema(schema, type, subtype);
    }
}