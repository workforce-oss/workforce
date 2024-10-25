import { jsonStringify } from "../../util/json.js";
import { ChannelDb } from "../channel/db.js";
import { CredentialHelper } from "../credential/helper.js";
import { DocumentationDb } from "../documentation/db.js";
import { ResourceDb } from "../resource/db.js";
import { TaskDb } from "../task/db.js";
import { Subtask, TaskConfig, ToolReference } from "../task/model.js";
import { ToolDb } from "../tool/db.js";
import { TrackerDb } from "../tracker/db.js";

export async function mapTaskNamesToIds(args: {
    configs: TaskConfig[],
    orgId: string,
    channels?: ChannelDb[] | undefined,
    resources?: ResourceDb[] | undefined,
    trackers?: TrackerDb[] | undefined,
    flowTools?: ToolDb[] | undefined,
    flowDocumentation?: DocumentationDb[] | undefined
}): Promise<void> {
    const { configs, channels, resources, trackers, flowTools, flowDocumentation, orgId } = args;
    for (const config of configs) {
        await CredentialHelper.instance.replaceCredentialNameWithId(config, orgId);

        if (config.defaultChannel) {
            const foundChannel = channels?.find((c) => c.name === config.defaultChannel);
            if (foundChannel) {
                config.defaultChannel = foundChannel.id;
            }
        }

        if (config.tracker) {
            config.tracker = trackers?.find((c) => c.name === config.tracker)?.id;
        }

        if (config.tools) {
            const tools: ToolReference[] = [];
            for (const tool of config.tools) {
                //Also update the output of the tool from a resource
                if (tool.output) {
                    const foundResource = resources?.find((c) => c.name === tool.output);
                    if (foundResource) {
                        tool.output = foundResource.id;
                    }
                }
                const found = flowTools?.find((c) => c.name === tool.name);
                if (found) {
                    const reference: ToolReference = {
                        name: found.name,
                        id: found.id,
                    };
                    if (tool.output) {
                        reference.output = tool.output;
                    }
                    tools.push(reference);
                }
            }

            config.tools = tools;
        }

        if (config.documentation) {
            const documentation: string[] = [];
            for (const documentationName of config.documentation) {
                const foundDocumentation = flowDocumentation?.find((c) => c.name === documentationName);
                if (foundDocumentation) {
                    documentation.push(foundDocumentation.id);
                }
            }
            config.documentation = documentation;
        }

        if (config.inputs) {
            for (const input of Object.keys(config.inputs)) {
                const inputVals = [];
                if (Array.isArray((config.inputs)[input])) {
                    inputVals.push(...(config.inputs)[input]);
                } else {
                    inputVals.push((config.inputs)[input]);
                }
                for (const val of inputVals) {
                    const foundResource = resources?.find(
                        (c) => c.name === val
                    );

                    if (foundResource) {
                        if (Array.isArray((config.inputs)[input])) {
                            (config.inputs)[input] = ((config.inputs)[input]).map((v) => v == foundResource.name ? foundResource.id : v);
                        } else {
                            (config.inputs)[input] = foundResource.id;
                        }
                        continue;
                    }

                    const foundChannel = channels?.find(
                        (c) => c.name === val
                    );
                    if (foundChannel) {
                        if (Array.isArray((config.inputs)[input])) {
                            (config.inputs)[input] = ((config.inputs)[input]).map((v) => v == foundChannel.name ? foundChannel.id : v);
                        } else {
                            (config.inputs)[input] = foundChannel.id;
                        }
                        continue;
                    }
                }
            }
        }
        if (config.outputs) {
            const outputs: string[] = [];
            for (const output of config.outputs) {
                const foundResource = resources?.find((c) => c.name === output);
                if (foundResource) {
                    outputs.push(foundResource.id);
                    continue;
                }

                const foundTracker = trackers?.find((c) => c.name === output);
                if (foundTracker) {
                    outputs.push(foundTracker.id);
                    continue;
                }
                const foundChannel = channels?.find((c) => c.name === output);
                if (foundChannel) {
                    outputs.push(foundChannel.id);
                    continue;
                }
            }
            if (outputs.length > 0) {
                config.outputs = outputs;
            }
        }

        if (config.triggers) {
            const triggers: string[] = [];
            for (const trigger of config.triggers) {
                const foundChannel = channels?.find((c) => c.name === trigger);
                if (foundChannel) {
                    triggers.push(foundChannel.id);
                    continue;
                }
                const foundResource = resources?.find((c) => c.name === trigger);
                if (foundResource) {
                    triggers.push(foundResource.id);
                    continue;
                }
            }
            config.triggers = triggers;
        }
    }
}

// We need to handle inputs from the subtasks as well
export function mapSubtaskNamesToIds(args: {
    configs: TaskConfig[],
    taskDbs: TaskDb[]
}): void {
    const { configs, taskDbs } = args;
    for (const config of configs) {
        if (config.subtasks) {
            const subtasks: Subtask[] = [];
            for (const subtask of config.subtasks) {
                const foundSubTask = taskDbs.find((t) => t.name === subtask.name);
                if (foundSubTask) {
                    subtasks.push({
                        name: foundSubTask.name,
                        id: foundSubTask.id
                    })
                } else {
                    subtasks.push({
                        name: subtask.name
                    })
                }
            }
            if (subtasks.length > 0) {
                config.subtasks = subtasks;
            }
        }
        if (config.inputs) {
            for (const input in config.inputs) {
                if (Array.isArray(config.inputs[input])) {
                    const inputVals = config.inputs[input];
                    for (let i = 0; i < inputVals.length; i++) {
                        const foundSubTask = taskDbs.find((t) => t.name === inputVals[i]);
                        if (foundSubTask) {
                            inputVals[i] = foundSubTask.id;
                        }
                    }
                } else {
                    const foundSubTask = taskDbs.find((t) => t.name === config.inputs![input] as string);
                    if (foundSubTask) {
                        config.inputs[input] = foundSubTask.id;
                    }
                }

            }
        }
    }

    for (const taskDb of taskDbs) {
        const foundConfig = configs.find((c) => c.name === taskDb.name);
        if (foundConfig) {
            if (foundConfig.subtasks) {
                taskDb.subtasks = jsonStringify(foundConfig.subtasks);
            }
            if (foundConfig.inputs) {
                taskDb.inputs = jsonStringify(foundConfig.inputs);
            }
        }
    }
}

export async function mapTaskIdsToNames(args: {
    configs: TaskConfig[],
    channels?: ChannelDb[] | undefined,
    resources?: ResourceDb[] | undefined,
    trackers?: TrackerDb[] | undefined,
    flowTools?: ToolDb[] | undefined,
    flowDocumentation?: DocumentationDb[] | undefined
}): Promise<void> {
    const { configs, channels, resources, trackers, flowTools, flowDocumentation } = args;
    for (const existing of configs) {
        const config: TaskConfig = {
            inputs: {} as Record<string, string | string[]>,
            id: existing.id,
            type: existing.type,
            name: existing.name,
            description: existing.description,
            flowId: existing.flowId,
            orgId: existing.orgId,
        };
        await CredentialHelper.instance.replaceCredentialIdWithName(existing);
        if (existing.credential) {
            config.credential = existing.credential;
        }
        const outputs: string[] = [];

        if (existing.defaultChannel) {
            const foundChannel = channels?.find((c) => c.id === existing.defaultChannel);
            if (foundChannel) {
                config.defaultChannel = foundChannel.name;
            }
        }

        if (existing.tracker) {
            config.tracker = trackers?.find((c) => c.id === existing.tracker)?.name;
        }

        if (existing.inputs) {
            if (!config.inputs) {
                config.inputs = {};
            }
            for (const input of Object.keys(existing.inputs)) {
                const inputVals = [];
                config.inputs[input] = existing.inputs[input];

                if (Array.isArray(config.inputs[input])) {
                    inputVals.push(...(config.inputs[input]));
                } else {
                    inputVals.push(config.inputs[input]);
                }

                for (const val of inputVals) {
                    const foundResource = resources?.find(
                        (c) => c.id === val
                    );
                    if (foundResource) {
                        if (Array.isArray(config.inputs[input])) {
                            config.inputs[input] = (config.inputs[input]).map((v) => v == foundResource.id ? foundResource.name : v);
                        } else {
                            config.inputs[input] = foundResource.name;
                        }
                    }
                    const foundChannel = channels?.find(
                        (c) => c.id === val
                    );
                    if (foundChannel) {
                        if (Array.isArray(config.inputs[input])) {
                            config.inputs[input] = (config.inputs[input]).map((v) => v == foundChannel.id ? foundChannel.name : v);
                        } else {
                            config.inputs[input] = foundChannel.name;
                        }
                    }

                    const foundSubTask = configs.find((c) => c.id === val);
                    if (foundSubTask) {
                        if (Array.isArray(config.inputs[input])) {
                            (config.inputs)[input] = (config.inputs[input]).map((v) => v == foundSubTask.id ? foundSubTask.name : v);
                        } else {
                            (config.inputs)[input] = foundSubTask.name;
                        }
                    }
                }
            }
        }

        if (existing.outputs) {
            for (const output of existing.outputs) {
                const foundChannel = channels?.find((c) => c.id === output);
                if (foundChannel) {
                    outputs.push(foundChannel.name);
                    continue;
                }
                const foundResource = resources?.find((c) => c.id === output);
                if (foundResource) {
                    outputs.push(foundResource.name);
                    continue;
                }
                const foundTracker = trackers?.find((c) => c.id === output);
                if (foundTracker) {
                    outputs.push(foundTracker.name);
                    continue;
                }
            }
        }

        if (existing.tools) {
            const tools: ToolReference[] = [];
            for (const tool of existing.tools) {
                const found = flowTools?.find((c) => c.id === tool.id);
                if (found) {
                    const foundResource = resources?.find((c) => c.id === tool.output);
                    if (foundResource) {
                        tool.output = foundResource.name;
                    }
                    const reference: ToolReference = {
                        name: found.name,
                    };
                    if (tool.output) {
                        reference.output = tool.output;
                    }
                    tools.push(reference);
                }
            }
            config.tools = tools;
        }

        if (existing.subtasks) {
            const subtasks: Subtask[] = [];
            for (const subtask of existing.subtasks) {
                subtasks.push({
                    name: subtask.name,
                })
            }
            config.subtasks = subtasks;
        }

        if (existing.documentation) {
            const updated: string[] = [];
            for (const documentation of existing.documentation) {
                const foundDocumentation = flowDocumentation?.find((c) => c.id === documentation);
                if (foundDocumentation) {
                    updated.push(foundDocumentation.name);
                }
            }
            config.documentation = updated;
        }

        if (existing.triggers) {
            const updated: string[] = [];
            for (const trigger of existing.triggers) {
                const foundChannel = channels?.find((c) => c.id === trigger);
                if (foundChannel) {
                    updated.push(foundChannel.name);
                    continue;
                }
                const foundResource = resources?.find((c) => c.id === trigger);
                if (foundResource) {
                    updated.push(foundResource.name);
                    continue;
                }
            }
            config.triggers = updated;
        }

        // map on the rest of the existing options
        if (existing.variables) {
            config.variables = existing.variables;
        }
        if (existing.requiredSkills) {
            config.requiredSkills = existing.requiredSkills;
        }
        if (existing.costLimit) {
            config.costLimit = existing.costLimit;
        }

        if (outputs.length > 0) {
            config.outputs = outputs;
        }

        if (config.credential) {
            existing.credential = config.credential;
        }
        if (config.requiredSkills) {
            existing.requiredSkills = config.requiredSkills;
        }
        if (config.defaultChannel) {
            existing.defaultChannel = config.defaultChannel;
        }
        if (config.tracker) {
            existing.tracker = config.tracker;
        }
        if (config.costLimit) {
            existing.costLimit = config.costLimit;
        }
        if (config.inputs) {
            existing.inputs = config.inputs;
        }
        if (config.outputs) {
            existing.outputs = config.outputs;
        }
        if (config.documentation) {
            existing.documentation = config.documentation;
        }
        if (config.tools) {
            existing.tools = config.tools;
        }
        if (config.subtasks) {
            existing.subtasks = config.subtasks;
        }
        if (config.triggers) {
            existing.triggers = config.triggers;
        }
        if (config.variables) {
            existing.variables = config.variables;
        }
    }
}