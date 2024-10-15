export interface VsCodeInstanceManager {
    createVsCode(args: {
        orgId: string,
        taskExecutionId: string,
        indexRepoLocation: string,
        indexRepoBranch: string,
        indexRepoUsername: string,
        indexRepoPassword: string,
    }): Promise<void>;

    deleteVsCode(args: {
        orgId: string,
        taskExecutionId: string,
    }): Promise<void>;

    getApiUrl(taskExecutionId: string): string;
    getCollabUrl(args: {
        orgId: string,
        taskExecutionId: string,
        repoUrl: string,
        channelId?: string,
        threadId?: string
    }): string;

}