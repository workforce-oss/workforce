import { WorkforceState, WorkforceTask } from "./model";
import * as vscode from 'vscode';

export class WorkforceStateProvider {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }
    async get(): Promise<WorkforceState> {
        const state = await this.context.secrets.get('workforce-state');
        if (state) {
            return JSON.parse(state);
        }
        return {};
    }
    set(state: WorkforceState): Thenable<void> {
        return this.context.secrets.store('workforce-state', JSON.stringify(state));   
    }

    async getCurrentTask(): Promise<WorkforceTask | undefined> {
        const currentState = await this.get();
        const currentTasks = currentState.tasks || [];
        return currentTasks.find(t => t.taskExecutionId === currentState.currentTaskExecutionId);
    }

    async getTask(taskExecutionId: string): Promise<WorkforceTask | undefined> {
        const currentState = await this.get();
        const currentTasks = currentState.tasks || [];
        return currentTasks.find(t => t.taskExecutionId === taskExecutionId);
    }

    async updateTask(task: WorkforceTask): Promise<void> {
        const currentState = await this.get();
        const currentTasks = currentState.tasks || [];
        const index = currentTasks.findIndex(t => t.taskExecutionId === task.taskExecutionId);
        if (index > -1) {
            currentTasks[index].channelId = task.channelId;
            currentTasks[index].taskExecutionId = task.taskExecutionId;
            currentTasks[index].threadId = task.threadId;
            currentTasks[index].orgId = task.orgId;
            currentTasks[index].repoUrl = task.repoUrl;
        } else {
            currentTasks.push(task);
        }
        currentState.currentTaskExecutionId = task.taskExecutionId;
        currentState.tasks = currentTasks;
        return this.set(currentState);
    }
}