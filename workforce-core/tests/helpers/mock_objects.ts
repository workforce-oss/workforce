import { randomUUID } from "crypto";
import { BrokerManager } from "../../src/manager/broker_manager.js";
import { ObjectFactory } from "../../src/objects/base/factory/object_factory.js";
import { BaseConfig, TASK_COMPLETE_FUNCTION_NAME, ToolCall } from "../../src/objects/base/model.js";
import { Channel } from "../../src/objects/channel/base.js";
import { ChannelBroker } from "../../src/objects/channel/broker.js";
import { ChannelConfig, ChannelType } from "../../src/objects/channel/model.js";
import { DocumentRepository } from "../../src/objects/document_repository/base.js";
import { Resource } from "../../src/objects/resource/base.js";
import { ResourceBroker } from "../../src/objects/resource/broker.js";
import { ResourceConfig } from "../../src/objects/resource/model.js";
import { Task } from "../../src/objects/task/base.js";
import { TaskBroker } from "../../src/objects/task/broker.js";
import { TaskConfig, ToolReference } from "../../src/objects/task/model.js";
import { Tool } from "../../src/objects/tool/base.js";
import { ToolBroker } from "../../src/objects/tool/broker.js";
import { ToolConfig } from "../../src/objects/tool/model.js";
import { Tracker } from "../../src/objects/tracker/base.js";
import { TrackerBroker } from "../../src/objects/tracker/broker.js";
import { TrackerConfig } from "../../src/objects/tracker/model.js";
import { Worker } from "../../src/objects/worker/base.js";
import { WorkerBroker } from "../../src/objects/worker/broker.js";
import { WorkerConfig } from "../../src/objects/worker/model.js";
import { CredentialConfig } from "../../src/objects/credential/model.js";
import { ChannelUserCredential } from "../../src/objects/channel_user_credential/model.js";
import { ConfigFactory } from "../../src/objects/base/factory/config_factory.js";


export function mockCredentialConfig(args: { name: string; orgId: string; }): CredentialConfig {
	const { name, orgId } = args;
	return {
		id: randomUUID(),
		name: name,
		description: `${name} description`,
		type: "mock-channel",
		orgId: orgId,
		variables: {
			secret_key: 1,
		},
	};
}

export function mockCredentialToolConfig(args: { name: string; orgId: string; }): ToolConfig {
	const { name, orgId } = args;
	return {
		id: randomUUID(),
		name: name,
		description: `${name} description`,
		type: "mock-tool",
		orgId: orgId,
		variables: {
			output: `${name} output`,		
		}
	};
}

export function mockChannelUserCredential(args: {name: string, orgId: string, token: string}): ChannelUserCredential {
	const { name, orgId, token } = args;
	return {
		id: randomUUID(),
		name: name,
		description: `${name} description`,
		type: "worker-native-token",
		orgId: orgId,
		variables: {
			token: "secret_value",
		},
	};
}

export function mockResourceConfig(args: { name: string; orgId: string;}): ResourceConfig {
	const { name, orgId } = args;
	return {
		id: randomUUID(),
		name: name,
		description: `${name} description`,
		type: "mock-resource",
		orgId: orgId,
		example: "",
		variables: {
			output: {
				name: name,
				content: `${name} output`,
			},
		},
	};
}

export function mockChannelConfig(args: {
	name: string;
	outputArgs: { name: string; value: any }[];
	orgId: string;
	endCount?: number;
	finalMessage?: string;
}): ChannelConfig {
	const { name, outputArgs, orgId } = args;
	const channel: ChannelConfig = {
		id: randomUUID(),
		name: name,
		description: `${name} description`,
		type: "mock-channel",
		orgId: orgId,
		variables: {
			output: {
				name: TASK_COMPLETE_FUNCTION_NAME,
				arguments: {},
			},
			endCount: args.endCount || 1,
			finalMessage: args.finalMessage,
		},
	};

	for (const arg of outputArgs) {
		(channel.variables!.output as ToolCall).arguments[arg.name] = arg.value;
	}

	return channel;
}

export function mockWorkerConfig(args: { name: string; orgId: string; skills?: string[], channelConfig?: Record<ChannelType, string>}) {
	const { name, orgId, skills, channelConfig } = args;
	const worker: WorkerConfig = {
		id: randomUUID(),
		name: name,
		description: `${name} description`,
		type: "mock-worker",
		orgId: orgId,
		skills: skills,
		channelUserConfig: channelConfig,
		variables: {
			output: `${name} output`,
		},
	};
	return worker;
}

export function mockTrackerConfig(args: { name: string; orgId: string; }): TrackerConfig {
	const { name, orgId } = args;
	const tracker: TrackerConfig = {
		id: randomUUID(),
		name: name,
		description: `${name} description`,
		type: "mock-tracker",
		orgId: orgId,
		variables: {
			output: `${name} output`,
		},
	};
	return tracker;
}

export function mockToolConfig(args: { name: string; orgId: string; }): ToolConfig {
	const { name, orgId } = args;
	const tool: ToolConfig = {
		id: randomUUID(),
		name: name,
		description: `${name} description`,
		type: "mock-tool",
		orgId: orgId,
		variables: {
			output: `${name} output`,
		},
	};
	return tool;
}

export function mockTaskConfig(args: {
	name: string;
	orgId: string;
	flowId?: string;
	inputs?: Record<string, string[]>;
	requiredSkills?: string[];
	tools?: ToolReference[];
	outputs?: string[];
	worker?: string;
	triggers?: string[];
	tracker?: string;
	defaultChannel?: string;
	variables?: Record<string, any>;
}): TaskConfig {
	const { name, orgId, flowId, inputs, requiredSkills, tools, outputs, worker, triggers, tracker, defaultChannel, variables } = args;
	const task: TaskConfig = {
		id: randomUUID(),
		name: name,
		description: `${name} description`,
		type: "mock-task",
		orgId: orgId,
		flowId: flowId,
	};
	if (inputs) {
		task.inputs = inputs;
	}
	if (requiredSkills) {
		task.requiredSkills = requiredSkills;
	}
	if (outputs) {
		task.outputs = outputs;
	}
	if (triggers) {
		task.triggers = triggers;
	}
	if (tracker) {
		task.tracker = tracker;
	}
	if (tools) {
		task.tools = tools;
	}
	if (defaultChannel) {
		task.defaultChannel = defaultChannel;
	}
	if (variables) {
		task.variables = variables;
	}
	return task;
}

export class MockObjectFactory {
	static async createAndRegisterConfigs(configs: BaseConfig[]): Promise<void> {
		const tasks: Task[] = [];
		const resources: Resource[] = [];
		const channels: Channel[] = [];
		const documentRepositories: DocumentRepository[] = [];
		const tools: Tool<any>[] = [];
		const workers: Worker[] = [];
		const trackers: Tracker<any>[] = [];
		
		await BrokerManager.reset();

		configs.forEach((config) => {
			const objectType = ConfigFactory.getTypeForSubtype(config.type);
			const obj = ObjectFactory.create(config, objectType, () => {});
			switch (objectType) {
				case "resource":
					resources.push(obj as Resource);
					break;
				case "channel":
					channels.push(obj as Channel);
					break;
				case "task":
					tasks.push(obj as Task); 
					break;
				case "tool":
					tools.push(obj as Tool<any>);
					break;
				case "tracker":
					trackers.push(obj as Tracker<any>);
					break;
				case "worker":
					workers.push(obj as Worker);
					break;
				case "credential":
					break;
				default:
					throw new Error(`Unknown object type ${config.type}`);
			}
		});

		for (const resource of resources) {
			await BrokerManager.resourceBroker.register(resource);
		}
		for (const tool of tools) {
			await BrokerManager.toolBroker.register(tool);
		}
		for (const channel of channels) {
			await BrokerManager.channelBroker.register(channel);
		}
		for (const worker of workers) {
			await BrokerManager.workerBroker.register(worker);
		}
		for (const tracker of trackers) {
			await BrokerManager.trackerBroker.register(tracker);
		}
		for (const task of tasks) {
			await BrokerManager.taskBroker.register(task);
		}
	}

	static mockChannelUserCredential(args: {name: string, orgId: string, token: string}): CredentialConfig {
		return mockChannelUserCredential(args);
	}

	static mockResourceConfig(args: { name: string; orgId: string; flowId?: string }): ResourceConfig {
		return mockResourceConfig(args);
	}

	static mockChannelConfig(args: {
		name: string;
		outputArgs: [{ name: string; value: any }];
		orgId: string;
		flowId?: string;
	}): ChannelConfig {
		return mockChannelConfig(args);
	}

	static mockWorkerConfig(args: { name: string; orgId: string; flowId?: string; channelConfig?: Record<ChannelType, string> }) {
		return mockWorkerConfig(args);
	}

	static mockTrackerConfig(args: { name: string; orgId: string; flowId?: string }): TrackerConfig {
		return mockTrackerConfig(args);
	}

	static mockTaskConfig(args: {
		name: string;
		orgId: string;
		flowId?: string;
		inputs?: Record<string, string[]>;
		outputResources?: string[];
		worker?: string;
		tracker?: string;
		variables?: Record<string, any>;
	}): TaskConfig {
		return mockTaskConfig(args);
	}
}

export type TaskMock = {
	taskBroker: TaskBroker;
	resourceBroker: ResourceBroker;
	channelBroker: ChannelBroker;
	workerBroker: WorkerBroker;
	trackerBroker: TrackerBroker;
	toolBroker: ToolBroker;
};
