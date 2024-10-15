import { EmitterWebhookEvent } from "@octokit/webhooks";
import { Logger } from "../../../../logging/logger.js";
import { WebhookEvent } from "../../../../manager/webhook_route_manager.js";
import { GithubService } from "../../../../services/github/service.js";
import { snakeify } from "../../../../util/snake.js";
import { Resource } from "../../base.js";
import { ResourceConfig, ResourceObject, ResourceVersion, WriteRequest } from "../../model.js";
import { FunctionParameters } from "../../../../util/openapi.js";

export class GithubPullRequestResource extends Resource {
    logger = Logger.getInstance("GithubPullRequestResource");

    private githubService: GithubService;
    constructor(config: ResourceConfig, onFailure: (objectId: string, error: string) => void) {
        super(config, onFailure);
        this.githubService = new GithubService(config.variables?.access_token as string | undefined);
        if (config.variables?.webhooks_enabled) {
            this.listenForPullRequestEvents().then(() => {
                this.logger.debug("listenForPullRequestEvents() listening for pull request events");
            }).catch((err) => {
                this.logger.error("listenForPullRequestEvents() error listening for pull request events", err);
                onFailure(config.id!, "error listening for pull request events");
            });
        }
    }

    async webhookHandler(event: WebhookEvent): Promise<void> {
        await this.githubService.webhookHandler(event);
    }

    private async listenForPullRequestEvents(): Promise<void> {
        await this.githubService.addWebhook(this.config.orgId, this.config.id!, {
            eventTypes: ["pull_request", "issue_comment", "pull_request_review_comment", "pull_request_review", "pull_request_review_thread"],
            owner: this.config.variables?.owner as string | undefined,
            repo: this.config.variables?.repo as string | undefined,
            githubRepoName: this.config.variables?.repo as string | undefined,
        }, (event: EmitterWebhookEvent<"pull_request"> | EmitterWebhookEvent<"issue_comment"> | EmitterWebhookEvent<"pull_request_review_comment">) => {
            this.logger.debug(`listenForPullRequestEvents() event=${JSON.stringify(event, null, 2)}`);
            if (event.payload.action !== "opened" && event.payload.action !== "reopened" && event.payload.action !== "created") {
                return;
            }

            if (event.name === "pull_request") {
                const pullRequest = event.payload.pull_request;
                const pullRequestId = pullRequest.number;
                if (pullRequest.user.login === this.config.variables?.username) {
                    return;
                }
                this.versions.next({
                    eventId: event.id,
                    objectNames: [pullRequestId.toString()],
                    metadata: {
                        timestamp: Date.now(),
                        pullRequestId: pullRequestId,
                    },
                    resourceId: this.config.id!,
                    timestamp: Date.now(),
                    versionId: event.id,
                });
            } else if (event.name === "issue_comment") {
                if (event.payload.comment.user?.login === this.config.variables?.username) {
                    return;
                }
                const issueId = event.payload.issue.number;
                this.versions.next({
                    eventId: event.id,
                    objectNames: [issueId.toString()],
                    metadata: {
                        timestamp: Date.now(),
                        pullRequestId: issueId,
                    },
                    resourceId: this.config.id!,
                    timestamp: Date.now(),
                    versionId: event.id,
                });
            } else if (event.name === "pull_request_review_comment") {
                if (event.payload.comment.user?.login === this.config.variables?.username) {
                    return;
                }
                const pullRequestId = event.payload.pull_request.number;
                this.versions.next({
                    eventId: event.id,
                    objectNames: [pullRequestId.toString()],
                    metadata: {
                        timestamp: Date.now(),
                        pullRequestId: pullRequestId,
                    },
                    resourceId: this.config.id!,
                    timestamp: Date.now(),
                    versionId: event.id,
                });
            }

        });
    }

    async refresh(): Promise<void> {
        // nothing to do
    }

    async write(writeRequest: WriteRequest): Promise<void> {
        this.logger.debug(`write() writeRequest=${JSON.stringify(writeRequest, null, 2)}`);
        const repo = this.config.variables?.repo as string | undefined;
        const owner = this.config.variables?.owner as string | undefined;

        if (!repo) {
            this.logger.error("write() repo not defined");
            throw new Error("repo not defined");
        }

        if (!owner) {
            this.logger.error("write() owner not defined");
            throw new Error("owner not defined");
        }

        const data = writeRequest.data as Record<string, unknown>;

        const title = data.title as string;
        const content = data.content as string;
        const sourceBranch = data.sourceBranch as string;
        const targetBranch = data.targetBranch as string;
        const pullRequestId = data.pullRequestId ? +data.pullRequestId : undefined;

        if (pullRequestId) {
            await this.githubService.commentOnPullRequest({ owner, repo, pullRequestId, body: content });
        } else {
            await this.githubService.createPullRequest({ owner, repo, sourceBranch, targetBranch, title, body: content });
        }
    }

    public schema(): Promise<Record<string, FunctionParameters>> {
        const objectKey = snakeify(this.config.name);
        const pluralObjectKey = `${objectKey}s`;

        const schema: Record<string, FunctionParameters> = {
            [pluralObjectKey]: {
                type: "array",
                items: {
                    type: "object",
                    description: `Purpose: Create or comment on a github pull request. If you received a pull request Id, use this to comment on the pull request. If you did not receive a pull request Id, create a new pull request.`,
                    properties: {
                        sourceBranch: {
                            type: "string",
                            description: `The source branch of the pull request. (optional). Required if pullRequestId is not provided.`,
                        },
                        targetBranch: {
                            type: "string",
                            description: `The target branch of the pull request. (optional). Required if pullRequestId is not provided.`,
                        },
                        title: {
                            type: "string",
                            description: `The title of the pull request (optional). Required if pullRequestId is not provided.`,
                        },
                        content: {
                            type: "string",
                            description: `The content of the pull request. This is the body of the pull request when creating, and the body of the comment when updating.`,
                        },
                        pullRequestId: {
                            type: "string",
                            description: `The pull request id if known (optional).`,
                        },
                    },
                    required: ["content"],
                },
            },
        };

        return Promise.resolve(schema);
    }

    async latestVersion(): Promise<ResourceVersion> {
        try {
            const latest = await super.latestVersion();
            if (latest?.objectNames && latest.objectNames.length > 0) {
                return latest;
            }
        } catch (err) {
            this.logger.error("latestVersion() error", err);
        }
        return {
        } as ResourceVersion;
    }

    async fetchObject(resourceVersion: ResourceVersion): Promise<ResourceObject> {
        // get the pull request, title, body, concatenate comments
        const repo = this.config.variables?.repo as string | undefined;
        if (!repo) {
            this.logger.error("fetchObject() repo not defined");
            throw new Error("repo not defined");
        }
        const owner = this.config.variables?.owner as string | undefined;
        if (!owner) {
            this.logger.error("fetchObject() owner not defined");
            throw new Error("owner not defined");
        }

        const pullRequestId = resourceVersion.metadata.pullRequestId as number | undefined;
        if (!pullRequestId) {
            this.logger.error("fetchObject() pullRequestId not defined");
            throw new Error("pullRequestId not defined");
        }

        const username = this.config.variables?.username as string | undefined;
        if (!username) {
            this.logger.error("fetchObject() username not defined");
            throw new Error("username not defined");
        }

        const pullRequest = await this.githubService.getPullRequest({ owner, repo, pullRequestId });
        if (!pullRequest) {
            this.logger.error(`fetchObject() error fetching pull request ${pullRequestId} from ${owner}/${repo}`);
            throw new Error(`error fetching pull request ${pullRequestId} from ${owner}/${repo}`);
        }

        const comments = await this.githubService.getCommentsForPullRequest({ owner, repo, pullRequestId });

        const files = await this.githubService.getFileContentForPullRequest({ owner, repo, pullRequestId, ref: pullRequest.sourceBranch });

        let content = `You are ${username}.\n\n`;
        content += `Pull Request Id: ${pullRequestId}\n`;
        content += `Pull Request Creator: ${pullRequest.loginId}\n`;
        content += `Pull Request Source Branch: ${pullRequest.sourceBranch}\n`;
        content += `Pull Request Target Branch: ${pullRequest.targetBranch}\n`;
        content += `Pull Request Title: ${pullRequest.title}\n`;
        content += `Pull Request Body:\n\n${pullRequest.body}\n\n`;

        if (files.size > 0) {
            content += "Files:\n\n";
            for (const [filename, fileContent] of files.entries()) {
                //ignore index.json
                if (filename === "index.json") {
                    continue;
                }
                content += `${filename}:\n${fileContent}\n\n`;
            }
        }

        if (comments.length === 0) {
            return {
                name: pullRequestId.toString(),
                content: content,
                metadata: resourceVersion.metadata,
            }
        }
        content += "Comments:\n\n";
        comments.forEach((comment) => {
            content += `${comment}\n`;
        });

        return {
            name: pullRequestId.toString(),
            content: content,
            metadata: resourceVersion.metadata,
        }

    }

    public async destroy(): Promise<void> {
        await this.githubService.destroy(this.config.orgId, this.config.id!);
    }
}