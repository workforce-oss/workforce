import { v4 as uuidv4 } from "uuid";
import { VariableSchemaValidationError, WorkerConfig, CredentialConfig, FlowConfig } from "workforce-core/model";
import { temporal } from "zundo";
import { create, StateCreator } from "zustand";
import { FlowManager } from "../manager/flow_manager";
import { RFState, flowState } from "./store.flow";
import { incrementString } from "../util/util";
import { WorkforceAPIClient } from "workforce-api-client";

export type MetaState = {
	ready: boolean;

	selectedFlow?: FlowConfig;
	selectFlow: (flow: FlowConfig) => void;

	chatActive: boolean;
	setChatActive: (active: boolean) => void;

	alertString: string;
	setAlert: (alert: string) => void;
	clearAlert: () => void;

	flows: FlowConfig[];
	addFlow: (orgId: string) => void;
	updateFlow: (flow: FlowConfig) => void;
	deleteFlow: (flow: FlowConfig) => void;
	renameFlow: (flow: FlowConfig, newName: string) => void;
	toggleFlowActive: (flow: FlowConfig) => void;
	saveFlow: (flow: FlowConfig) => void;

	credentials: CredentialConfig[];
	addCredential: (orgId: string) => void;
	updateCredential: (credential: CredentialConfig) => void;
	deleteCredential: (credential: CredentialConfig) => void;
	saveCredential: (credential: CredentialConfig) => void;

	workers: WorkerConfig[];
	addWorker: (orgId: string) => void;
	updateWorker: (worker: WorkerConfig) => void;
	deleteWorker: (worker: WorkerConfig) => void;
	saveWorker: (worker: WorkerConfig) => void;

	importData: (yaml: string, orgId: string) => void;
	hydrate: (data: FlowConfig[], orgId: string) => void;
};

export const flowStates = new Map<string, any>();

export const metaStore = create<MetaState>()(
	temporal((set, get: () => MetaState) => ({
		ready: false,
		selectedFlow: {
			id: "",
			name: "",
			description: "",
			orgId: "",
			status: "inactive",
		} as FlowConfig,

		selectFlow: (flow: FlowConfig) => {
			if (!flowStates.has(flow.id)) {
				return;
			}
			set({
				selectedFlow: flow,
			});
		},
		chatActive: false,
		setChatActive: (active: boolean) => {
			set({
				chatActive: active,
			});
		},
		alertString: "",
		setAlert: (alert: string) => {
			set({
				alertString: alert,
			});
		},
		clearAlert: () => {
			set({
				alertString: "",
			});
		},
		flows: [],
		addFlow: (orgId: string) => {
			const flow: FlowConfig = {
				id: uuidv4(),
				name: "New Flow",
				description: "New Flow",
				orgId,
				status: "inactive",
			};
			if (get().flows.find((f) => f.name === flow.name)) {
				flow.name = incrementString(flow.name);
			}
			WorkforceAPIClient.FlowAPI
				.create(flow, { orgId })
				.catch((e) => {
					console.error(e);
				})
				.then(() => {
					flowStates.set(flow.id, create<RFState>()(flowState({ flow: flow })));
					set({
						flows: [...get().flows, flow],
						selectedFlow: flow,
					});
				});
		},
		updateFlow: (flow: FlowConfig) => {
			console.log(`updateFlow() updating flow ${flow.name}`);
			set({
				flows: get().flows.map((f) => (f.name === flow.name ? flow : f)),
				selectedFlow: flow,
			});
		},
		deleteFlow: (flow: FlowConfig) => {
			if (!flowStates.has(flow.id)) {
				return;
			}
			flowStates.delete(flow.id);
			const newFlows = get().flows.filter((f) => f.id !== flow.id);
			if (newFlows.length === 0) {
				set({
					flows: newFlows,
					selectedFlow: {
						id: "",
						name: "",
						description: "",
						orgId: "",
						status: "inactive",
					} as FlowConfig,
				});
				return;
			}
			set({
				flows: get().flows.filter((f) => f.id !== flow.id),
				selectedFlow: newFlows[0],
			});
		},
		renameFlow: (flow: FlowConfig, newName: string) => {
			const selectedFlow = get().selectedFlow;
			if (selectedFlow.id === flow.id) {
				set({
					selectedFlow: { ...selectedFlow, name: newName },
				});
			}
			set({
				flows: get().flows.map((f) => (f.id === flow.id ? { ...f, name: newName } : f)),
			});

		},
		toggleFlowActive: (flow: FlowConfig) => {
			if (!flowStates.has(flow.id)) {
				return;
			}
			const newStatus = flow.status === "active" ? "inactive" : "active";
			WorkforceAPIClient.FlowAPI
				.update({ ...flow, status: newStatus }, flow.id, { orgId: flow.orgId })
				.catch((e) => {
					console.error(e);
				})
				.then(() => {
					set({
						flows: get().flows.map((f) => (f.id === flow.id ? { ...f, status: newStatus } : f)),
					});
				});
		},

		saveFlow: (flow: FlowConfig) => {
			WorkforceAPIClient.FlowAPI
				.create(flow, { orgId: flow.orgId })
				.then((response: FlowConfig | VariableSchemaValidationError[]) => {
					if (Array.isArray(response)) {
						const error = response.map((e) => e.message).join("\n");
						console.error(response);
						set({
							alertString: error,
						});
						return;
					}
					console.log(`saveFlow() created flow ${flow.name}`);
					set({
						alertString: "Flow saved",
					});
				})
				.catch((e) => {
					console.error(e);
					set({
						alertString: e.message,
					});
				});
		},
		credentials: [],
		addCredential: (orgId: string) => {
			const credential: CredentialConfig = {
				id: uuidv4(),
				name: "New Credential",
				description: "New Credential",
				orgId,
				type: "github-repo-resource",
				variables: {},
			};
			if (get().credentials.find((c) => c.name === credential.name)) {
				credential.name = incrementString(credential.name);
			}
			WorkforceAPIClient.CredentialAPI
				.create(credential, { orgId })
				.then((response: CredentialConfig | VariableSchemaValidationError[]) => {
					if (Array.isArray(response)) {
						const error = response.map((e) => e.message).join("\n");
						console.error(response);
						set({
							alertString: error,
						});
						return;
					}
					set({
						credentials: [...get().credentials, credential],
					});
				})
				.catch((e) => {
					console.error(e);
					set({
						alertString: e.message,
					});
				});
		},
		updateCredential: (credential: CredentialConfig) => {
			set({
				credentials: get().credentials.map((c) => (c.id === credential.id ? credential : c)),
			});
		},
		deleteCredential: (credential: CredentialConfig) => {
			WorkforceAPIClient.CredentialAPI
				.delete(credential.id, { orgId: credential.orgId })
				.then(() => {
					console.log(`deleteCredential() deleted credential ${credential.name}`);
					set({
						credentials: get().credentials.filter((c) => c.id !== credential.id),
					});
				})
				.catch((e) => {
					console.error(e);
					set({
						alertString: e.message,
					});
				});
		},
		saveCredential: (credential: CredentialConfig) => {
			WorkforceAPIClient.CredentialAPI
				.create(credential, { orgId: credential.orgId })
				.then((response: CredentialConfig | VariableSchemaValidationError[]) => {
					if (Array.isArray(response)) {
						const error = response.map((e) => e.message).join("\n");
						console.error(response);
						set({
							alertString: error,
						});
						return;
					}
					console.log(`saveCredential() created credential ${credential.name}`);
					set({
						alertString: "Credential saved",
					});
				})
				.catch((e) => {
					console.error(e);
					set({
						alertString: e.message,
					});
				});
		},
		workers: [],
		addWorker: (orgId: string) => {
			const worker: WorkerConfig = {
				id: uuidv4(),
				name: "New Worker",
				description: "New Worker",
				orgId,
				type: "ai-worker",
				variables: {},
			};
			if (get().workers.find((w) => w.name === worker.name)) {
				worker.name = incrementString(worker.name);
			}
			WorkforceAPIClient.WorkerAPI
				.create(worker, { orgId })
				.then((response: WorkerConfig | VariableSchemaValidationError[]) => {
					if (Array.isArray(response)) {
						const error = response.map((e) => e.message).join("\n");
						console.error(response);
						set({
							alertString: error,
						});
						return;
					}
					set({
						workers: [...get().workers, worker],
					});
				})
				.catch((e) => {
					console.error(e);
					set({
						alertString: e.message,
					});
				});
		},
		updateWorker: (worker: WorkerConfig) => {
			set({
				workers: get().workers.map((w) => (w.id === worker.id ? worker : w)),
			});
		},
		deleteWorker: (worker: WorkerConfig) => {
			WorkforceAPIClient.WorkerAPI
				.delete(worker.id, { orgId: worker.orgId })
				.then(() => {
					console.log(`deleteWorker() deleted worker ${worker.name}`);
					set({
						workers: get().workers.filter((w) => w.id !== worker.id),
					});
				})
				.catch((e) => {
					console.error(e);
					set({
						alertString: e.message,
					});
				});
		},
		saveWorker: (worker: WorkerConfig) => {
			WorkforceAPIClient.WorkerAPI
				.create(worker, { orgId: worker.orgId })
				.then((response: WorkerConfig | VariableSchemaValidationError[]) => {
					if (Array.isArray(response)) {
						const error = response.map((e) => e.message).join("\n");
						console.error(response);
						set({
							alertString: error,
						});
						return;
					}
					console.log(`saveWorker() created worker ${worker.name}`);
					set({
						alertString: "Worker saved",
					});
				})
				.catch((e) => {
					console.error(e);
					set({
						alertString: e.message,
					});
				});
		},
		importData: (yaml: string, orgId: string) => {
			const flow = FlowManager.convertFromYaml(yaml);
			let selectedFlow: FlowConfig | undefined = undefined;

			if (flow.id === undefined) {
				flow.id = uuidv4();
			}
			if (flow.orgId === undefined) {
				flow.orgId = orgId;
			}
			const flowData = FlowManager.getFlowData(flow, get().credentials);
			flowStates.set(flow.id, create<RFState>()(flowState(flowData)));
			selectedFlow = flow;

			const existingIndex = get().flows.findIndex((f) => f.id === flow.id);
			const flows = get().flows;
			if (existingIndex !== -1) {
				flows[existingIndex] = flow;
			}

			set({
				selectedFlow: selectedFlow,
				flows: [...flows],
			});
		},
		hydrate: (data: FlowConfig[], orgId: string) => {
			WorkforceAPIClient.CredentialAPI
				.list({
					orgId: orgId,
				})
				.then((credentials) => {
					if (!data || data.length === 0) {
						const flow: FlowConfig = {
							id: uuidv4(),
							name: "New Flow",
							description: "New Flow",
							orgId,
							status: "inactive",
						};
						const flowData = FlowManager.getFlowData(flow, credentials);
						flowStates.set(flow.id, create<RFState>()(flowState(flowData)));
						set({
							credentials: [...credentials],
							selectedFlow: flow,
							flows: [flow],
							ready: true,
						});
						return;
					}
					Promise.all(
						data.map((flow) => {
							return WorkforceAPIClient.FlowAPI.get(flow.id, { orgId: orgId });
						})
					)
						.then((allFlows) => {
							console.log(`Got credentials ${credentials.map((c) => c.name)}`);
							let selectedFlow: FlowConfig | undefined = undefined;
							if (!allFlows || allFlows.length === 0) {
								const flow: FlowConfig = {
									id: uuidv4(),
									name: "New Flow",
									description: "New Flow",
									orgId,
									status: "inactive",
								};
								const flowData = FlowManager.getFlowData(flow, credentials);
								flowStates.set(flow.id, create<RFState>()(flowState(flowData)));
								selectedFlow = flow;
							} else {
								for (const flow of allFlows) {
									if (flow.id === undefined) {
										flow.id = uuidv4();
									}
									if (flow.orgId === undefined) {
										flow.orgId = orgId;
									}
									const flowData = FlowManager.getFlowData(flow, credentials);
									flowStates.set(flow.id, create<RFState>()(flowState(flowData)));
									selectedFlow = flow;
								}
							}
							set({
								credentials: [...credentials],
								selectedFlow: selectedFlow,
								flows: [...allFlows],
								ready: true,
							});
						})
						.catch((e: Error) => {
							console.error(e);
							set({
								alertString: e.message
							})
						});
				})
				.catch((e) => {
					console.error(e);
					set({
						alertString: e.message
					})
				});
		},
	})) as StateCreator<MetaState, [], [never, unknown][]>
);
