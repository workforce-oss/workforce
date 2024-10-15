/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Organization, ProjectV2, ProjectV2Item, ProjectV2SingleSelectField } from "@octokit/graphql-schema";
import { GraphQlQueryResponseData } from "@octokit/graphql/types";
import { EmitterWebhookEvent, EmitterWebhookEventName, Webhooks } from "@octokit/webhooks";
import { randomUUID } from "crypto";
import { Octokit } from "@octokit/rest";
import { Subscription } from "rxjs";
import { Configuration } from "../../config/configuration.js";
import { Logger } from "../../logging/logger.js";
import { WebhookEvent, WebhookRoute, WebhookRouteManager } from "../../manager/webhook_route_manager.js";

export class GithubService {
    private webhooks: Webhooks | undefined;
    private octokit?: Octokit;
    private _secret: string;
    private _apiToken: string;
    private repoHooks: number[] = [];
    private orgHooks: number[] = [];
    private logger: Logger;
    private webhookSubscriptions = new Map<string, Subscription>();

    constructor(apiToken?: string, disableWebhooks?: boolean) {
        this.logger = Logger.getInstance("GithubService");

        this.logger.debug(`constructor() Creating GithubService with token ${apiToken?.substring(0, 5)}...${apiToken?.substring(apiToken.length - 5)}`)
        this._secret = randomUUID();
        this._apiToken = apiToken ?? "";
        const authToken = this._apiToken || Configuration.GithubApiToken;
        if (!disableWebhooks) {
            this.webhooks = new Webhooks({
                secret: this._secret,
            });
        }
        this.octokit = new Octokit({
            auth: authToken,

        });
    }

    public async getFile(owner: string, repo: string, path: string, ref?: string): Promise<string> {
        const response = await this.octokit?.rest.repos.getContent({
            type: "file",
            owner,
            repo,
            path,
            ref
        }).catch((err) => {
            this.logger.debug(`getFile() error getting file ${path} from repo ${repo}`, JSON.stringify(err));
            throw err;
        });
        if (!response) {
            throw new Error(`Failed to get file ${path} from repo ${repo}`);
        }
        if ((response as unknown as Record<string, unknown>).entries) {
            throw new Error(`Failed to get file ${path} from repo ${repo}, entries not supported`);
        }
        this.logger.debug(`getFile() Got file ${path} from repo ${repo}`);
        return Buffer.from((response.data as unknown as Record<string, string>).content, "base64").toString();
    }

    private async getFullTree(owner: string, repo: string): Promise<{ sha: string, path: string, size: number }[]> {
        const response = await this.octokit?.rest.git.getTree({
            owner,
            repo,
            recursive: "true",
            tree_sha: "HEAD"
        });
        if (!response) {
            throw new Error(`Failed to get from repo ${repo}`);
        }

        return response.data.tree.filter(file => (file.sha && file.path)).map((file) => {
            return {
                sha: file.sha!,
                path: file.path!,
                size: file.size!
            };
        });
    }

    public async getUpdatedFilesMatchingRegexWithContent(args: {
        owner: string,
        repo: string,
        regex: string,
        existing?: { path: string, sha?: string }[],
        fileCallback: (file: { path: string, sha?: string, content: string, delete?: boolean, size?: number }) => Promise<void>
    }): Promise<void> {
        const { owner, repo, regex, existing, fileCallback } = args;
        const files = await this.getFilesMatchingRegex(owner, repo, regex).catch((err) => {
            this.logger.debug(`getUpdatedFilesMatchingRegexWithContent() error getting files for ${owner}/${repo}`, err);
            return [];
        });

        for (const file of files) {
            if (existing?.find((f) => {
                if (f.sha && file.sha && f.path === file.path && f.sha === file.sha) {
                    return true;
                }
            })) {
                this.logger.debug(`Skipping file ${file.path} as it is up to date`);
                continue;
            }
            const content = await this.getFile(owner, repo, file.path).catch((err) => {
                this.logger.error(`Error getting file ${file.path}`, err);
                return "";
            });
            if (!content) {
                this.logger.error(`Error getting file ${file.path}`);
                continue;
            }
            await fileCallback({ path: file.path, sha: file.sha, content }).catch((err) => {
                this.logger.error(`Error processing file ${file.path}`, err);
            });
        }

        if (existing && existing.length > 0) {
            for (const file of existing) {
                if (files.find((f) => {
                    if (f.path === file.path) {
                        return true;
                    }
                })) {
                    continue;
                }
                await fileCallback({ path: file.path, sha: file.sha, content: "", delete: true }).catch((err) => {
                    this.logger.error(`Error deleting file ${file.path}`, err);
                });
            }
        }
    }

    private async getFilesMatchingRegex(owner: string, repo: string, regex: string): Promise<{ path: string, sha: string, size: number }[]> {
        const files = await this.getFullTree(owner, repo).catch((err) => {
            this.logger.debug(`getFilesMatchingRegex() error getting full tree for ${owner}/${repo}`, err);
            return [];
        });

        return files.filter((file) => file.path.match(regex)).map((file) => {
            return {
                path: file.path,
                sha: file.sha,
                size: file.size
            };
        });
    }

    public async getFilesMatchingRegexWithContent(owner: string, repo: string, regex: string, fileCallback: (file: { path: string, sha: string, content: string }) => Promise<void>): Promise<void> {
        const files = await this.getFilesMatchingRegex(owner, repo, regex).catch((err) => {
            this.logger.debug(`getFilesMatchingRegexWithContent() error getting files for ${owner}/${repo}`, err);
            return [];
        });

        for (const file of files) {
            const content = await this.getFile(owner, repo, file.path).catch((err) => {
                this.logger.error(`Error getting file ${file.path}`, err);
                return "";
            });
            if (!content) {
                continue;
            }
            await fileCallback({ path: file.path, sha: file.sha, content }).catch((err) => {
                this.logger.error(`Error processing file ${file.path}`, err);
            });
        }
    }

    public async commitAndPushFile(owner: string, repo: string, path: string, content: string, message: string): Promise<void> {
        const response = await this.octokit?.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message,
            content: Buffer.from(content).toString("base64"),
            sha: await this.getSha(owner, repo, path),
        });
        if (!response) {
            throw new Error(`Failed to commit file ${path} to repo ${repo}`);
        }
    }

    public async getPullRequest(args: { owner: string, repo: string, pullRequestId: number }): Promise<{ sourceBranch: string, targetBranch: string, title: string, body: string, loginId: string }> {
        const { owner, repo, pullRequestId } = args;
        const response = await this.octokit?.rest.pulls.get({
            owner,
            repo,
            pull_number: pullRequestId
        });
        if (!response) {
            throw new Error(`Failed to get pull request ${pullRequestId} from ${owner}/${repo}`);
        }
        return {
            sourceBranch: response.data.head.ref,
            targetBranch: response.data.base.ref,
            title: response.data.title,
            body: response.data.body ?? "",
            loginId: response.data.user.login
        };
    }

    public async getCommitsForPullRequest(args: { owner: string, repo: string, pullRequestId: number }): Promise<string[]> {
        const { owner, repo, pullRequestId } = args;
        const response = await this.octokit?.rest.pulls.listCommits({
            owner,
            repo,
            pull_number: pullRequestId
        });
        if (!response) {
            throw new Error(`Failed to get commits for pull request ${pullRequestId} in ${owner}/${repo}`);
        }
        return (response as unknown as { data: { sha: string }[] }).data.map((commit) => commit.sha)
    }

    public async listFilesInPullRequest(args: { owner: string, repo: string, pullRequestId: number }): Promise<string[]> {
        const { owner, repo, pullRequestId } = args;
        const response = await this.octokit?.rest.pulls.listFiles({
            owner,
            repo,
            pull_number: pullRequestId
        });
        if (!response) {
            throw new Error(`Failed to get files for pull request ${pullRequestId} in ${owner}/${repo}`);
        }
        return (response as unknown as { data: { filename: string }[] }).data.map((file) => file.filename);
    }

    public async getFileContentForPullRequest(args: { owner: string, repo: string, pullRequestId: number, ref: string }): Promise<Map<string, string>> {
        const { owner, repo, pullRequestId, ref } = args;
        const files = await this.listFilesInPullRequest({ owner, repo, pullRequestId });

        const result = new Map<string, string>();

        for (const file of files) {
            const content = await this.getFile(owner, repo, file, ref);
            result.set(file, content);
        }

        return result;
    }





    public async createPullRequest(args: { owner: string, repo: string, title: string, sourceBranch: string, targetBranch: string, body: string }): Promise<void> {
        const { owner, repo, title, sourceBranch, targetBranch, body } = args;
        const response = await this.octokit?.rest.pulls.create({
            owner,
            repo,
            title,
            head: sourceBranch,
            base: targetBranch,
            body
        });
        if (!response) {
            throw new Error(`Failed to create pull request for ${sourceBranch} to ${targetBranch} in ${owner}/${repo}`);
        }
    }

    public async commentOnPullRequest(args: { owner: string, repo: string, pullRequestId: number, body: string }): Promise<void> {
        const { owner, repo, pullRequestId, body } = args;
        const response = await this.octokit?.rest.issues.createComment({
            owner,
            repo,
            issue_number: pullRequestId,
            body,
        });
        if (!response) {
            throw new Error(`Failed to comment on pull request ${pullRequestId} in ${owner}/${repo}`);
        }
    }

    public async getCommentsForPullRequest(args: { owner: string, repo: string, pullRequestId: number }): Promise<string[]> {
        // use the rest issues api to get comments
        const { owner, repo, pullRequestId } = args;
        const response = await this.octokit?.rest.issues.listComments({
            owner,
            repo,
            issue_number: pullRequestId,
            per_page: 100
        });
        if (!response) {
            throw new Error(`Failed to get comments for pull request ${pullRequestId} in ${owner}/${repo}`);
        }
        if (!response.data || response.data.length === 0) {
            return [];
        }

        const pullRequestResponse = await this.octokit?.rest.pulls.listReviewComments({
            owner,
            repo,
            pull_number: pullRequestId,
            per_page: 100
        });

        const comments: { login: string, body: string, file: string, timestamp: number, startline?: number, line?: number }[] = [];

        if (!pullRequestResponse) {
            this.logger.error(`getCommentsForPullRequest() error getting review comments for pull request ${pullRequestId} in ${owner}/${repo}`);
        } else {
            pullRequestResponse.data.forEach((c) => {
                comments.push({
                    login: c.user.login,
                    body: c.body,
                    file: c.path,
                    startline: c.start_line ?? undefined,
                    line: c.line ?? undefined,
                    timestamp: Date.parse(c.created_at)
                });
            });
        }

        response.data.forEach((c) => {
            comments.push({
                login: c.user?.login ?? "Unknown",
                body: c.body ?? "",
                file: "",
                timestamp: Date.parse(c.created_at)
            });
        });

        // sort ascending by timestamp
        comments.sort((a, b) => a.timestamp - b.timestamp);

        return comments.map((comment) => {
            if (comment.file) {
                if (comment.startline && comment.line) {
                    return `${comment.login}: ${comment.body}\nFile: ${comment.file}\nLines: ${comment.startline}-${comment.line}\n`;
                } else if (comment.line && comment.line !== 1) {
                    return `${comment.login}: ${comment.body}\nFile: ${comment.file}\nLine: ${comment.line}\n`;
                }
                return `${comment.login}: ${comment.body}\nFile: ${comment.file}\n`;
            }
            return `${comment.login}: ${comment.body}\n`
        });
    }

    private async getSha(owner: string, repo: string, path: string): Promise<string | undefined> {
        const response = await this.octokit?.rest.repos.getContent({
            owner,
            repo,
            path
        }).catch((err: Record<string, unknown>) => {
            this.logger.debug(`getSha() error getting sha for ${path} in ${owner}/${repo}`, err);
            if (err.status === 404) {
                return undefined;
            }
        });
        if (!response) {
            return undefined;
        }

        return (response as { data: { sha: string } }).data.sha;
    }

    public async addProjectV2DraftIssue(args: { projectName: string, orgName: string, title: string, description: string }): Promise<string> {
        const { projectName, orgName, title, description } = args;
        const projectId = await this.getProjectId({ projectName: projectName, orgName }).catch((err) => {
            this.logger.error(`addProjectV2DraftIssue() error getting project id for ${projectName}`, err);
            throw err;
        });
        const response = await this.octokit?.graphql<{ addProjectV2DraftIssue: { projectItem: ProjectV2Item } }>(`
            mutation($projectId: ID!, $title: String!, $description: String!) {
                addProjectV2DraftIssue(input: {
                    projectId: $projectId,
                    title: $title,
                    body: $description
                }) {
                    projectItem {
                        ... on ProjectV2Item {
                            id
                        }
                    }
                }
            }`,
            {
                projectId,
                title,
                description
            }).catch((err) => {
                this.logger.error(`addProjectV2DraftIssue() error creating issue for project ${projectName} with title ${title}`, err);
                throw err;
            });
        if (!response) {
            throw new Error(`Failed to create issue for project ${projectName} with title ${title}`);
        }
        this.logger.debug(`addProjectV2DraftIssue() Created issue ${JSON.stringify(response)} for project ${projectName} with title ${title}`);
        const projectItem = response.addProjectV2DraftIssue.projectItem as { id: string };
        return projectItem.id;
    }

    public async getAllProjectV2Items(args: { projectName: string, orgName: string }): Promise<ProjectV2Item[]> {
        const { projectName, orgName } = args;
        const response = await this.octokit?.graphql<GraphQlQueryResponseData>(`
        query($projectName: String!, $orgName: String!) {
            organization(login:$orgName) {
            projectsV2(query:$projectName, first: 1) {
              nodes {
                items(first:20) {
                  ... on ProjectV2ItemConnection {
                    nodes {
                      ... on ProjectV2Item {
                        id
                        fieldValues(first: 20) {
                          nodes {
                            ... on ProjectV2ItemFieldValueCommon {
                              field {
                                ... on ProjectV2FieldCommon {
                                  __typename
                                  id
                                  name
                                }
                              }
                            }
                          }
                        }
                        content {
                          __typename
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }`, {
            projectName,
            orgName
        });
        if (!response) {
            throw new Error(`Failed to get items for project ${projectName}`);
        }
        const project = response.organization?.projectsV2?.nodes?.[0] as ProjectV2;
        if (!project) {
            throw new Error(`Failed to get project ${projectName}`);
        }
        const items = project.items?.nodes?.map(node => node as ProjectV2Item);
        if (!items) {
            throw new Error(`Failed to get items for project ${projectName}`);
        }
        return items;
    }

    public async updateProjectV2DraftIssueStatus(args: { projectId: string, itemId: string, status: string }): Promise<void> {
        const { projectId, itemId, status } = args;
        const existingIssue = await this.getProjectV2DraftIssue({ itemId });

        const projectV2StatusField = await this.getProjectV2StatusField({ projectId });

        const statusFieldId = projectV2StatusField?.id;
        const statusFieldOptionId = projectV2StatusField?.options?.find(option => option?.name === status)?.id;
        if (!existingIssue) {
            throw new Error(`Failed to find issue ${itemId}`);
        }

        const response = await this.octokit?.graphql(`
            mutation($projectId: ID!, $itemId: ID!, $statusFieldId: ID!, $statusFieldOptionId: String!) {
                updateProjectV2ItemFieldValue(input: {
                    projectId: $projectId,
                    itemId: $itemId,
                    fieldId: $statusFieldId,
                    value: {
                        singleSelectOptionId: $statusFieldOptionId
                    }
                })  {
                        projectV2Item {
                            ... on ProjectV2Item {
                                id
                            }
                        }
                }
            }`,
            {
                projectId,
                itemId,
                statusFieldId,
                statusFieldOptionId
            });
        if (!response) {
            throw new Error(`Failed to update project item ${itemId} with status ${status}`);
        }
        this.logger.debug(`updateProjectV2DraftIssueStatus() Updated project item ${itemId} with status ${status}`);
    }

    public async getProjectV2StatusField(args: { projectId: string }): Promise<ProjectV2SingleSelectField> {
        const { projectId } = args;
        const response = await this.octokit?.graphql<GraphQlQueryResponseData>(`
            query($projectId: ID!) {
                nodes(ids: [$projectId]) {
                    ... on ProjectV2 {
                        fields(first: 20) {
                            nodes {
                                ... on ProjectV2SingleSelectField {
                                    name
                                    id
                                    options {
                                        id
                                        name
                                    }
                                }
                            }
                        }
                    }
                }
            }`,
            {
                projectId
            });
        if (!response) {
            throw new Error(`Failed to get project ${projectId}`);
        }
        const project = response.nodes?.[0] as ProjectV2;
        if (!project) {
            throw new Error(`Failed to get project ${projectId}`);
        }
        const statusField = project.fields?.nodes?.find(node => node?.name === "Status") as ProjectV2SingleSelectField;
        if (!statusField) {
            throw new Error(`Failed to get status field for project ${projectId}`);
        }
        return statusField;
    }

    public async getProjectV2DraftIssueValues(args: { itemId: string }): Promise<ProjectV2Item> {
        const { itemId } = args;
        const response = await this.octokit?.graphql<GraphQlQueryResponseData>(`
        query($itemId: ID!) {
            nodes(ids: [$itemId]) {
                ... on ProjectV2Item {
                    fieldValueByName(name:"Status") {
                        ... on ProjectV2ItemFieldSingleSelectValue {
                          name
                        }
                    }
                    content {
                        ... on DraftIssue {
                            title
                            body
                        }
                    }
                    project {
                        ... on ProjectV2 {
                            title
                        }
                    }
                }
            }
        }`,
            {
                itemId
            });
        if (!response) {
            throw new Error(`Failed to get values for item ${itemId}`);
        }
        const item = response.nodes?.[0] as ProjectV2Item;
        if (!item) {
            throw new Error(`Failed to get item ${itemId}`);
        }
        return item;
    }

    private async getProjectV2DraftIssue(args: { itemId: string }): Promise<ProjectV2Item> {
        const { itemId } = args;
        const response = await this.octokit?.graphql<GraphQlQueryResponseData>(`
            query($itemId: ID!) {
                nodes(ids: [$itemId]) {
                    ... on ProjectV2Item {
                        fieldValues(first: 40) {
                            nodes {
                                ... on ProjectV2ItemFieldValueCommon {
                                    field {
                                        ... on ProjectV2FieldCommon {
                                            __typename
                                            id
                                            name
                                        }
                                        ... on ProjectV2SingleSelectField {
                                            options {
                                            id
                                            name
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        content {
                            ... on DraftIssue {
                                title
                                body
                            }
                        }
                    }
                }
            }`,
            {
                itemId
            });
        if (!response) {
            throw new Error(`Failed to get project item ${itemId}`);
        }
        const projectItem = response.nodes?.[0] as ProjectV2Item;
        this.logger.debug(`getProjectV2DraftIssue() Got project item ${JSON.stringify(projectItem)}`);
        if (!projectItem) {
            throw new Error(`Failed to get project item ${itemId}`);
        }
        return projectItem;
    }

    public async getProjectId(args: { projectName: string, orgName: string }): Promise<string> {
        const { projectName: project, orgName } = args;
        const response = await this.octokit?.graphql<{ organization: Organization }>(`
            query($project: String!, $orgName: String!) {
                organization(login: $orgName) {
                    projectsV2(query: $project, first: 1) {
                        nodes {
                            id
                        }
                    }
                }
            }`,
            {
                project,
                orgName
            });
        if (!response) {
            throw new Error(`Failed to get project id for project ${project}`);
        }
        const nodes = response.organization?.projectsV2?.nodes;
        if (!nodes || nodes.length === 0) {
            throw new Error(`Failed to get project id for project ${project}`);
        }
        return nodes[0]!.id
    }

    public async getProjectNumber(args: { projectName: string, orgName: string }): Promise<number> {
        const { projectName: project, orgName } = args;
        const response = await this.octokit?.graphql<{ organization: Organization }>(`
            query($project: String!, $orgName: String!) {
                organization(login: $orgName) {
                    projectsV2(query: $project, first: 1) {
                        nodes {
                            number
                        }
                    }
                }
            }`,
            {
                project,
                orgName
            }).catch((err) => {
                this.logger.error(`getProjectNumber() error getting project number for ${project}`, err);
                throw err;
            });
        if (!response) {
            throw new Error(`Failed to get project id for project ${project}`);
        }
        const nodes = response.organization?.projectsV2?.nodes;
        if (!nodes || nodes.length === 0) {
            throw new Error(`Failed to get project id for project ${project}`);
        }
        return nodes[0]!.number
    }


    public async addWebhook(orgId: string, resourceId: string, options: GithubWebhookOptions, callback: (event: EmitterWebhookEvent<never>) => void): Promise<void> {
        await this.cleanupWebhooks(orgId, resourceId, options);
        const routeManager = await WebhookRouteManager.getInstance();
        routeManager.addRoute({
            objectId: resourceId,
            orgId: orgId,
            path: `/${orgId}/${resourceId}`,
        } as WebhookRoute);
        const subscription = routeManager.subscribeToWebhookEvents(orgId, resourceId, `/${orgId}/${resourceId}`, (event: WebhookEvent) => {
            const handler = this.webhookHandler.bind(event);
            handler(event).catch((err) => {
                this.logger.error(`addWebhook() error handling webhook event`, err);
            });
        });
        if (subscription) {
            this.webhookSubscriptions.set(resourceId, subscription);
        } else {
            throw new Error(`Failed to subscribe to webhook events for ${resourceId}`);
        }

        const events = options.eventTypes ?? [];
        if (events.length === 0) {
            events.push("push");
        }

        if (options.githubOrgName) {
            const hook = await this.octokit?.rest.orgs.createWebhook({
                org: options.githubOrgName,
                name: "web",
                active: true,
                config: {
                    url: `${Configuration.BaseUrl}/workforce-api/${orgId}/${resourceId}`,
                    secret: this._secret,
                    content_type: "json"
                },
                events
            });
            if (!hook) {
                throw new Error(`Failed to create webhook for org ${options.githubOrgName}`);
            }
            this.orgHooks.push(hook?.data.id);
        } else if (options.githubRepoName) {

            const hook = await this.octokit?.rest.repos.createWebhook({
                owner: options.owner!,
                repo: options.repo!,
                name: "web",
                active: true,
                events,
                config: {
                    url: `${Configuration.BaseUrl}/workforce-api/${orgId}/${resourceId}`,
                    secret: this._secret,
                    content_type: "json"
                }
            });
            if (!hook) {
                throw new Error(`Failed to create webhook for repo ${options.githubRepoName}`);
            }
            this.repoHooks.push(hook?.data.id);
        }
        this.webhooks?.on(options.eventTypes ?? ["push"], callback as never);
    }

    private async cleanupWebhooks(orgId: string, resourceId: string, options: GithubWebhookOptions) {
        if (options.githubOrgName) {
            this.logger.info(`Cleaning up webhooks for org ${options.githubOrgName}`);
            const hooks = await this.octokit?.rest.orgs.listWebhooks({
                org: options.githubOrgName,
                per_page: 20,
            });
            if (!hooks) {
                throw new Error(`Failed to get hooks for org ${options.githubOrgName}`);
            }
            for (const hook of hooks.data) {
                this.logger.debug(`Found hook ${hook.id} with url ${hook.config.url}`);
                if (hook.config.url?.startsWith(`${Configuration.BaseUrl}/workforce-api/${orgId}/${resourceId}`)) {
                    this.logger.debug(`Deleting hook ${hook.id}`);
                    await this.octokit?.rest.orgs.deleteWebhook({
                        org: options.githubOrgName,
                        hook_id: hook.id
                    }).then(() => {
                        this.logger.debug(`Deleted hook ${hook.id}`);
                    })
                        .catch((err) => {
                            this.logger.error(`Failed to delete hook ${hook.id}`, err);
                        });
                }
            }
        } else if (options.githubRepoName) {
            const hooks = await this.octokit?.rest.repos.listWebhooks({
                owner: options.owner!,
                repo: options.repo!,
                per_page: 20,
            });
            if (!hooks) {
                throw new Error(`Failed to get hooks for org ${options.githubOrgName}`);
            }
            for (const hook of hooks.data) {
                if (hook.config.url === `${Configuration.BaseUrl}/workforce-api/${orgId}/${resourceId}`) {
                    await this.octokit?.rest.repos.deleteWebhook({
                        owner: options.owner!,
                        repo: options.repo!,
                        hook_id: hook.id
                    }).then(() => {
                        this.logger.debug(`Deleted hook ${hook.id}`);
                    })
                        .catch((err) => {
                            this.logger.error(`Failed to delete hook ${hook.id}`, err);
                        });
                }
            }
        }
    }

    //TODO: Get the right values for name, org, etc.
    public async destroy(orgId: string, resourceId: string, github_owner?: string, github_org?: string, repo?: string): Promise<void> {
        const subscription = this.webhookSubscriptions.get(resourceId);
        if (subscription) {
            subscription.unsubscribe();
        }
        for (const hook of this.repoHooks) {
            await this.octokit?.rest.repos.deleteWebhook({
                owner: github_owner ?? "workforce-bot",
                repo: repo ?? "test",
                hook_id: hook
            });
        }
        for (const hook of this.orgHooks) {
            await this.octokit?.rest.orgs.deleteWebhook({
                org: github_org ?? "workforce-bot",
                hook_id: hook
            });
        }
    }

    public webhookHandler(event: WebhookEvent): Promise<void> {
        if (event.headers["x-github-event"] === "ping") {
            return Promise.resolve();
        }
        return this.webhooks?.verifyAndReceive({
            id: event.headers["x-github-delivery"] as string,
            name: event.headers["x-github-event"] as never,
            signature: event.headers["x-hub-signature"] as string,
            payload: JSON.stringify(event.body),
        }) ?? Promise.reject(new Error("Failed to verify and receive webhook"));
    }
}

export interface GithubWebhookOptions {
    githubOrgName?: string;
    githubRepoName?: string;
    eventTypes?: EmitterWebhookEventName[];
    owner?: string;
    repo?: string;
}