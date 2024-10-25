import { Resource } from "../base.js";
import { GithubResource } from "../impl/github/github_resource.js";
import { GithubPullRequestResource } from "../impl/github_pull_request/github_pull_request.js";
import { MockResource } from "../impl/mock/mock_resource.js";
import { RawTextResource } from "../impl/raw_text/raw_text_resource.js";
import { ResourceConfig } from "../model.js";

export class ResourceFactory {
    static create(config: ResourceConfig, onFailure: (objectId: string, error: string) => void): Resource {
        switch (config.type) {
            case "mock-resource":
                return new MockResource(config, onFailure);
            case "github-repo-resource":
                return new GithubResource(config, onFailure);
            case "raw-text-resource":
                return new RawTextResource(config, onFailure);
            case "github-pull-request-resource":
                return new GithubPullRequestResource(config, onFailure);
            default:
                throw new Error(`ResourceFactory.create() unknown resource type ${config.type as string}`);
        }
    }
}