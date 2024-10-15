import { EmitterWebhookEvent } from "@octokit/webhooks";
import { randomUUID } from "crypto";
import { Logger } from "../../../../logging/logger.js";
import { WebhookEvent } from "../../../../manager/webhook_route_manager.js";
import { GithubService } from "../../../../services/github/service.js";
import { VariablesSchema } from "../../../base/variables_schema.js";
import { Resource } from "../../base.js";
import { ResourceConfig, ResourceObject, ResourceVersion, WriteRequest } from "../../model.js";
import { GithubResourceMetadata } from "./github_resource_metadata.js";

export class GithubResource extends Resource {
    logger = Logger.getInstance("GithubResource");

    private githubService: GithubService;
    constructor(config: ResourceConfig, onFailure: (objectId: string, error: string) => void) {
        super(config, onFailure);

        this.githubService = new GithubService(config.variables?.access_token as string | undefined);
        if (this.config.variables?.webhooks_enabled) {
            this.listenForPushEvents().then(() => {
                this.logger.debug("listenForPushEvents() listening for push events");
            }).catch((err) => {
                this.logger.error("listenForPushEvents() error listening for push events", err);
                onFailure(this.config.id!, "error listening for push events");
            });
        }
    }

    async webhookHandler(event: WebhookEvent): Promise<void> {
        await this.githubService.webhookHandler(event);
    }

    private async listenForPushEvents(): Promise<void> {
        await this.githubService.addWebhook(this.config.orgId, this.config.id!, {
            eventTypes: ["push"],
            githubOrgName: this.config.variables?.org_name as string | undefined,
            owner: this.config.variables?.owner as string | undefined,
            repo: this.config.variables?.repo as string | undefined,
        },
            (event: EmitterWebhookEvent<"push">) => {
                const versions = new Map<string, ResourceVersion>();
                event.payload.commits.forEach((commit) => {
                    for (const modified of commit.modified ?? []) {
                        if (this.matchPath(modified, this.config.variables?.path_template as string | undefined)) {
                            this.logger.debug(`listenForPushEvents() detected a push event for ${modified}`);
                            if (versions.has(modified)) {
                                const version = versions.get(modified)!;
                                const commitTimestamp = new Date(commit.timestamp).getTime();
                                const versionTimestamp = version.metadata.timestamp as number;
                                if (versionTimestamp > commitTimestamp) {
                                    continue;
                                }
                            }

                            const version: ResourceVersion = {
                                eventId: event.id,
                                objectNames: [modified],
                                resourceId: this.config.id!,
                                versionId: commit.id,
                                timestamp: new Date(commit.timestamp).getTime(),
                                metadata: {
                                    timestamp: commit.timestamp,
                                    url: commit.url,
                                    ref: event.payload.ref,
                                }
                            };


                            versions.set(modified, version);
                        }
                    }
                    for (const added of commit.added ?? []) {
                        if (this.matchPath(added, this.config.variables?.path_template as string | undefined)) {
                            this.logger.debug(`listenForPushEvents() detected a push event for ${added}`);
                            if (versions.has(added)) {
                                const version = versions.get(added)!;
                                if (version.metadata.timestamp as string > commit.timestamp) {
                                    continue;
                                }
                            }

                            const version: ResourceVersion = {
                                eventId: event.id,
                                objectNames: [added],
                                resourceId: this.config.id!,
                                versionId: commit.id,
                                timestamp: new Date(commit.timestamp).getTime(),
                                metadata: {
                                    timestamp: commit.timestamp,
                                    url: commit.url,
                                    ref: event.payload.ref,
                                }
                            };
                            versions.set(added, version);
                        }
                    }
                })
                for (const version of versions.values()) {
                    this.versions.next(version);
                }
            }
        )
    }

    private matchPath(path: string, pathTemplate?: string): boolean {
        if (!pathTemplate) {
            return false;
        }
        const pathRegex = new RegExp(pathTemplate.replace("{{filename}}", "[^/]+"));
        return pathRegex.test(path);
    }

    private templatePath(path: string, pathTemplate?: string): string {
        if (!pathTemplate) {
            return path;
        }
        if (!pathTemplate.includes("{{filename}}")) {
            return pathTemplate.replace("{{filename}}", path);
        }
        return pathTemplate;
    }

    async fetchObject(resourceVersion: ResourceVersion): Promise<ResourceObject> {
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

        if (resourceVersion.objectNames.length === 0) {
            this.logger.error(`fetchObject() resourceVersion.objectNames is empty`);
            throw new Error("resourceVersion.objectNames is empty");
        }

        this.logger.debug(`fetchObject() fetching object ${resourceVersion.objectNames[0]} from ${owner}/${repo}`);
        const object = await this.githubService.getFile(owner, repo, resourceVersion.objectNames[0]);
        if (!object) {
            this.logger.error(`fetchObject() error fetching object ${resourceVersion.objectNames[0]} from ${owner}/${repo}`);
            throw new Error(`error fetching object ${resourceVersion.objectNames[0]} from ${owner}/${repo}`);
        }
        return {
            name: resourceVersion.objectNames[0],
            content: object,
            metadata: resourceVersion.metadata,
        }
    }

    async refresh(): Promise<void> {
        // Nothing to do, we are listening for push events
    }

    async write(writeRequest: WriteRequest): Promise<void> {
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
        return this.githubService.commitAndPushFile(
            owner,
            repo,
            this.templatePath(writeRequest.data.name as string, this.config.variables?.path_template as string | undefined),
            writeRequest.data.content as string,
            writeRequest.message,
        ).then(() => {
            this.logger.debug(`write() wrote ${writeRequest.data.name as string} to ${owner}/${repo}`);
        }).catch((err) => {
            this.logger.error(`write() error writing ${writeRequest.data.name as string} to ${owner}/${repo}`, err);
        });
    }

    async latestVersion(): Promise<ResourceVersion> {
        try {
            const latest = await super.latestVersion();
            if (latest?.objectNames && latest.objectNames.length > 0) {
                return latest;
            }
        } catch (e) {
            this.logger.debug("latestVersion() no latest version found", e);
        }

        if (this.config.variables?.path_template) {
            const pathRegex = (this.config.variables.pathTemplate as string).replace("{{filename}}", "[^/]+");
            if (this.config.variables.pathTemplate && pathRegex) {
                await this.githubService.getFilesMatchingRegexWithContent(this.config.variables.owner as string, this.config.variables.repo as string, this.config.variables.path_template as string, (f) => {
                    this.versions.next({
                        resourceId: this.config.id!,
                        versionId: randomUUID(),
                        eventId: randomUUID(),
                        timestamp: Date.now(),
                        objectNames: [f.path],
                        metadata: {
                            timestamp: Date.now(),
                        }
                    } as ResourceVersion);
                    return Promise.resolve();
                });

                try {
                    const latest = await super.latestVersion();
                    if (latest?.objectNames && latest.objectNames.length > 0) {
                        return latest;
                    }
                } catch (e) {
                    this.logger.debug("latestVersion() no latest version found after fetching files", e);
                }

            }
        }

        const version: ResourceVersion = {
            resourceId: this.config.id!,
            versionId: randomUUID(),
            eventId: randomUUID(),
            timestamp: Date.now(),
            objectNames: [this.config.variables?.path_template as string | undefined ?? ""],
            metadata: {
                url: "",
                ref: "",
                timestamp: Date.now(),
            }
        };


        return Promise.resolve(version);


    }

    public async destroy(): Promise<void> {
        await this.githubService.destroy(this.config.orgId, this.config.id!, this.config.variables?.owner as string | undefined, this.config.variables?.org_name as string | undefined, this.config.variables?.repo as string | undefined);
    }

    static defaultConfig(orgId: string): ResourceConfig {
        return GithubResourceMetadata.defaultConfig(orgId);
    }

    static variablesSchema(): VariablesSchema {
        return GithubResourceMetadata.variablesSchema();
    }
}