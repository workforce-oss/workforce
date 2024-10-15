import { TaskExecutionRequest } from "workforce-core/model";
import { WebsocketAPI, WebsocketApiCreationArgs, WebsocketApiInstanceOptions } from "./base/websocket_api.js";

import { Subject } from "rxjs";
import { TaskExecutionResponse } from "workforce-core/model";

export class TaskExecutionWatchAPI extends WebsocketAPI {
    static instance: TaskExecutionWatchAPI | undefined;
    private eventSubject?: Subject<TaskExecutionRequest | TaskExecutionResponse>;
    private taskExecutionWatchCallback?: (message: TaskExecutionRequest | TaskExecutionResponse) => void;

    static getInstance(options: WebsocketApiInstanceOptions): TaskExecutionWatchAPI {
        if (!TaskExecutionWatchAPI.instance || options.accessToken !== TaskExecutionWatchAPI.instance.currentAuthToken) {
            if (TaskExecutionWatchAPI.instance) {
                TaskExecutionWatchAPI.instance.close();
            }
            TaskExecutionWatchAPI.instance = new TaskExecutionWatchAPI({
                basePath: options.basePath ? `${options.basePath}/${options.path}` : `/workforce-api/${options.path}`,
                baseUrl: options.baseUrl,
                unAuthorizedCallBack: options.unAuthorizedCallBack,
                accessToken: options.accessToken,
                anonymous: options.anonymous, 
            });
        }
        return TaskExecutionWatchAPI.instance;
    }

    constructor(args: WebsocketApiCreationArgs) {
        super(args);
        this.eventSubject = new Subject<TaskExecutionRequest | TaskExecutionResponse>();
        this.subscribeToTaskExecutionWatch();
    }

    public setTaskExecutionWatchCallback(callback: (message: TaskExecutionRequest | TaskExecutionResponse) => void): void {
        this.taskExecutionWatchCallback = callback;
    }

    private subscribeToTaskExecutionWatch(): void {
        this.eventSubject?.subscribe({
            next: (event: TaskExecutionRequest | TaskExecutionResponse) => {
                this.taskExecutionWatchCallback?.(event);
            },
            error: (error: any) => {
                console.error("Error in task execution watch subscription", error);
            },
        });
    }

    public sendTaskExecutionWatchMessage(message: TaskExecutionRequest | TaskExecutionResponse): void {
        this.send(message);
    }

    public async handleMessages(data: any): Promise<void> {
        if (data.success) {
            console.log("Auth successful");
            return;
        } else if (data.success === false) {
            console.log("Auth failed");
            return;
        }
        if (Array.isArray(data)) {
            for (const message of data) {
                this.eventSubject?.next(message);
            }
        } else {
            this.eventSubject?.next(data);
        }
    }
}