import { shallow } from "zustand/shallow";
import { WorkerState, workerStore } from "../../state/store.workers";
import { useEffect } from "react";
import { WorkerComponent } from "./WorkerComponent";
import { WorkerAddComponent } from "./WorkerAddComponent";
import { ContextState, contextStore } from "../../state/store.context";

const selector = (state: WorkerState) => ({
	workers: state.workers,
	hydrate: state.hydrate,
});

const contextSelector = (state: ContextState) => ({
	currentOrg: state.currentOrg,
});

export const WorkerListComponent = () => {
	const { workers, hydrate } = workerStore(selector, shallow);
	const { currentOrg } = contextStore(contextSelector, shallow);
	useEffect(() => {
		hydrate(currentOrg?.id);
	}, [hydrate, currentOrg]);
	return (
		<div style={{ padding: 20, maxWidth: 720 }}>
			{workers.map((worker) => {
				return <WorkerComponent key={worker.name} config={worker} />;
			})}
			<WorkerAddComponent key={"add"} />
		</div>
	);
};
