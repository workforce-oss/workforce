import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { ResourceConfig } from "../../model.js";

export class GithubPullRequestResourceMetadata {
    static defaultConfig(orgId: string): ResourceConfig {
        return {
            id: crypto.randomUUID(),
            orgId: orgId,
            name: "Github Pull Request Resource",
            description: "A Github Pull Request resource.",
            type: "github-pull-request-resource",
            variables: {

            }
        }
    }

    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "resource";
        const subtype = "github-pull-request-resource";
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
        schema.set("username", {
            type: "string",
            description: "The username of the authenticated user.",
            sensitive: true,
        });
        schema.set("access_token", {
            type: "string",
            description: "The token to use for authentication.",
            sensitive: true,
        });
        return new VariablesSchema(schema, type, subtype);
    }
}