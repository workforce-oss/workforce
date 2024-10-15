import dagre from "dagre";
import * as _ from "lodash";
import { Edge, Node } from "reactflow";
import { v4 as uuidv4 } from "uuid";
import { BaseConfig, ObjectType, ChannelConfig, CredentialConfig, DocumentationConfig, FlowConfig, ResourceConfig, TaskConfig, ToolReference, ToolConfig, TrackerConfig } from "workforce-core/model";
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
				channel.subtype = channel.subtype ?? (channel.type as any);
				channel.type = "channel";
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
				doc.subtype = doc.subtype ?? (doc.type as any);
				doc.type = "documentation";
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
				resource.subtype = resource.subtype ?? (resource.type as any);
				resource.type = "resource";
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
				tool.subtype = tool.subtype ?? (tool.type as any);
				tool.type = "tool";
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
				tracker.subtype = tracker.subtype ?? (tracker.type as any);
				tracker.type = "tracker";
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
				task.subtype = task.subtype ?? (task.type as any);
				task.type = "task";
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
						const obj = this.getObjectTypeByName(data, ref, "documentation");
						const sourceId = obj?.id ?? ref;
						const sourceParameter = "ref";
						edges.push(createEdge(sourceId, sourceParameter, task.id, "documentation", "input"));
					}
				}
				if (task.defaultChannel) {
					const obj = this.getObjectTypeByName(data, task.defaultChannel, "channel");
					const sourceId = obj?.id ?? task.defaultChannel;
					const sourceParameter = "ref";
					edges.push(createEdge(sourceId, sourceParameter, task.id, "defaultChannel", "input"));
				}
				if (task.tracker) {
					const obj = this.getObjectTypeByName(data, task.tracker, "tracker");
					const sourceId = obj?.id ?? task.tracker;
					const sourceParameter = "ticket";
					edges.push(createEdge(sourceId, sourceParameter, task.id, "tracker", "input"));
				}
				if (task.tools) {
					for (const tool of task.tools) {
						const obj = this.getObjectTypeByName(data, tool.name, "tool");
						const sourceId = obj?.id ?? tool.id;
						const sourceParameter = "ref";
						edges.push(createEdge(sourceId, sourceParameter, task.id, "tools", "input"));
						if (obj && tool.output) {
							const targetObj = this.getObjectByName(data, tool.output);
							const targetId = targetObj?.id ?? tool.output;
							const targetParameter = "in";
							edges.push(createEdge(tool.id, "output", targetId, targetParameter, "input"));
						}
					}
				}
				if (task.triggers) {
					for (const trigger of task.triggers) {
						const obj = this.getObjectByName(data, trigger);
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
								const obj = this.getObjectByName(data, inputObj);
								objs.push(obj?.id ?? inputObj);
							}
						} else {
							const obj = this.getObjectByName(data, task.inputs[input] as string);
							objs.push(obj?.id ?? task.inputs[input]);
						}
						const ids = objs.map((obj) => obj?.id ?? obj);
						// deduplicate
						objs = objs.filter((obj, index) => ids.indexOf(obj?.id ?? obj) === index);
						for (const obj of objs) {
							edges.push(createEdge(obj, "output", task.id, input, "taskInput"));
							const sourceId = obj?.id ?? task.inputs[input];
							console.log("Creating task input edge");
							console.log(task);
							console.log(input);
							console.log(obj);
							let sourceParameter = "output";
							if (obj?.type === "channel") {
								sourceParameter = "ref";
							} else if (obj?.type === "resource") {
								sourceParameter = "data";
							} else if (obj?.type === "tracker") {
								sourceParameter = "ticket";
							}
							edges.push(createEdge(sourceId, sourceParameter, task.id, input, "taskInput"));
						}
					}
				}
				if (task.outputs) {
					for (const output of task.outputs) {
						const obj = this.getObjectByName(data, output);
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
				width: (nodeDimensions.get(node.data.config.type)?.width ?? nodeWidth) + node.data.config.name.length * 10,
				height: (nodeDimensions.get(node.data.config.type)?.height ?? nodeHeight),
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

	static convertToYaml(flow: FlowConfig): string {
		const flowCopy = _.cloneDeep(flow);
		flowCopy.orgId = undefined;
		flowCopy.id = undefined;
		for (const task of flowCopy.tasks ?? []) {
			task.flowId = undefined;
			task.orgId = undefined;
			task.id = undefined;
			task.type = task.subtype as any;
			task.subtype = undefined;
			for (const tool of task.tools ?? []) {
				tool.id = undefined;
			}
			for (const subtask of task.subtasks ?? []) {
				subtask.id = undefined;
			}
		}
		for (const channel of flowCopy.channels ?? []) {
			channel.flowId = undefined;
			channel.orgId = undefined;
			channel.id = undefined;
			channel.type = channel.subtype as any;
			channel.subtype = undefined;
		}
		for (const documentation of flowCopy.documentation ?? []) {
			documentation.flowId = undefined;
			documentation.orgId = undefined;
			documentation.id = undefined;
			documentation.type = documentation.subtype as any;
			documentation.subtype = undefined;
		}
		for (const resource of flowCopy.resources ?? []) {
			resource.flowId = undefined;
			resource.orgId = undefined;
			resource.id = undefined;
			resource.type = resource.subtype as any;
			resource.subtype = undefined;
		}
		for (const tool of flowCopy.tools ?? []) {
			tool.flowId = undefined;
			tool.orgId = undefined;
			tool.id = undefined;
			tool.type = tool.subtype as any;
			tool.subtype = undefined;
		}
		for (const tracker of flowCopy.trackers ?? []) {
			tracker.flowId = undefined;
			tracker.orgId = undefined;
			tracker.id = undefined;
			tracker.type = tracker.subtype as any;
			tracker.subtype = undefined;
		}

		return YAML.stringify(flowCopy, {
			keepUndefined: false,
		});
	}
	static convertFromYaml(yaml: string): FlowConfig {
		const data = YAML.parse(yaml, {
			merge: true,
			schema: "core",
			prettyErrors: true,
		}) as FlowConfig;
		return data;
	}

	static getObjectTypeByName(data: FlowData, name: string, type: string): BaseConfig | undefined {
		if (type === "channel") {
			return data.flow.channels?.find((c) => c.name === name || c.id === name);
		} else if (type === "documentation") {
			return data.flow.documentation?.find((d) => d.name === name || d.id === name);
		} else if (type === "resource") {
			return data.flow.resources?.find((r) => r.name === name || r.id === name);
		} else if (type === "task") {
			return data.flow.tasks?.find((t) => t.name === name || t.id === name);
		} else if (type === "tool") {
			return data.flow.tools?.find((t) => t.name === name || t.id === name);
		} else if (type === "tracker") {
			return data.flow.trackers?.find((t) => t.name === name || t.id === name);
		}
	}

	static getObjectByName(data: FlowData, name: string): BaseConfig | undefined {
		if (data.flow.channels) {
			const channel = data.flow.channels.find((c) => c.name === name || c.id === name);
			if (channel) {
				return channel;
			}
		}
		if (data.flow.documentation) {
			const documentation = data.flow.documentation.find((d) => d.name === name || d.id === name);
			if (documentation) {
				return documentation;
			}
		}
		if (data.flow.resources) {
			const resource = data.flow.resources.find((r) => r.name === name || r.id === name);
			if (resource) {
				return resource;
			}
		}
		if (data.flow.tasks) {
			const task = data.flow.tasks.find((t) => t.name === name || t.id === name);
			if (task) {
				return task;
			}
		}
		if (data.flow.tools) {
			const tool = data.flow.tools.find((t) => t.name === name || t.id === name);
			if (tool) {
				return tool;
			}
		}
		if (data.flow.trackers) {
			const tracker = data.flow.trackers.find((t) => t.name === name || t.id === name);
			if (tracker) {
				return tracker;
			}
		}

		return undefined;
	}


	static addObject<T extends BaseConfig>(data: FlowData, obj: T) {
		if (obj.type === "channel") {
			if (!data.flow.channels) {
				data.flow.channels = [];
			}
			while (data.flow.channels.find((c) => c.name === obj.name)) {
				obj.name = incrementString(obj.name);
			}
			data.flow.channels.push(obj as ChannelConfig);
		} else if (obj.type === "documentation") {
			if (!data.flow.documentation) {
				data.flow.documentation = [];
			}
			while (data.flow.documentation.find((d) => d.name === obj.name)) {
				obj.name = incrementString(obj.name);
			}
			data.flow.documentation.push(obj as DocumentationConfig);
		} else if (obj.type === "resource") {
			if (!data.flow.resources) {
				data.flow.resources = [];
			}
			while (data.flow.resources.find((r) => r.name === obj.name)) {
				obj.name = incrementString(obj.name);
			}
			data.flow.resources.push(obj as ResourceConfig);
		} else if (obj.type === "task") {
			if (!data.flow.tasks) {
				data.flow.tasks = [];
			}
			while (data.flow.tasks.find((t) => t.name === obj.name)) {
				obj.name = incrementString(obj.name);
			}
			data.flow.tasks.push(obj as TaskConfig);
		} else if (obj.type === "tool") {
			if (!data.flow.tools) {
				data.flow.tools = [];
			}
			while (data.flow.tools.find((t) => t.name === obj.name)) {
				obj.name = incrementString(obj.name);
			}
			data.flow.tools.push(obj as ToolConfig);
		} else if (obj.type === "tracker") {
			if (!data.flow.trackers) {
				data.flow.trackers = [];
			}
			while (data.flow.trackers.find((t) => t.name === obj.name)) {
				obj.name = incrementString(obj.name);
			}
			data.flow.trackers.push(obj as TrackerConfig);
		} else {
			console.error(`addObject() unknown object type ${obj.type}`);
		}
	}




	static removeObject(data: FlowData, name: string) {
		if (data.flow.channels && data.flow.channels.find((c) => c.name === name || c.id === name)) {
			data.flow.channels = data.flow.channels.filter((c) => c.name !== name && c.id !== name);
			this.removeTaskRefs(data, "channel", name);
			this.removeToolRefs(data, name);
		} else if (data.flow.documentation && data.flow.documentation.find((d) => d.name === name || d.id === name)) {
			data.flow.documentation = data.flow.documentation.filter((d) => d.name !== name && d.id !== name);
			this.removeTaskRefs(data, "documentation", name);
		} else if (data.flow.resources && data.flow.resources.find((r) => r.name === name || r.id === name)) {
			data.flow.resources = data.flow.resources.filter((r) => r.name !== name && r.id !== name);
			this.removeTaskRefs(data, "resource", name);
		} else if (data.flow.tasks && data.flow.tasks.find((t) => t.name === name || t.id === name)) {
			data.flow.tasks = data.flow.tasks.filter((t) => t.name !== name && t.id !== name);
			this.removeTaskRefs(data, "task", name);
		} else if (data.flow.tools && data.flow.tools.find((t) => t.name === name || t.id === name)) {
			data.flow.tools = data.flow.tools.filter((t) => t.name !== name && t.id !== name);
			this.removeTaskRefs(data, "tool", name);
		} else if (data.flow.trackers && data.flow.trackers.find((t) => t.name === name || t.id === name)) {
			data.flow.trackers = data.flow.trackers.filter((t) => t.name !== name && t.id !== name);
			this.removeTaskRefs(data, "tracker", name);
		} else {
			console.error(`removeObject() could not find object ${name}`);
		}
	}

	static updateObject(data: FlowData, obj: BaseConfig) {
		if (obj.type === "channel") {
			const channel = data.flow.channels?.find((c) => c.name === obj.name || c.id === obj.id);
			if (channel) {
				Object.assign(channel, obj);
			}
		} else if (obj.type === "documentation") {
			const documentation = data.flow.documentation?.find((d) => d.name === obj.name || d.id === obj.id);
			if (documentation) {
				Object.assign(documentation, obj);
			}
		} else if (obj.type === "resource") {
			const resource = data.flow.resources?.find((r) => r.name === obj.name || r.id === obj.id);
			if (resource) {
				Object.assign(resource, obj);
			}
		} else if (obj.type === "task") {
			const task = data.flow.tasks?.find((t) => t.name === obj.name || t.id === obj.id);
			if (task) {
				Object.assign(task, obj);
			}
		} else if (obj.type === "tool") {
			const tool = data.flow.tools?.find((t) => t.name === obj.name || t.id === obj.id);
			if (tool) {
				Object.assign(tool, obj);
			}
		} else if (obj.type === "tracker") {
			const tracker = data.flow.trackers?.find((t) => t.name === obj.name || t.id === obj.id);
			if (tracker) {
				Object.assign(tracker, obj);
			}
		} else {
			console.error(`updateObject() unknown object type ${obj.type}`);
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
		const sourceObj = this.getObjectByName(data, sourceId);
		const targetObj = this.getObjectByName(data, targetId);

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
			task.outputs = task.outputs?.filter((o) => o !== targetId && o !== targetObj?.name);
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
			const obj = this.getObjectTypeByName(flow, targetId, "resource");
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

	static renameNode(data: FlowData, oldName: string, newName: string) {
		if (data.flow.channels) {
			const channel = data.flow.channels.find((c) => c.name === oldName || c.id === oldName);
			if (channel) {
				channel.name = newName;
				this.updateTaskRefs(data, "channel", oldName, newName);
				this.updateToolRefs(data, oldName, newName);
			}
		}
		if (data.flow.documentation) {
			const documentation = data.flow.documentation.find((d) => d.name === oldName || d.id === oldName);
			if (documentation) {
				documentation.name = newName;
				this.updateTaskRefs(data, "documentation", oldName, newName);
			}
		}
		if (data.flow.resources) {
			const resource = data.flow.resources.find((r) => r.name === oldName || r.id === oldName);
			if (resource) {
				resource.name = newName;
				this.updateTaskRefs(data, "resource", oldName, newName);
			}
		}
		if (data.flow.tasks) {
			const task = data.flow.tasks.find((t) => t.name === oldName || t.id === oldName);
			if (task) {
				task.name = newName;
				this.updateTaskRefs(data, "task", oldName, newName);
			}
		}
		if (data.flow.tools) {
			const tool = data.flow.tools.find((t) => t.name === oldName || t.id === oldName);
			if (tool) {
				tool.name = newName;
				this.updateTaskRefs(data, "tool", oldName, newName);
			}
		}
		if (data.flow.trackers) {
			const tracker = data.flow.trackers.find((t) => t.name === oldName || t.id === oldName);
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
