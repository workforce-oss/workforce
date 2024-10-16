import { VsCodeInstanceManager } from "./instance_manager.js";

export class LocalManager implements VsCodeInstanceManager {

    private static _instance: LocalManager;

    private server_url: string;

    private constructor(server_url: string) {
        this.server_url = server_url;
    }

    static getInstance(server_url: string): LocalManager {
        if (!LocalManager._instance || LocalManager._instance.server_url !== server_url) {
            LocalManager._instance = new LocalManager(server_url);
        }
        return LocalManager._instance;
    }

    createVsCode(): Promise<void> {
        return Promise.resolve(undefined);
    }
    deleteVsCode(): Promise<void> {
        return Promise.resolve(undefined);
    }
    getApiUrl(): string {
        return `${this.server_url}`;
    }

    getCollabUrl(args: { orgId: string; taskExecutionId: string; repoUrl: string; channelId?: string, threadId?: string }): string {
        const encodedRepoUrl = encodeURIComponent(args.repoUrl);
        let uri = `vscode://workforce-oss.workforce-vscode/task-execution?task_execution_id=${args.taskExecutionId}&repo_url=${encodedRepoUrl}&org_id=${args.orgId}`;
        if (args.channelId) {
            uri += `&channel_id=${args.channelId}`;
        }
        if (args.threadId) {
            uri += `&thread_id=${args.threadId}`;
        }
        return uri;
    }

}