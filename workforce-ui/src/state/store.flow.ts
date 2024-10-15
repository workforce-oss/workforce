import _, { throttle } from "lodash";
import {
	Connection,
	Edge,
	EdgeChange,
	Node,
	NodeChange,
	OnConnect,
	OnEdgesChange,
	OnNodesChange,
	addEdge,
	applyEdgeChanges,
	applyNodeChanges,
} from "reactflow";
import { v4 as uuidv4 } from "uuid";
import { ObjectSubtype, ObjectType, BaseConfig, TaskConfig, CredentialConfig } from "workforce-core/model";
import { temporal } from "zundo";
import { FlowData } from "../manager/flow_data";
import { FlowManager } from "../manager/flow_manager";
import { CustomNodeData } from "../nodes/nodeData";
import { NewObjectNode } from "../nodes/nodes";
import { createEdge, getHandleIdData, incrementString } from "../util/util";

export type RFState = {
	nodes: Node<CustomNodeData<BaseConfig>>[];
	edges: Edge[];
	flowData: FlowData;
	renameFlow: (name: string) => void;
	onNodesChange: OnNodesChange;
	onEdgesChange: OnEdgesChange;
	onConnect: OnConnect;
	addNode: (node: Node) => void;
	removeNode: (nodeId: string) => void;
	duplicateNode: (nodeId: string) => void;
	addNodeType(orgId: string, type: ObjectType, subtype: ObjectSubtype, position: { x: number; y: number }): void;
	updateNodeVariables: (nodeId: string, variables: Record<string, any>) => void;
	updateNodeCredential: (nodeId: string, credential: string) => void;
	updateNodeData: (nodeId: string, data: any) => void;
	renameNode: (nodeId: string, name: string) => void;
	addInputToTask: (nodeId: string, name: string) => void;
	removeInputFromTask: (nodeId: string, name: string) => void;
	updateInputForTask: (nodeId: string, oldName: string, newName: string) => void;
	getCredentialsForType: (type: ObjectSubtype) => CredentialConfig[];
	addCredential: (credential: CredentialConfig) => void;
	updateCredential: (credential: CredentialConfig) => void;
	removeCredential: (credential: CredentialConfig) => void;
	updateFlowState: (active: boolean) => void;
};

export const flowState = (flowData: FlowData) => {
	const nodes = FlowManager.createNodes(flowData);
	const edges = FlowManager.createEdges(flowData);
	FlowManager.createDefaultLayout(nodes, edges);
	return temporal(
		(set, get: () => RFState) => ({
			nodes: nodes,
			edges: edges,
			flowData: flowData,
			renameFlow: (name: string) => {
				set({
					flowData: {
						...get().flowData,
						flow: {
							...get().flowData.flow,
							name: name,
						},
					},
				});
			},
			onNodesChange: (changes: NodeChange[]) => {
				let newFlow: FlowData = undefined;
				for (const change of changes) {
					if (change.type === "add" && change.item.data.config.type === "credential") {
						get().addCredential(change.item.data.config);

					} else if (change.type === "add") {
						newFlow = _.cloneDeep(get().flowData);
						FlowManager.addObject(newFlow, change.item.data.config);
					} else if (change.type === "remove") {
						newFlow = _.cloneDeep(get().flowData);
						const node = get().nodes.find((node) => node.id === change.id);
						if (node.data.config.type === "credential") {
							get().removeCredential(node.data.config as CredentialConfig);
						} else {
							FlowManager.removeObject(newFlow, (node.data.config as any).name);
						}
					}
				}
				set({
					nodes: applyNodeChanges(changes, get().nodes),
					flowData: newFlow ?? get().flowData,
				});
			},
			onEdgesChange: (changes: EdgeChange[]) => {
				const newFlow = _.cloneDeep(get().flowData);
				const edgeIds = get().edges.map((edge) => edge.id);
				//log each edgeId on its own line
				console.log(edgeIds.join("\n"));
				for (const change of changes) {
					if (change.type === "remove") {
						console.log(change.id);
						const sourceHandleData = getHandleIdData(
							get().edges.find((edge) => edge.id === change.id)?.sourceHandle
						);
						const targetHandleData = getHandleIdData(
							get().edges.find((edge) => edge.id === change.id)?.targetHandle
						);
						if (!sourceHandleData || !targetHandleData) {
							console.log(`Failed to remove connection ${change.id}`);
							continue;
						}
						console.log("Removing connection", sourceHandleData, targetHandleData);
						FlowManager.removeConnection(
							newFlow,
							sourceHandleData.nodeId,
							sourceHandleData.parameter,
							targetHandleData.nodeId,
							targetHandleData.parameter
						);
					}
				}
				set({
					edges: applyEdgeChanges(changes, get().edges),
					flowData: newFlow,
				});
			},
			onConnect: (connection: Connection) => {
				if (connection.sourceHandle === undefined || connection.targetHandle === undefined) {
					return;
				}
				const newFlow = _.cloneDeep(get().flowData);

				const sourceHandleData = getHandleIdData(connection.sourceHandle);
				const targetHandleData = getHandleIdData(connection.targetHandle);
				if (!sourceHandleData || !targetHandleData) {
					console.log(
						`Error getting handle data. Failed to connect ${connection.source} to ${connection.target}`
					);
					return;
				}
				console.log(
					`Connecting ${sourceHandleData.nodeId} ${sourceHandleData.parameter} to ${targetHandleData.nodeId} ${targetHandleData.parameter}`
				);
				const sourceNode = get().nodes.find((node) => node.id === sourceHandleData.nodeId);
				const targetNode = get().nodes.find((node) => node.id === targetHandleData.nodeId);

				if (!sourceNode || !targetNode) {
					console.log(
						`Error finding nodes. Failed to connect ${sourceHandleData.nodeId} ${sourceHandleData.parameter} to ${targetHandleData.nodeId} ${targetHandleData.parameter}`
					);
					return;
				}
				let result = false;

				result = FlowManager.addConnection(
					newFlow,
					(sourceNode.data.config as BaseConfig).name,
					sourceHandleData.parameter,
					(targetNode.data.config as BaseConfig).name,
					targetHandleData.parameter,
					targetHandleData.type === "taskInput"
				);


				if (!result) {
					console.log(
						`Error adding connection. Failed to connect ${sourceHandleData.nodeId} ${sourceHandleData.parameter} to ${targetHandleData.nodeId} ${targetHandleData.parameter}`
					);
					return;
				}
				set({
					edges: addEdge(connection, get().edges),
					flowData: newFlow,
				});
			},
			addNode: (node: Node) => {
				get().onNodesChange([{ type: "add", item: node }]);
			},
			removeNode: (nodeId: string) => {
				get().onNodesChange([{ type: "remove", id: nodeId }]);
			},
			duplicateNode: (nodeId: string) => {
				const node = get().nodes.find((node) => node.id === nodeId);
				const data = _.cloneDeep(node.data);
				const newId = uuidv4();
				data.config.id = newId;
				const newPosition = {
					x: node.position.x + 50,
					y: node.position.y + 50,
				};
				const cloned = {
					id: newId,
					type: node.type,
					position: newPosition,
					data: data,
				};

				get().onNodesChange([{ type: "add", item: cloned }]);
			},
			addNodeType: (
				orgId: string,
				type: ObjectType,
				subtype: ObjectSubtype,
				position: { x: number; y: number },
				data?: BaseConfig
			) => {
				try {
					const node = NewObjectNode(position, orgId, type, subtype as ObjectSubtype, data as BaseConfig);
					get().onNodesChange([{ type: "add", item: node }]);
				} catch (e) {
					console.error(e);
				}
			},
			updateNodeVariables: (nodeId: string, variables: Record<string, any>) => {
				const node = get().nodes.find((node) => node.id === nodeId);
				const config = FlowManager.getObjectByName(get().flowData, (node.data.config as BaseConfig).name);
				const clonedConfig = _.cloneDeep(config);
				if (node) {
					const cloned = _.cloneDeep(node);
					cloned.data.config = clonedConfig;
					cloned.data.config.variables = variables;
					const flow = _.cloneDeep(get().flowData);
					FlowManager.updateObject(flow, cloned.data.config);
					const index = get().nodes.findIndex((node) => node.id === nodeId);
					set({
						nodes: [...get().nodes.slice(0, index), cloned, ...get().nodes.slice(index + 1)],
						flowData: { ...flow },
					});
				}
			},
			updateNodeCredential: (nodeId: string, credential: string) => {
				const node = get().nodes.find((node) => node.id === nodeId);
				const config = FlowManager.getObjectByName(get().flowData, (node.data.config as BaseConfig).name);
				const clonedConfig = _.cloneDeep(config);
				if (node) {
					const cloned = _.cloneDeep(node);
					cloned.data.config = clonedConfig;
					cloned.data.config.credential = credential;
					const flow = _.cloneDeep(get().flowData);
					FlowManager.updateObject(flow, cloned.data.config);
					const index = get().nodes.findIndex((node) => node.id === nodeId);
					set({
						nodes: [...get().nodes.slice(0, index), cloned, ...get().nodes.slice(index + 1)],
						flowData: { ...flow },
					});
				}
			},
			updateNodeData: (nodeId: string, data: any) => {
				console.log(`Updating node ${nodeId} with data ${JSON.stringify(data)}`);
				const node = get().nodes.find((node) => node.id === nodeId);
				console.log(`Found node ${JSON.stringify(node)}`);
				if (node) {
					const cloned = _.cloneDeep(node);
					cloned.data = data;
					const flow = _.cloneDeep(get().flowData);

					FlowManager.updateObject(flow, (cloned.data.config as BaseConfig));

					const index = get().nodes.findIndex((node) => node.id === nodeId);
					set({
						nodes: [...get().nodes.slice(0, index), cloned, ...get().nodes.slice(index + 1)],
						flowData: { ...flow },
					});
				}
			},
			renameNode: (nodeId: string, name: string) => {
				const node = get().nodes.find((node) => node.id === nodeId);
				const flow = _.cloneDeep(get().flowData);
				if (node) {
					const cloned = _.cloneDeep(node);
					const oldName = (cloned.data.config as BaseConfig).name;
					(cloned.data.config as BaseConfig).name = name;
					FlowManager.renameNode(flow, oldName, name);
					
					const index = get().nodes.findIndex((node) => node.id === nodeId);

					set({
						nodes: [...get().nodes.slice(0, index), cloned, ...get().nodes.slice(index + 1)],
						flowData: flow,
					});
				}
			},

			addInputToTask: (nodeId: string, name: string) => {
				const node = get().nodes.find((node) => node.id === nodeId);

				const config = FlowManager.getObjectByName(get().flowData, (node.data.config as BaseConfig).name);
				const clonedConfig = _.cloneDeep(config) as TaskConfig;

				if (node && node.data.config.type === "task") {
					console.log(`Adding input ${name} to task ${nodeId}`);
					const cloned = _.cloneDeep(node) as Node<CustomNodeData<TaskConfig>>;
					cloned.data.config = clonedConfig;
					if (!cloned.data.config.inputs) {
						console.log(`Creating inputs for task ${nodeId}`);
						cloned.data.config.inputs = {} as Record<string, any>;
					}
					while (cloned.data.config.inputs[name] !== undefined) {
						console.log(`Input ${name} already exists, incrementing`);
						name = incrementString(name);
					}
					cloned.data.config.inputs[name] = "";
					get().updateNodeData(nodeId, cloned.data);
				}
			},

			updateInputForTask: (nodeId: string, oldName: string, newName: string) => {
				if (oldName === newName) {
					console.error(`Old name and new name are the same: ${oldName}`);
					return;
					// } else if (newName === "") {
					// 	console.error(`New name is empty`);
					// 	return;
				} else {
					console.log(`Updating input ${oldName} to ${newName}`);
				}
				const node = get().nodes.find((node) => node.id === nodeId);

				const flow = _.cloneDeep(get().flowData);
				const config = FlowManager.getObjectByName(get().flowData, (node.data.config as BaseConfig).name);
				const clonedConfig = _.cloneDeep(config) as TaskConfig;

				if (node && node.data.config.type === "task") {
					const cloned = _.cloneDeep(node) as Node<CustomNodeData<TaskConfig>>;
					cloned.data.config = clonedConfig;
					if (!cloned.data.config.inputs) {
						cloned.data.config.inputs = {} as Record<string, string | string[]>;
					}
					if (cloned.data.config.inputs[newName]) {
						newName = incrementString(newName);
					}

					let sourceIds: string[] = [];
					if (cloned.data.config.inputs[oldName]) {
						if (Array.isArray(cloned.data.config.inputs[oldName])) {
							sourceIds = cloned.data.config.inputs[oldName] as string[];
						} else {
							sourceIds = [cloned.data.config.inputs[oldName] as string];
						}
					}



					cloned.data.renameTaskInputProperty(oldName, newName);
					FlowManager.removeObject(flow, cloned.data.config.name);
					FlowManager.addObject(flow, cloned.data.config);
					FlowManager.removeConnection(flow, "", "", clonedConfig.id, oldName);
					const edgeChanges: EdgeChange[] = [];
					for (const sourceId of sourceIds) {
						FlowManager.addTaskConnection(flow, clonedConfig, sourceId, clonedConfig.id, newName, true);
						const sourceNode = get().nodes.find((node) => node.data.config.id === sourceId || (node.data.config as BaseConfig).name === sourceId);
						if (sourceNode) {
							let sourceParam = "";
							if (sourceNode.data.config.type === "resource") {
								sourceParam = "data";
							} else if (sourceNode.data.config.type === "channel") {
								sourceParam = "ref";
							} else if (sourceNode.data.config.type === "tracker") {
								sourceParam = "ticket";
							} else if (sourceNode.data.config.type === "tool") {
								sourceParam = "output";
							}

							edgeChanges.push(
								{
									type: "remove",
									id: createEdge(sourceNode.data.config.id, sourceParam, clonedConfig.id, oldName, "taskInput").id,
								},
								{
									type: "add",
									item: createEdge(sourceNode.data.config.id, sourceParam, clonedConfig.id, newName, "taskInput"),
								}
							);
						}
					}

					const index = get().nodes.findIndex((node) => node.id === nodeId);
					set({
						nodes: [...get().nodes.slice(0, index), cloned, ...get().nodes.slice(index + 1)],
						flowData: flow,
					});
					get().onEdgesChange(edgeChanges);
				} else {
					console.error(`Failed to find node ${nodeId}`);
				}
			},

			removeInputFromTask: (nodeId: string, name: string) => {
				const node = get().nodes.find((node) => node.id === nodeId);

				const flow = _.cloneDeep(get().flowData);
				if (node) {
					const cloned = _.cloneDeep(node) as Node<CustomNodeData<TaskConfig>>;
					if (!cloned.data.config.inputs) {
						cloned.data.config.inputs = {} as Record<string, any>;
					}
					let sourceIds: string[] = [];
					if (cloned.data.config.inputs[name]) {
						if (Array.isArray(cloned.data.config.inputs[name])) {
							sourceIds = cloned.data.config.inputs[name] as string[];
						} else {
							sourceIds = [cloned.data.config.inputs[name] as string];
						}
					}
					delete cloned.data.config.inputs[name];
					FlowManager.removeObject(flow, cloned.data.config.name);
					FlowManager.addObject(flow, cloned.data.config);
					FlowManager.removeConnection(flow, "", "", cloned.data.config.id, name);
					const index = get().nodes.findIndex((node) => node.id === nodeId);
					const edgeChanges: EdgeChange[] = [];
					for (const sourceId of sourceIds) {
						const sourceNode = get().nodes.find((node) => node.data.config.id === sourceId || (node.data.config as BaseConfig).name === sourceId);
						if (sourceNode) {
							let sourceParam = "";
							if (sourceNode.data.config.type === "resource") {
								sourceParam = "data";
							} else if (sourceNode.data.config.type === "channel") {
								sourceParam = "ref";
							} else if (sourceNode.data.config.type === "tracker") {
								sourceParam = "ticket";
							} else if (sourceNode.data.config.type === "tool") {
								sourceParam = "output";
							}
							edgeChanges.push({
								type: "remove",
								id: createEdge(sourceId, sourceParam, cloned.data.config.id, name, "taskInput").id,
							});
						}
					}

					set({
						nodes: [...get().nodes.slice(0, index), cloned, ...get().nodes.slice(index + 1)],
						flowData: flow,
					});
					get().onEdgesChange(edgeChanges);
				}
			},
			addCredential: (credential: CredentialConfig) => {
				const existing = get().flowData.credentials?.find((c) => c.name === credential.name);
				if (existing) {
					return;
				}

				set({
					flowData: {
						...get().flowData,
						credentials: [...(get().flowData.credentials ?? []), credential],
					},
				});
			},
			updateCredential: (credential: CredentialConfig) => {
				const existing = get().flowData.credentials?.find((c) => c.name === credential.name);
				if (!existing) {
					get().addCredential(credential);
					return;
				}
				set({
					flowData: {
						...get().flowData,
						credentials: (get().flowData.credentials ?? []).map((c) => {
							if (c.name === credential.name) {
								return credential;
							}
							return c;
						}),
					},
				});
			},
			removeCredential: (credential: CredentialConfig) => {
				set({
					flowData: {
						...get().flowData,
						credentials: (get().flowData.credentials ?? []).filter((c) => c.name !== credential.name),
					},
				});
			},
			getCredentialsForType: (type: ObjectSubtype) => {
				return (get().flowData.credentials ?? []).filter((c) => c.subtype === type);
			},
			setCredentials: (credentials: CredentialConfig[]) => {
				set({
					flowData: {
						...get().flowData,
						credentials: credentials,
					},
				});
			},
			updateFlowState: (active: boolean) => {
				set({
					flowData: {
						...get().flowData,
						flow: {
							...get().flowData.flow,
							status: active ? "active" : "inactive",
						},
					},
				});
			},
		}),
		{
			handleSet: (handleSet) =>
				throttle<typeof handleSet>((state) => {
					handleSet(state);
				}, 500),
			equality: (current, previous) => {
				const currentClone = _.cloneDeep(current);
				const previousClone = _.cloneDeep(previous);
				currentClone?.nodes.forEach((node) => {
					delete node.selected;
				});
				previousClone?.nodes.forEach((node) => {
					delete node.selected;
				});
				return _.isEqual(currentClone, previousClone);
			},
		}
	);
};
