import { BrokerManager } from "../../manager/broker_manager.js";
import { FunctionDocument, FunctionParameters } from "../../util/openapi.js";
import { snakeify } from "../../util/snake.js";
import { BaseObject } from "../base/base.js";
import { SUBTASK_SUMMARY_FUNCTION_NAME, TASK_COMPLETE_FUNCTION_NAME } from "../base/model.js";
import { ChannelType } from "../channel/model.js";
import { WorkerBroker } from "../worker/broker.js";
import { TaskConfig, TaskExecutionRequest } from "./model.js";

export abstract class Task extends BaseObject<TaskConfig> {

    abstract execute(taskExecution: TaskExecutionRequest, workerBroker: WorkerBroker, channelType?: ChannelType, onError?: (error: Error) => void): void;

    // variables are in the form of {{variable}}
    templateVars(template: string, inputs: Record<string, string>): string {
        let output = template;
        if (output === undefined || output === null || output === "") {
            return output;
        }
        if (typeof template !== "string") {
            throw new Error(`Template must be a string, got ${typeof template}`);
        }
        for (const [key, value] of Object.entries(inputs)) {
            output = output.replace(`{{${key}}}`, value);
        }
        return output;
    }


    public async getFunctionsSchema(channelId?: string, parentTaskExecutionId?: string): Promise<FunctionDocument> {
        let outputs: Record<string, FunctionParameters>[] = [];
        let hasChannelOutput = false;

        for (const objectId of this.config.outputs ?? []) {
            const resourceSchema = await BrokerManager.resourceBroker.getObjectSchema(objectId) as Record<string, FunctionParameters>;
            if (resourceSchema) {
                outputs.push(resourceSchema);
                continue;
            }
            const trackerSchema = await BrokerManager.trackerBroker.getObjectSchema(objectId) as Record<string, FunctionParameters>;
            if (trackerSchema) {
                outputs.push(trackerSchema);
                continue;
            }
            const channelSchema = await BrokerManager.channelBroker.getObjectSchema(objectId) as Record<string, FunctionParameters>;
            if (channelSchema) {
                outputs.push(channelSchema);
                hasChannelOutput = true;
                continue;
            }
        }

        // If no channel is set as an output, but the task is a channel task, add the channel output
        if (channelId && !hasChannelOutput) {
            const channelSchema = await BrokerManager.channelBroker.getObjectSchema(channelId) as Record<string, FunctionParameters>;
            if (channelSchema) {
                outputs.push(channelSchema);
            }
        }


        for (const toolReference of this.config.tools ?? []) {
            if (toolReference.output) {
                const resourceSchema = await BrokerManager.resourceBroker.getObjectSchema(toolReference.output);

                const resource = BrokerManager.resourceBroker.getObject(toolReference.output);
                if (!resource) {
                    throw new Error(`Resource ${toolReference.output} not found`);
                }


                if (resourceSchema) {
                    // Remove the existing reference to override it with the tool output
                    outputs = outputs.filter((output) => !output[resource.topLevelObjectKey()]);
                    outputs.push(await resource.schema(true));
                    continue;
                }
            }
        }

        if (parentTaskExecutionId) {
            outputs.push({
                [SUBTASK_SUMMARY_FUNCTION_NAME]: {
                    type: "object",
                    description: "This task was specificially requested as part of another task. Provide a summary of the activity performed in this task and any conclusions. When the user wants to perform a task that is beyond the scope of the current task, you can consider this subtask complete and provide a summary of the activity performed.",
                    properties: {
                        summary: {
                            type: "string",
                            description: "A summary of the task performed"
                        }
                    },
                    required: ["summary"]
                }
            })
        }

        const properties: Record<string, FunctionParameters> = {};
        const shell = {
            "name": TASK_COMPLETE_FUNCTION_NAME,
            "description": "Send the data to complete the task. Run this once the task is complete or if there is an error. If this is a conversation, this should just be the last message of your conversation, not a report.\n",
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": new Array<string>(),
            },
        }
        for (const output of outputs) {
            // get topmost key
            const key = Object.keys(output)[0];
            shell.parameters.properties[key] = output[key];
            shell.parameters.required.push(key);
        }
        return shell;
    }

    public getTaskIdForSubtaskFunctionName(name: string): Promise<string> {
        for (const subtask of this.config.subtasks ?? []) {
            if (snakeify(subtask.name) === name) {
                if (!subtask.id) {
                    throw new Error(`No Id for subtask found for ${this.config.id}: ${name}`);
                }
                return Promise.resolve(subtask.id);
            }
        }
        return Promise.resolve("");

    }

    public schema(): Promise<Record<string, FunctionParameters>> {
        return Promise.resolve({});
    }

    public getSubtaskFunctionSchema(): Promise<FunctionDocument[] | undefined> {
        if (!this.config.subtasks) {
            return Promise.resolve(undefined);
        }

        const functions: FunctionDocument[] = [];

        for (const subtask of this.config.subtasks) {
            if (!subtask.id) {
                this.logger.error(`subtask ${subtask.name} has no id`);
                continue;
            }
            const task = BrokerManager.taskBroker.getObject(subtask.id);
            if (!task) {
                this.logger.error(`no task registered for subtask ${subtask.id}`);
                continue;
            }
            if (!task.config.inputs) {
                this.logger.error(`subtask ${subtask.id} has no inputs`);
                continue;
            }

            let inputName = "";

            for (const input in task.config.inputs) {
                if (Array.isArray(task.config.inputs[input])) {
                    for (const id of task.config.inputs[input]) {
                        if  (id === this.config.id) {
                            inputName = input;
                            break;
                        }
                    }
                    if (inputName) {
                        break;
                    }
                } else {
                    if (task.config.inputs[input] === this.config.id) {
                        inputName = input;
                        break;
                    }
                }
            }

            if (!inputName) {
                this.logger.error(`no input for subtask ${subtask.id} matches ${this.config.id}`);
                this.logger.error(`inputs: ${JSON.stringify(task.config.inputs)}`);
                return Promise.resolve(undefined);
            }
            functions.push({
                "name": `${snakeify(subtask.name)}`,
                "description": (task.config.variables?.purpose as string | undefined) ?? "No description provided",
                "parameters": {
                    "type": "object",
                    "properties": {
                        [inputName] : {
                            "type": "string"
                        }
                    },
                    "required": [inputName]
                }
            }
            )
        }

        if (!functions || functions.length === 0) {
            return Promise.resolve(undefined);
        }

        return Promise.resolve(functions);
    }

}