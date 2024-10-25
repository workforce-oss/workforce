import { Task } from "../base.js";
import { SimpleTask } from "../impl/simple/simple_task.js";
import { TaskConfig } from "../model.js";

export class TaskFactory {
    static create(config: TaskConfig, onFailure: (objectId: string, error: string) => void): Task {
        switch (config.type) {
            case "simple-task":
                return new SimpleTask(config, onFailure);
            case "mock-task":
                return new SimpleTask(config, onFailure);
            default:
                throw new Error(`TaskFactory.create() unknown task type ${config.type}`);
        }
    }


}