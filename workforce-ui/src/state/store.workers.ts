import { WorkforceAPIClient } from "workforce-api-client";
import { VariableSchemaValidationError, WorkerConfig } from "workforce-core/model";
import { temporal } from "zundo";
import { create } from "zustand";

export type WorkerState = {
	message: string | undefined;
	error: string | undefined;
	workers: WorkerConfig[];
	addWorker: (worker: WorkerConfig) => void;
	removeWorker: (worker: WorkerConfig) => void;
	updateWorker: (worker: WorkerConfig) => void;
	hydrate: (orgId: string) => void;
};

export const workerStore = create<WorkerState>()(
	temporal((set, get: () => WorkerState) => ({
		message: undefined,
		error: undefined,
		workers: [],
		addWorker: (worker: WorkerConfig) => {
			if (worker.variables?.user_id) {
				worker.id = worker.variables?.user_id as string;
			}
			WorkforceAPIClient.WorkerAPI
				.create(worker)
				.then((response: WorkerConfig | VariableSchemaValidationError[]) => {
					if (Array.isArray(response)) {
						const error = response.map((e) => e.message).join("\n");
						console.error(response);
						set({
							error: error,
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
						error: e.message,
					});
				});
		},
		removeWorker: (worker: WorkerConfig) => {
			WorkforceAPIClient.WorkerAPI
				.delete(worker.id)
				.then(() => {
					console.log(`deleteWorker() deleted worker ${worker.name}`);
					set({
						workers: get().workers.filter((w) => w.id !== worker.id),
					});
				})
				.catch((e) => {
					console.error(e);
					set({
						error: e.message,
					});
				});
		},
		updateWorker: (worker: WorkerConfig) => {
			WorkforceAPIClient.WorkerAPI
				.update(worker, worker.id)
				.then((response: WorkerConfig | VariableSchemaValidationError[]) => {
					if (Array.isArray(response)) {
						const error = response.map((e) => e.message).join("\n");
						console.error(response);
						set({
							error: error,
						});
						return;
					}
					console.log(`saveWorker() created worker ${worker.name}`);
					set({
						workers: get().workers.map((w) => {
							if (w.id === worker.id) {
								return worker;
							}
							return w;
						})
					});
				})
				.catch((e) => {
					console.error(e);
					set({
						error: e.message,
					});
				});
		},
		hydrate: (orgId: string) => {
			WorkforceAPIClient.WorkerAPI
				.list({
					orgId,
				})
				.then((response: WorkerConfig[]) => {
					set({
						workers: response,
					});
				})
				.catch((error: any) => {
					console.error(error);
					set({
						error: error.message,
					});
				});
		},
	}))
);
