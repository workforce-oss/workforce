import dagre from "dagre";
import * as _ from "lodash";
import { Edge, Node } from "reactflow";
import { v4 as uuidv4 } from "uuid";
import { BaseConfig, ObjectType, ChannelConfig, CredentialConfig, DocumentationConfig, FlowConfig, ResourceConfig, TaskConfig, ToolReference, ToolConfig, TrackerConfig, channelTypes, resourceTypes, trackerTypes, ChannelType, ResourceType, taskTypes, TaskType, documentationTypes, DocumentationType, ToolType, toolTypes, TrackerType, DocumentRepositoryConfig } from "workforce-core/model";
import YAML from "yaml";
import { CustomNodeData, NodeDataFactory } from "../nodes/nodeData";
import { createEdge, incrementString } from "../util/util";
import { FlowData } from "./flow_data";

export class FlowManager {
	static createNodes(data: FlowData): Node<CustomNodeData<BaseConfig>>[] {
		const nodes: Node<CustomNodeData<BaseConfig>>[] = [];
		if (data.flow.channels) {
			for (const channel of data.flow.channels) {
				channel.id = channel.id ?? uuidv4();
				nodes.push({
					id: channel.id,
					type: "channel",
					position: { x: 0, y: 0 },
					data: NodeDataFactory.createChannel(channel),
				});
			}
		}
		if (data.flow.documentation) {
			for (const doc of data.flow.documentation) {
				doc.id = doc.id ?? uuidv4();
				nodes.push({
					id: doc.id,
					type: "documentation",
					position: { x: 0, y: 0 },
					data: NodeDataFactory.createDocumentation(doc),
				});
			}
		}
		if (data.flow.resources) {
			for (const resource of data.flow.resources) {
				resource.id = resource.id ?? uuidv4();
				nodes.push({
					id: resource.id,
					type: "resource",
					position: { x: 0, y: 0 },
					data: NodeDataFactory.createResource(resource),
				});
			}
		}
		if (data.flow.tools) {
			for (const tool of data.flow.tools) {
				tool.id = tool.id ?? uuidv4();
				nodes.push({
					id: tool.id,
					type: "tool",
					position: { x: 0, y: 0 },
					data: NodeDataFactory.createTool(tool),
				});
			}
		}
		if (data.flow.trackers) {
			for (const tracker of data.flow.trackers) {
				tracker.id = tracker.id ?? uuidv4();
				nodes.push({
					id: tracker.id,
					type: "tracker",
					position: { x: 0, y: 0 },
					data: NodeDataFactory.createTracker(tracker),
				});
			}
		}

		if (data.flow.tasks) {
			for (const task of data.flow.tasks) {
				task.id = task.id ?? uuidv4();
				nodes.push({
					id: task.id,
					type: "task",
					position: { x: 0, y: 0 },
					data: NodeDataFactory.createTask(task),
				});
			}
		}

		return nodes;
	}
	static createEdges(data: FlowData): Edge[] {
		const edges: Edge[] = [];
		if (data.flow.tasks) {
			// Order of object types matters here for a clean default layout
			for (const task of data.flow.tasks) {
				if (task.documentation) {
					for (const ref of task.documentation) {
						const obj = this.getObjectById(data, ref);
						const sourceId = obj?.id ?? ref;
						const sourceParameter = "ref";
						edges.push(createEdge(sourceId, sourceParameter, task.id, "documentation", "input"));
					}
				}
				if (task.defaultChannel) {
					const obj = this.getObjectById(data, task.defaultChannel);
					const sourceId = obj?.id ?? task.defaultChannel;
					const sourceParameter = "ref";
					edges.push(createEdge(sourceId, sourceParameter, task.id, "defaultChannel", "input"));
				}
				if (task.tracker) {
					const obj = this.getObjectById(data, task.tracker);
					const sourceId = obj?.id ?? task.tracker;
					const sourceParameter = "ticket";
					edges.push(createEdge(sourceId, sourceParameter, task.id, "tracker", "input"));
				}
				if (task.tools) {
					for (const tool of task.tools) {
						const obj = this.getObjectById(data, tool.id);
						const sourceId = obj?.id ?? tool.id;
						const sourceParameter = "ref";
						edges.push(createEdge(sourceId, sourceParameter, task.id, "tools", "input"));
						if (obj && tool.output) {
							const targetObj = this.getObjectById(data, tool.output);
							const targetId = targetObj?.id ?? tool.output;
							const targetParameter = "in";
							edges.push(createEdge(tool.id, "output", targetId, targetParameter, "input"));
						}
					}
				}
				if (task.triggers) {
					for (const trigger of task.triggers) {
						const obj = this.getObjectById(data, trigger);
						const sourceId = obj?.id ?? trigger;
						const sourceParameter = "data";
						edges.push(createEdge(sourceId, sourceParameter, task.id, "triggers", "input"));
					}
				}
				if (task.inputs) {
					for (const input of Object.keys(task.inputs)) {
						let objs = [];
						if (Array.isArray(task.inputs[input])) {
							for (const inputObj of task.inputs[input]) {
								const obj = this.getObjectById(data, inputObj);
								objs.push(obj?.id ?? inputObj);
							}
						} else {
							const obj = this.getObjectById(data, task.inputs[input] as string);
							objs.push(obj?.id ?? task.inputs[input]);
						}
						const ids = objs.map((obj) => obj?.id ?? obj);
						// deduplicate
						console.log(`Deduplicating ${input}`, objs);
						objs = objs.filter((obj, index) => ids.indexOf(obj?.id ?? obj) === index);
						console.log(`Deduplicated ${input}`, objs);
						for (const obj of objs) {
							// edges.push(createEdge(obj, "output", task.id, input, "taskInput"));
							const sourceId = obj?.id ?? task.inputs[input];
							console.log("Creating task input edge");
							console.log(task);
							console.log(input);
							console.log(obj);
							let sourceParameter = "output";
							if (channelTypes.includes(obj?.type)) {
								sourceParameter = "ref";
							} else if (resourceTypes.includes(obj?.type)) {
								sourceParameter = "data";
							} else if (trackerTypes.includes(obj?.type)) {
								sourceParameter = "ticket";
							}
							console.log()
							edges.push(createEdge(sourceId, sourceParameter, task.id, input, "taskInput"));
						}
					}
				}
				if (task.outputs) {
					for (const output of task.outputs) {
						const obj = this.getObjectById(data, output);
						const targetId = obj?.id ?? output;
						let targetParameter = "in";
						edges.push(createEdge(task.id, "outputs", targetId, targetParameter, "input"));
					}
				}
			}
			// now handle subtask references

			for (const task of data.flow.tasks) {
				if (task.subtasks) {
					for (const subtask of task.subtasks) {
						const obj: TaskConfig = this.getObjectTypeByName(data, subtask.name, "task") as TaskConfig;
						if (!obj) {
							console.error(`Could not find task ${subtask.name}`);
							continue
						}
						const targetId = obj?.id ?? subtask.name;
						let targetInput = "";
						for (const input of Object.keys(obj.inputs)) {
							if (Array.isArray(obj.inputs[input])) {
								for (const inputObj of obj.inputs[input]) {
									if (inputObj === task.name || inputObj === task.id) {
										targetInput = input;
									}
								}
							} else if (obj.inputs[input] === task.name || obj.inputs[input] === task.id) {
								targetInput = input;
							}
						}

						if (targetInput !== "") {
							edges.push(createEdge(task.id, "subtasks", targetId, targetInput, "taskInput"));
						}
					}
				}
			}
		}
		if (data.flow.tools) {
			for (const tool of data.flow.tools) {
				if (tool.channel) {
					const channel = data.flow.channels?.find((c) => c.name === tool.channel || c.id === tool.channel);
					if (channel) {
						edges.push(createEdge(channel.id, "ref", tool.id, "channel", "input"));
					}
				}

			}
		}
		return edges;
	}

	static createDefaultLayout(nodes: Node[], edges: Edge[]) {
		const dagreGraph = new dagre.graphlib.Graph();
		dagreGraph.setDefaultEdgeLabel(() => ({}));

		const nodeDimensions: Map<string, { width: number; height: number }> = new Map();
		nodeDimensions.set("channel", { width: 200, height: 400 });
		nodeDimensions.set("documentation", { width: 200, height: 400 });
		nodeDimensions.set("resource", { width: 200, height: 400 });
		nodeDimensions.set("task", { width: 200, height: 800 });
		nodeDimensions.set("tool", { width: 200, height: 400 });
		nodeDimensions.set("tracker", { width: 200, height: 400 });

		const nodeWidth = 200;
		const nodeHeight = 500;
		dagreGraph.setGraph({
			rankdir: "LR",
			nodesep: 20,
			edgesep: 50,
			ranksep: 150,
			align: "UL",
			ranker: "longest-path",
		});

		nodes.forEach((node) => {
			console.log(node);
			dagreGraph.setNode(node.id, {
				width: (nodeDimensions.get(node.data.type)?.width ?? nodeWidth) + node.data.config.name.length * 10,
				height: (nodeDimensions.get(node.data.type)?.height ?? nodeHeight),
			});
		});

		edges.forEach((edge) => {
			dagreGraph.setEdge(edge.source, edge.target);
		});

		dagre.layout(dagreGraph);

		nodes.forEach((node) => {
			const nodePosition = dagreGraph.node(node.id);
			node.position = {
				x: nodePosition.x,
				y: nodePosition.y,
			};
			return node;
		});
	}

	static replaceCredentialIdWithName(config: BaseConfig, credentials: CredentialConfig[]): void {
		if (config.credential) {
			const cred = credentials.find((c) => c.id === config.credential);
			if (cred) {
				config.credential = cred.name;
			}
		}
	}

	static replaceCredentialNameWithId(config: BaseConfig, credentials: CredentialConfig[]): void {
		if (config.credential) {
			const cred = credentials.find((c) => c.name === config.credential);
			if (cred) {
				config.credential = cred.id;
			}
		}
	}

	static convertToYaml(flow: FlowConfig, credentials: CredentialConfig[], documentRepositories: DocumentRepositoryConfig[]): string {
		const flowCopy = _.cloneDeep(flow);
		flowCopy.orgId = undefined;
		flowCopy.id = undefined;
		// We want to get object names to replace ids in references
		for (const task of flowCopy.tasks ?? []) {
			if (task.defaultChannel) {
				const channel = flow.channels?.find((c) => c.id === task.defaultChannel);
				if (channel) {
					task.defaultChannel = channel.name;
				}
			}
			if (task.documentation) {
				task.documentation = task.documentation.map((d) => {
					const doc = flow.documentation?.find((doc) => doc.id === d);
					if (doc) {
						return doc.name;
					}
					return d;
				});
			}
			if (task.inputs) {
				for (const input in task.inputs) {
					if (Array.isArray(task.inputs[input])) {
						task.inputs[input] = task.inputs[input].map((i) => {
							const obj = this.getObjectById({ flow }, i);
							if (obj) {
								return obj.name;
							}
							return i;
						});
					} else {
						const obj = this.getObjectById({ flow }, task.inputs[input] as string);
						if (obj) {
							task.inputs[input] = obj.name;
						}
					}
				}
			}
			if (task.outputs) {
				task.outputs = task.outputs.map((o) => {
					const obj = this.getObjectById({ flow }, o);
					if (obj) {
						return obj.name;
					}
					return o;
				});
			}
		}

		for (const documentation of flowCopy.documentation ?? []) {
			if (documentation.repository) {
				const repo = documentRepositories.find((r) => r.id === documentation.repository);
				if (repo) {
					documentation.repository = repo.name;
				}
			}
		}
		for (const tool of flowCopy.tools ?? []) {
			if (tool.channel) {
				const channel = flow.channels?.find((c) => c.id === tool.channel);
				if (channel) {
					tool.channel = channel.name;
				}
			}
		}

		for (const task of flowCopy.tasks ?? []) {
			this.replaceCredentialIdWithName(task, credentials);
			task.flowId = undefined;
			task.orgId = undefined;
			task.id = undefined;
			for (const tool of task.tools ?? []) {
				tool.id = undefined;
			}
			for (const subtask of task.subtasks ?? []) {
				subtask.id = undefined;
			}
		}
		for (const channel of flowCopy.channels ?? []) {
			this.replaceCredentialIdWithName(channel, credentials);
			channel.flowId = undefined;
			channel.orgId = undefined;
			channel.id = undefined;
		}
		for (const documentation of flowCopy.documentation ?? []) {
			this.replaceCredentialIdWithName(documentation, credentials);
			documentation.flowId = undefined;
			documentation.orgId = undefined;
			documentation.id = undefined;
		}
		for (const resource of flowCopy.resources ?? []) {
			this.replaceCredentialIdWithName(resource, credentials);
			resource.flowId = undefined;
			resource.orgId = undefined;
			resource.id = undefined;
		}
		for (const tool of flowCopy.tools ?? []) {
			this.replaceCredentialIdWithName(tool, credentials);
			tool.flowId = undefined;
			tool.orgId = undefined;
			tool.id = undefined;
		}
		for (const tracker of flowCopy.trackers ?? []) {
			this.replaceCredentialIdWithName(tracker, credentials);
			tracker.flowId = undefined;
			tracker.orgId = undefined;
			tracker.id = undefined;
		}

		const obj = {
			flows: [flowCopy]
		}

		return YAML.stringify(obj, {
			keepUndefined: false,
		});
	}
	static convertFromYaml(yaml: string, currentOrgId: string, existingFlows: FlowConfig[], credentials: CredentialConfig[], documentRepositories: DocumentRepositoryConfig[]): FlowConfig | undefined {
		const data = YAML.parse(yaml, {
			merge: true,
			schema: "core",
			prettyErrors: true,
		}) as { flows: FlowConfig[] };


		if (data.flows.length > 0) {
			// We should add ids to all of the flow resources with uuidv4
			// and we should change name to id in all references
			const flow = data.flows[0];
			if (existingFlows.find((f) => f.name === flow.name)) {
				console.error(`Flow with name ${flow.name} already exists`);
				return undefined;
			}
			flow.id = flow.id ?? uuidv4();
			flow.orgId = currentOrgId;
			if (flow.channels) {
				for (const channel of flow.channels) {
					channel.id = channel.id ?? uuidv4();
					this.replaceCredentialNameWithId(channel, credentials);
				}
			}
			if (flow.documentation) {
				for (const doc of flow.documentation) {
					doc.id = doc.id ?? uuidv4();
					doc.flowId = flow.id;
					doc.orgId = currentOrgId;
					this.replaceCredentialNameWithId(doc, credentials);
					if (doc.repository) {
						const repo = documentRepositories.find((r) => r.name === doc.repository);
						if (repo) {
							doc.repository = repo.id;
						}
					}
				}
			}
			if (flow.resources) {
				for (const resource of flow.resources) {
					resource.id = resource.id ?? uuidv4();
					resource.flowId = flow.id;
					resource.orgId = currentOrgId;
					this.replaceCredentialNameWithId(resource, credentials);
				}
			}
			if (flow.tools) {
				for (const tool of flow.tools) {
					tool.id = tool.id ?? uuidv4();
					tool.flowId = flow.id;
					tool.orgId = currentOrgId;
					this.replaceCredentialNameWithId(tool, credentials);
					if (tool.channel) {
						const channel = flow.channels?.find((c) => c.name === tool.channel);
						if (channel) {
							tool.channel = channel.id;
						}
					}
				}
			}
			if (flow.trackers) {
				for (const tracker of flow.trackers) {
					tracker.id = tracker.id ?? uuidv4();
					tracker.flowId = flow.id;
					tracker.orgId = currentOrgId;
					this.replaceCredentialNameWithId(tracker, credentials);
				}
			}
			if (flow.tasks) {
				for (const task of flow.tasks) {
					task.id = task.id ?? uuidv4();
					task.flowId = flow.id;
					task.orgId = currentOrgId;
					this.replaceCredentialNameWithId(task, credentials);
					if (task.defaultChannel) {
						const channel = flow.channels?.find((c) => c.name === task.defaultChannel);
						if (channel) {
							task.defaultChannel = channel.id;
						}
					}
					if (task.documentation) {
						task.documentation = task.documentation.map((d) => {
							const doc = flow.documentation?.find((doc) => doc.name === d);
							if (doc) {
								return doc.id;
							}
							return d;
						});
					}
					if (task.inputs) {
						for (const input in task.inputs) {
							if (Array.isArray(task.inputs[input])) {
								task.inputs[input] = task.inputs[input].map((i) => {
									const obj = this.getObjectByName({flow}, i);
									if (obj) {
										return obj.id;
									}
									return i;
								});
							} else {
								const obj = this.getObjectByName({flow}, task.inputs[input] as string);
								if (obj) {
									task.inputs[input] = obj.id;
								}
							}
						}
					}
					if (task.outputs) {
						task.outputs = task.outputs.map((o) => {
							const obj = this.getObjectByName({flow}, o);
							if (obj) {
								return obj.id;
							}
							return o;
						});
					}
					if (task.tools) {
						for (const tool of task.tools) {
							const obj = this.getObjectByName({flow}, tool.id);
							if (obj) {
								tool.id = obj.id;
							}
						}
					}
					if (task.triggers) {
						task.triggers = task.triggers.map((t) => {
							const obj = this.getObjectByName({flow}, t);
							if (obj) {
								return obj.id;
							}
							return t;
						});
					}
					if (task.subtasks) {
						task.subtasks = task.subtasks.map((s) => {
							const obj = this.getObjectByName({flow}, s.name);
							if (obj) {
								s.id = obj.id;
							}
							return s;
						});
					}
					if (task.tracker) {
						const obj = this.getObjectByName({flow}, task.tracker);
						if (obj) {
							task.tracker = obj.id;
						}
					}
				}
			}
			return flow;
		}
	}

	static getObjectType(config: BaseConfig): ObjectType {
		if (channelTypes.includes(config.type as ChannelType)) {
			return "channel";
		}
		if (documentationTypes.includes(config.type as DocumentationType)) {
			return "documentation";
		}
		if (resourceTypes.includes(config.type as ResourceType)) {
			return "resource";
		}
		if (taskTypes.includes(config.type as TaskType)) {
			return "task";
		}
		if (toolTypes.includes(config.type as ToolType)) {
			return "tool";
		}
		if (trackerTypes.includes(config.type as TrackerType)) {
			return "tracker";
		}
	}

	static getObjectTypeByName(data: FlowData, name: string, type: string): BaseConfig | undefined {

		if (type === "channel") {
			return data.flow.channels?.find((c) => c.name === name);
		} else if (type === "documentation") {
			return data.flow.documentation?.find((d) => d.name === name);
		} else if (type === "resource") {
			return data.flow.resources?.find((r) => r.name === name);
		} else if (type === "task") {
			return data.flow.tasks?.find((t) => t.name === name);
		} else if (type === "tool") {
			return data.flow.tools?.find((t) => t.name === name);
		} else if (type === "tracker") {
			return data.flow.trackers?.find((t) => t.name === name);
		}
	}

	static getObjectById(data: FlowData, id: string): BaseConfig | undefined {
		if (data.flow.channels) {
			const channel = data.flow.channels.find((c) => c.id === id);
			if (channel) {
				return channel;
			}
		}
		if (data.flow.documentation) {
			const documentation = data.flow.documentation.find((d) => d.id === id);
			if (documentation) {
				return documentation;
			}
		}
		if (data.flow.resources) {
			const resource = data.flow.resources.find((r) => r.id === id);
			if (resource) {
				return resource;
			}
		}
		if (data.flow.tasks) {
			const task = data.flow.tasks.find((t) => t.id === id);
			if (task) {
				return task;
			}
		}
		if (data.flow.tools) {
			const tool = data.flow.tools.find((t) => t.id === id);
			if (tool) {
				return tool;
			}
		}
		if (data.flow.trackers) {
			const tracker = data.flow.trackers.find((t) => t.id === id);
			if (tracker) {
				return tracker;
			}
		}
	}

	static getObjectByName(data: FlowData, name: string): BaseConfig | undefined {
		if (data.flow.channels) {
			const channel = data.flow.channels.find((c) => c.name === name);
			if (channel) {
				return channel;
			}
		}
		if (data.flow.documentation) {
			const documentation = data.flow.documentation.find((d) => d.name === name);
			if (documentation) {
				return documentation;
			}
		}
		if (data.flow.resources) {
			const resource = data.flow.resources.find((r) => r.name === name);
			if (resource) {
				return resource;
			}
		}
		if (data.flow.tasks) {
			const task = data.flow.tasks.find((t) => t.name === name);
			if (task) {
				return task;
			}
		}
		if (data.flow.tools) {
			const tool = data.flow.tools.find((t) => t.name === name);
			if (tool) {
				return tool;
			}
		}
		if (data.flow.trackers) {
			const tracker = data.flow.trackers.find((t) => t.name === name);
			if (tracker) {
				return tracker;
			}
		}

		return undefined;
	}


	static addObject<T extends BaseConfig>(data: FlowData, obj: T, objectType: ObjectType) {
		while (this.getObjectTypeByName(data, obj.name, objectType) !== undefined) {
			obj.name = incrementString(obj.name);
		}
		if (objectType === "channel") {
			if (!data.flow.channels) {
				data.flow.channels = [];
			}
			data.flow.channels.push(obj as ChannelConfig);
		} else if (objectType === "documentation") {
			if (!data.flow.documentation) {
				data.flow.documentation = [];
			}
			data.flow.documentation.push(obj as DocumentationConfig);
		} else if (objectType === "resource") {
			if (!data.flow.resources) {
				data.flow.resources = [];
			}
			data.flow.resources.push(obj as ResourceConfig);
		} else if (objectType === "task") {
			if (!data.flow.tasks) {
				data.flow.tasks = [];
			}
			data.flow.tasks.push(obj as TaskConfig);
		} else if (objectType === "tool") {
			if (!data.flow.tools) {
				data.flow.tools = [];
			}
			data.flow.tools.push(obj as ToolConfig);
		} else if (objectType === "tracker") {
			if (!data.flow.trackers) {
				data.flow.trackers = [];
			}
			data.flow.trackers.push(obj as TrackerConfig);
		} else {
			console.error(`addObject() unknown object type ${obj.type}`);
		}
	}




	static removeObject(data: FlowData, name: string, objectType: ObjectType) {
		switch (objectType) {
			case "channel":
				data.flow.channels = data.flow.channels?.filter((c) => c.name !== name && c.id !== name);
				this.removeTaskRefs(data, "channel", name);
				this.removeToolRefs(data, name);
				break;
			case "documentation":
				data.flow.documentation = data.flow.documentation?.filter((d) => d.name !== name && d.id !== name);
				this.removeTaskRefs(data, "documentation", name);
				break;
			case "resource":
				data.flow.resources = data.flow.resources?.filter((r) => r.name !== name && r.id !== name);
				this.removeTaskRefs(data, "resource", name);
				break;
			case "task":
				data.flow.tasks = data.flow.tasks?.filter((t) => t.name !== name && t.id !== name);
				this.removeTaskRefs(data, "task", name);
				break;
			case "tool":
				data.flow.tools = data.flow.tools?.filter((t) => t.name !== name && t.id !== name);
				this.removeTaskRefs(data, "tool", name);
				break;
			case "tracker":
				data.flow.trackers = data.flow.trackers?.filter((t) => t.name !== name && t.id !== name);
				this.removeTaskRefs(data, "tracker", name);
				break;
			default:
				console.error(`removeObject() unknown object type ${objectType}`);
				break;
		}
	}

	static updateObject(data: FlowData, obj: BaseConfig, objectType: ObjectType) {
		const found = this.getObjectById(data, obj.id);

		if (found) {
			_.mergeWith(found, obj, (objValue, srcValue) => {
				if (_.isArray(objValue) && _.isArray(srcValue)) {
					let newValue = objValue;
					for (const val in srcValue) {
						if (objValue.includes(val)) {
							continue;
						} else {
							newValue.push(val);
						}
					}
					for (const val in objValue) {
						if (srcValue.includes(val)) {
							continue;
						} else {
							newValue = newValue.filter((v) => v !== val);
						}
					}
					return newValue;
				}
			});
		} else {
			console.error(`updateObject() object not found ${obj.type}: ${obj.name}`)
		}
	}


	static removeTaskRefs(data: FlowData, type: ObjectType, name: string) {
		if (data.flow.tasks) {
			for (const task of data.flow.tasks) {
				if (type === "tool") {
					task.tools = task.tools?.filter((t) => t.name !== name && t.id !== name);
				} else if (type === "documentation") {
					task.documentation = task.documentation?.filter((d) => d !== name && d !== name);
				} else if (type === "channel") {
					if (task.defaultChannel === name) {
						task.defaultChannel = undefined;
					}
				} else if (type === "tracker") {
					if (task.tracker === name) {
						task.tracker = undefined;
					}
				}

				if (type === "resource" || type === "channel") {
					if (task.inputs) {
						for (const input of Object.keys(task.inputs)) {
							if (Array.isArray(task.inputs[input])) {
								task.inputs[input] = (task.inputs[input] as string[]).filter((i) => i !== name);
							} else {
								if (task.inputs[input] === name) {
									task.inputs[input] = undefined;
								}
							}
						}
					}
				}

				if (type === "task") {
					if (task.subtasks) {
						task.subtasks = task.subtasks.filter((s) => s.name !== name && s.id !== name);
					}
				}

				if (task.outputs && task.outputs.includes(name)) {
					task.outputs = task.outputs.filter((o) => o !== name);
				}
			}
		}
	}

	static removeToolRefs(data: FlowData, name: string) {
		if (data.flow.tools) {
			for (const tool of data.flow.tools) {
				if (tool.channel === name) {
					tool.channel = undefined;
				}
			}
		}
	}

	static updateTaskRefs(data: FlowData, type: ObjectType, oldName: string, newName: string) {
		if (data.flow.tasks) {
			for (const task of data.flow.tasks) {
				if (type === "tool") {
					task.tools = task.tools?.map((t) => {
						if (t.name === oldName) {
							t.name = newName;
						}
						return t;
					});
				} else if (type === "documentation") {
					task.documentation = task.documentation?.map((d) => (d === oldName ? newName : d));
				} else if (type === "channel") {
					if (task.defaultChannel === oldName) {
						task.defaultChannel = newName;
					}
				} else if (type === "tracker") {
					if (task.tracker === oldName) {
						task.tracker = newName;
					}
				}

				if (type === "resource" || type === "channel") {
					if (task.inputs) {
						for (const input of Object.keys(task.inputs)) {
							if (Array.isArray(task.inputs[input])) {
								task.inputs[input] = (task.inputs[input] as string[]).map((i) => (i === oldName ? newName : i));
							} else {
								if (task.inputs[input] === oldName) {
									task.inputs[input] = newName;
								}
							}
						}
					}

					if (task.triggers) {
						task.triggers = task.triggers.map((t) => (t === oldName ? newName : t));
					}
				}

				if (type === "task") {
					if (task.subtasks) {
						task.subtasks = task.subtasks.map((s) => {
							if (s.name === oldName) {
								s.name = newName;
							}
							return s;
						});
					}
				}

				if (task.outputs && task.outputs.includes(oldName)) {
					task.outputs = task.outputs.map((o) => (o === oldName ? newName : o));
				}
			}
		}

	}

	static updateToolRefs(data: FlowData, oldName: string, newName: string) {
		if (data.flow.tools) {
			for (const tool of data.flow.tools) {
				if (tool.channel === oldName) {
					tool.channel = newName;
				}
			}
		}
	}


	static addConnection(
		data: FlowData,
		sourceId: string,
		sourceParameter: string,
		targetId: string,
		targetParameter: string,
		taskInput?: boolean
	): boolean {
		let added = false;
		if (data.flow.tasks) {
			const sourceObj = data.flow.tasks.find((t) => t.name === sourceId || t.id === sourceId);
			if (sourceObj) {
				added =
					this.addTaskConnection(data, sourceObj, sourceId, targetId, sourceParameter, undefined) || added;
			}
			const targetObj = data.flow.tasks.find((t) => t.name === targetId || t.id === targetId);
			if (targetObj) {
				added =
					this.addTaskConnection(data, targetObj, sourceId, targetId, targetParameter, taskInput) || added;
			}

			for (const task of data.flow.tasks) {
				if (task.tools) {
					for (const tool of task.tools) {
						if (tool.name === sourceId || tool.id === sourceId) {
							added =
								this.addToolReferenceConnection(data, tool, sourceId, targetId, sourceParameter) ||
								added;
						}
					}
				}
			}
		}

		if (data.flow.tools) {
			const sourceObj = data.flow.tools.find((t) => t.name === sourceId || t.id === sourceId);
			if (sourceObj) {
				added = this.addToolConnection(data, sourceObj, sourceId, targetId, sourceParameter) || added;
			}
			const targetObj = data.flow.tools.find((t) => t.name === targetId || t.id === targetId);
			if (targetObj) {
				added = this.addToolConnection(data, targetObj, sourceId, targetId, targetParameter) || added;
			}
		}

		return added;
	}

	static removeConnection(
		flow: FlowData,
		sourceId: string,
		sourceParameter: string,
		targetId: string,
		targetParameter: string
	) {
		if (flow.flow.tasks) {
			const sourceObj = flow.flow.tasks.find((t) => t.id === sourceId || t.name === sourceId);
			if (sourceObj) {
				this.removeTaskConnection({ data: flow, task: sourceObj, sourceId, targetId, parameter: sourceParameter });
			}
			const targetObj = flow.flow.tasks.find((t) => t.id === targetId || t.name === targetId);
			if (targetObj) {
				this.removeTaskConnection({ data: flow, task: targetObj, sourceId, targetId, parameter: targetParameter });
			}

			for (const task of flow.flow.tasks) {
				if (task.tools) {
					for (const tool of task.tools) {
						if (tool.name === sourceId || tool.id === sourceId) {
							this.removeToolReferenceConnection(task, sourceId, targetId, sourceParameter);
						}
					}
				}
			}
		}
		if (flow.flow.tools) {
			const sourceObj = flow.flow.tools.find((t) => t.id === sourceId || t.name === sourceId);
			if (sourceObj) {
				this.removeToolConnection(sourceObj, sourceId, targetId, sourceParameter);
			}
			const targetObj = flow.flow.tools.find((t) => t.id === targetId || t.name === targetId);
			if (targetObj) {
				this.removeToolConnection(targetObj, sourceId, targetId, targetParameter);
			}
		}
	}

	static addTaskConnection(
		data: FlowData,
		task: TaskConfig,
		sourceId: string,
		targetId: string,
		parameter: string,
		taskInput?: boolean,
		credentials?: CredentialConfig[]
	): boolean {
		console.log(`Adding task connection ${sourceId} -> ${targetId} ${parameter}`)
		if (taskInput) {
			console.log("Adding task input connection");
			console.log(`sourceId: ${sourceId}, targetId: ${targetId}, parameter: ${parameter}`);
			if (!task.inputs) {
				task.inputs = {};
			}
			if (!task.inputs[parameter]) {
				task.inputs[parameter] = sourceId;
				return true;
			}
			if (Array.isArray(task.inputs[parameter])) {
				if (!task.inputs[parameter].includes(sourceId)) {
					(task.inputs[parameter] as string[]).push(sourceId);
					return true;
				}
			} else if (typeof task.inputs[parameter] === "string" && task.inputs[parameter] !== sourceId) {
				task.inputs[parameter] = [(task.inputs[parameter] as string), sourceId];
				return true;
			} else {
				task.inputs[parameter] = sourceId;
				return true;
			}
		}
		if (parameter === "defaultChannel") {
			if (data.flow.channels?.find((c) => c.name === sourceId || c.id === sourceId)) {
				task.defaultChannel = sourceId;
				return true;
			}
		} else if (parameter === "tracker") {
			if (data.flow.trackers?.find((t) => t.name === sourceId || t.id === sourceId)) {
				task.tracker = sourceId;
				return true;
			}
		} else if (parameter === "inputs") {
			if (!task.inputs) {
				task.inputs = {};
			}
			if (!task.inputs[sourceId]) {
				if (data.flow.channels?.find((c) => c.name === sourceId || c.id === sourceId)) {
					task.inputs[sourceId] = targetId;
					return true;
				}
			} else if (Array.isArray(task.inputs[sourceId])) { // if task.inputs[sourceId] is an array, and its not already in the array, add it
				if (!task.inputs[sourceId].includes(targetId)) {
					(task.inputs[sourceId] as string[]).push(targetId);
					return true;
				}
			} else if (typeof task.inputs[sourceId] === "string" && task.inputs[sourceId] !== targetId) { // if it is a string and it is not the same as the targetId, convert it to an array and add the targetId
				task.inputs[sourceId] = [task.inputs[sourceId] as string, targetId];
				return true;
			} else {
				task.inputs[sourceId] = targetId;
				return true;
			}
		} else if (parameter === "outputs") {
			if (!task.outputs) {
				task.outputs = [];
			}
			if (!task.outputs.includes(targetId)) {
				if (data.flow.channels?.find((c) => c.name === targetId || c.id === targetId)) {
					task.outputs.push(targetId);
					return true;
				} else if (data.flow.resources?.find((r) => r.name === targetId || r.id === targetId)) {
					task.outputs.push(targetId);
					return true;
				} else if (data.flow.trackers?.find((t) => t.name === targetId || t.id === targetId)) {
					task.outputs.push(targetId);
					return true;
				}
			}
		} else if (parameter === "subtasks") {
			if (!task.subtasks) {
				task.subtasks = [];
			}
			if (!task.subtasks.find((s) => s.name === targetId || s.id === targetId)) {
				if (data.flow.tasks?.find((t) => t.name === targetId || t.id === targetId)) {
					const subtask = data.flow.tasks.find((t) => t.name === targetId || t.id === targetId);
					if (subtask) {
						task.subtasks.push({
							id: subtask?.id,
							name: subtask?.name,
						});
						return true;
					}
				}
			}

		} else if (parameter === "tools") {
			const tool = data.flow.tools?.find((t) => t.name === sourceId || t.id === sourceId);
			if (tool) {
				if (!task.tools) {
					task.tools = [];
				}
				if (!task.tools?.find((t) => t.id === sourceId)) {
					task.tools.push({
						id: tool.id,
						name: tool.name,
					});
					return true;
				}
			}
		} else if (parameter === "triggers") {
			if (!task.triggers) {
				task.triggers = [];
			}
			if (!task.triggers.includes(sourceId)) {
				if (data.flow.resources?.find((r) => r.name === sourceId || r.id === sourceId)) {
					if (!task.triggers.includes(sourceId)) {
						task.triggers.push(sourceId);
						return true;
					}
				} else if (data.flow.channels?.find((c) => c.name === sourceId || c.id === sourceId)) {
					if (!task.triggers.includes(sourceId)) {
						task.triggers.push(sourceId);
						return true;
					}
				}
			}
		} else if (parameter === "documentation") {
			if (!task.documentation) {
				task.documentation = [];
			}
			if (!task.documentation.includes(sourceId)) {
				if (data.flow.documentation?.find((d) => d.name === sourceId || d.id === sourceId)) {
					task.documentation.push(sourceId);
					return true;
				}
			}
		}
		return false;
	}

	static removeTaskConnection(args: { data: FlowData, task: TaskConfig, sourceId: string, targetId: string, parameter: string }) {
		const { data, task, sourceId, targetId, parameter } = args;
		console.log("Removing task connection");
		console.log(`sourceId: ${sourceId}, targetId: ${targetId}, parameter: ${parameter}`);
		console.log(task);
		const sourceObj = this.getObjectById(data, sourceId);
		const targetObj = this.getObjectById(data, targetId);

		if (parameter === "defaultChannel") {
			task.defaultChannel = undefined;
		} else if (parameter === "tracker") {
			task.tracker = undefined;
		} else if (parameter === "inputs" && task.inputs) {
			if (Array.isArray(task.inputs[sourceId])) {
				task.inputs[sourceId] = (task.inputs[sourceId] as string[]).filter((i) => i !== targetId);
			} else if (typeof task.inputs[sourceId] === "string" && task.inputs[sourceId] === targetId) {
				delete task.inputs[sourceId];
			}
		} else if (parameter === "outputs") {
			task.outputs = task.outputs?.filter((o) => o !== targetId);
		} else if (parameter === "tools") {
			let name = sourceId;
			if (sourceObj) {
				name = sourceObj.name;
			}
			if (task.tools) {
				task.tools = task.tools.filter((t) => t.id !== sourceId && t.name !== name);
			}
		} else if (parameter === "triggers") {
			let name = sourceId;
			if (sourceObj) {
				name = sourceObj.name;
			}
			task.triggers = task.triggers?.filter((t) => t !== sourceId && t !== name);
		} else if (parameter === "documentation") {
			let name = sourceId;
			if (sourceObj) {
				name = sourceObj.name;
			}
			task.documentation = task.documentation?.filter((d) => d !== sourceId && d !== name);

		} else if (parameter === "subtasks") {
			task.subtasks = task.subtasks?.filter((s) => s.name !== targetId && s.id !== targetId);
		} else if (task.inputs && task.inputs[parameter]) {
			let sourceName = sourceId;
			const resource = data.flow.resources?.find((r) => r.id === sourceId || r.name === sourceId);
			if (resource) {
				sourceName = resource.name;
			}
			const channel = data.flow.channels?.find((c) => c.id === sourceId || c.name === sourceId);
			if (channel) {
				sourceName = channel.name;
			}
			if (Array.isArray(task.inputs[parameter])) {
				task.inputs[parameter] = (task.inputs[parameter] as string[]).filter((i) => i !== sourceName && i !== sourceId);
				if (task.inputs[parameter].length === 1) {
					task.inputs[parameter] = task.inputs[parameter][0];
				}
			} else if (typeof task.inputs[parameter] === "string" && task.inputs[parameter] === sourceName || task.inputs[parameter] === sourceId) {
				delete task.inputs[parameter];
			}
		}
	}

	static addToolReferenceConnection(
		flow: FlowData,
		toolReference: ToolReference,
		sourceId: string,
		targetId: string,
		parameter: string
	): boolean {
		if (parameter === "output") {
			const obj = this.getObjectById(flow, targetId);
			if (obj) {
				toolReference.output = targetId;
				return true;
			}
		}
		return false;
	}

	static removeToolReferenceConnection(tool: ToolReference, sourceId: string, targetId: string, parameter: string) {
		if (parameter === "output") {
			tool.output = undefined;
		}
	}

	static addToolConnection(
		data: FlowData,
		tool: ToolConfig,
		sourceId: string,
		targetId: string,
		parameter: string
	): boolean {
		if (parameter === "channel") {
			const channel = data.flow.channels?.find((c) => c.name === sourceId || c.id === sourceId);
			if (channel) {
				tool.channel = sourceId;
				return true;
			}
		}
		return false;
	}

	static removeToolConnection(tool: ToolConfig, sourceId: string, targetId: string, parameter: string) {
		if (parameter === "channel") {
			tool.channel = undefined;
		}
	}

	static removeTrackerConnection(tracker: TrackerConfig, sourceId: string, targetId: string, parameter: string) {
		if (parameter === "credential") {
			tracker.credential = undefined;
		}
	}

	static renameNode(data: FlowData, oldName: string, newName: string, objectType: ObjectType) {
		while (this.getObjectTypeByName(data, newName, objectType) !== undefined) {
			newName = incrementString(newName);
			console.log(`Renaming ${oldName} to ${newName}`);
		}
		if (objectType === "channel" && data.flow.channels) {
			const channel = data.flow.channels.find((c) => c.name === oldName);
			if (channel) {
				channel.name = newName;
				this.updateTaskRefs(data, "channel", oldName, newName);
				this.updateToolRefs(data, oldName, newName);
			}
		}
		if (objectType === "documentation" && data.flow.documentation) {
			const documentation = data.flow.documentation.find((d) => d.name === oldName);
			if (documentation) {
				documentation.name = newName;
				this.updateTaskRefs(data, "documentation", oldName, newName);
			}
		}
		if (objectType === "resource" && data.flow.resources) {
			const resource = data.flow.resources.find((r) => r.name === oldName);
			if (resource) {
				resource.name = newName;
				this.updateTaskRefs(data, "resource", oldName, newName);
			}
		}
		if (objectType === "task" && data.flow.tasks) {
			const task = data.flow.tasks.find((t) => t.name === oldName);
			if (task) {
				task.name = newName;
				this.updateTaskRefs(data, "task", oldName, newName);
			}
		}
		if (objectType === "tool" && data.flow.tools) {
			const tool = data.flow.tools.find((t) => t.name === oldName);
			if (tool) {
				tool.name = newName;
				this.updateTaskRefs(data, "tool", oldName, newName);
			}
		}
		if (objectType === "tracker" && data.flow.trackers) {
			const tracker = data.flow.trackers.find((t) => t.name === oldName);
			if (tracker) {
				tracker.name = newName;
				this.updateTaskRefs(data, "tracker", oldName, newName);
			}
		}
	}

	static getFlowData(flow: FlowConfig, credentials: CredentialConfig[]): FlowData {
		const flowData: FlowData = {
			flow: flow,
		};
		const newCredentials: CredentialConfig[] = [];
		if (flow.resources) {
			for (const resource of flow.resources) {
				if (resource.credential) {
					const credential = credentials.find((c) => c.name === resource.credential || c.id === resource.credential);
					if (credential) {
						newCredentials.push(credential);
					}
				}
			}
		}
		if (flow.channels) {
			for (const channel of flow.channels) {
				if (channel.credential) {
					const credential = credentials.find((c) => c.name === channel.credential || c.id === channel.credential);
					if (credential) {
						newCredentials.push(credential);
					}
				}
			}
		}
		if (flow.documentation) {
			for (const doc of flow.documentation) {
				if (doc.credential) {
					const credential = credentials.find((c) => c.name === doc.credential || c.id === doc.credential);
					if (credential) {
						newCredentials.push(credential);
					}
				}
			}
		}
		if (flow.tools) {
			for (const tool of flow.tools) {
				if (tool.credential) {
					const credential = credentials.find((c) => c.name === tool.credential || c.id === tool.credential);
					if (credential) {
						newCredentials.push(credential);
					}
				}
			}
		}
		if (flow.trackers) {
			for (const tracker of flow.trackers) {
				if (tracker.credential) {
					const credential = credentials.find((c) => c.name === tracker.credential || c.id === tracker.credential);
					if (credential) {
						newCredentials.push(credential);
					}
				}
			}
		}
		flowData.credentials = newCredentials;
		return flowData;
	}
}
