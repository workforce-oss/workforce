import { VariablesSchema } from "../../base/variables_schema.js";
import { ApiResourceMetadata } from "../impl/api/api_metadata.js";
import { GithubResourceMetadata } from "../impl/github/github_resource_metadata.js";
import { GithubPullRequestResourceMetadata } from "../impl/github_pull_request/github_pull_request_metadata.js";
import { MockResourceMetadata } from "../impl/mock/mock_resource_metadata.js";
import { RawTextResourceMetadata } from "../impl/raw_text/raw_test_resource_metadata.js";
import { ResourceConfig, ResourceType } from "../model.js";

export class ResourceConfigFactory {
    static variablesSchemaFor(config: ResourceConfig): VariablesSchema {
        switch (config.type) {
            case "mock-resource":
                return MockResourceMetadata.variablesSchema();
            case "api-resource":
                return ApiResourceMetadata.variablesSchema();
            case "github-repo-resource":
                return GithubResourceMetadata.variablesSchema();
            case "raw-text-resource":
                return RawTextResourceMetadata.variablesSchema();
            case "github-pull-request-resource":
                return GithubPullRequestResourceMetadata.variablesSchema();
            default:
                throw new Error(`ResourceFactory.variablesSchemaFor() unknown resource type ${config.type as string}`);
        }
    }

    static defaultConfigFor(orgId: string, subtype: ResourceType): ResourceConfig {
        switch (subtype) {
            case "mock-resource":
                return MockResourceMetadata.defaultConfig(orgId);
            case "api-resource":
                return ApiResourceMetadata.defaultConfig(orgId);
            case "github-repo-resource":
                return GithubResourceMetadata.defaultConfig(orgId);
            case "raw-text-resource":
                return RawTextResourceMetadata.defaultConfig(orgId);
            case "github-pull-request-resource":
                return GithubPullRequestResourceMetadata.defaultConfig(orgId);
            default:
                throw new Error(`ResourceFactory.defaultConfigFor() unknown resource type ${subtype as string}`);
        }
    }
}