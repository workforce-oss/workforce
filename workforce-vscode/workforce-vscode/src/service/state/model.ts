export interface WorkforceState {
    currentTaskExecutionId?: string;
    tasks?: WorkforceTask[];
}

export interface WorkforceTask {
    taskExecutionId?: string;
    orgId?: string;
    channelId?: string;
    threadId?: string;
    repoUrl?: string;
}