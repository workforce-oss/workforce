import { VariablesSchema } from "../../../base/variables_schema.js";
import { VariableSchemaElement } from "../../../base/variables_schema_model.js";
import { ToolConfig } from "../../model.js";

export class CodingToolMetadata {
    public static defaultConfig(orgId: string): ToolConfig {
        return {
            id: crypto.randomUUID(),
            name: "Coding Tool",
            description: "A tool that runs a coding task.",
            type: "coding-tool",
            orgId: orgId,
            variables: {
                read_only: false,
                index_repo_branch: "main",
                mode: "local",
            },
        }
    }

    static variablesSchema(): VariablesSchema {
        const schema = new Map<string, VariableSchemaElement>();
        const type = "tool";
        const subtype = "coding-tool";
        schema.set("index_repo_location", {
            type: "string",
            description: "A URL to a mono repository without the scheme. Example github.com/my/repo.",
            required: true,
        });
        schema.set("index_repo_branch", {
            type: "string",
            description: "The branch of the mono repository to use.",
            default: "main",
        });
        schema.set("mode", {
            type: "string",
            description: "The mode to run the tool in.",
            required: true,
            options: ["local", "remote"],
            default: "local",
        });
        schema.set("server_url", {
            type: "string",
            description: "The URL of the local server to run the tool on. Required if mode is local. ",
            required: false,
            default: "http://localhost:8084/vscode-extension-server",
        });
        schema.set("read_only", {
            type: "boolean",
            description: "Whether the tool is read only.",
            default: false,
        });
        schema.set("index_repo_username", {
            type: "string",
            description: "The username to use when cloning the mono repository.",
            required: true,
            sensitive: true,
        });
        schema.set("index_repo_password", {
            type: "string",
            description: "The password to use when cloning the mono repository.",
            required: true,
            sensitive: true,
        });


        return new VariablesSchema(schema, type, subtype);
    }
}