import { Delete, Edit } from "@mui/icons-material";
import { SvgIcon } from "@mui/material";
import { useState } from "react";
import { CredentialConfig, DocumentRepositoryConfig, FlowConfig } from "workforce-core/model";
import { shallow } from "zustand/shallow";
import { MetaState, flowStates, metaStore } from "../../../state/store.meta";
import { ActivateButton } from "./ActivateButton";
import { ExportButton } from "./ExportButton";
import { SaveButton } from "./SaveButton";
import { RFState } from "../../../state/store.flow";
import { rename } from "fs/promises";

const flowSelector  = (state: RFState) => ({
	renameActualFlow: state.renameFlow,
});

const metaSelector = (state: MetaState) => ({
	renameFlow: state.renameFlow,
	selectFlow: state.selectFlow,
	deleteFlow: state.deleteFlow,
	selectedFlow: state.selectedFlow,
});

export const FlowHeader = (props: { flow: FlowConfig, credentials: CredentialConfig[], documentRepositories: DocumentRepositoryConfig[] }) => {
	const { flow, credentials, documentRepositories } = props;
	const { renameFlow, selectFlow, deleteFlow, selectedFlow } = metaStore(metaSelector, shallow);
	const [edittingFlow, setEdittingFlow] = useState(null);
	const [edittingFlowName, setEdittingFlowName] = useState("");
	const {renameActualFlow} = flowStates.get(flow.id)(flowSelector, shallow);
	return (
		<div
			className="bg-white dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 m-1 rounded-full inline-flex items-center"
			style={{
				border: selectedFlow === flow ? "2px solid darkgrey" : "none",
				transform: selectedFlow === flow ? "scale(1.05)" : "none",
				boxShadow:
					selectedFlow === flow ? "0px 0px 6px 0px rgba(0,0,0,0.75)" : "1px 1px 2px 0px rgba(0,0,0,0.75)",
				backgroundColor: selectedFlow === flow ? "white" : "none",
			}}
		>
			<button
				onClick={() => {
					if (selectedFlow !== flow) {
						selectFlow(flow);
					}
				}}
				className=""
			>
				{edittingFlow === flow ? (
					<input
						autoFocus
						className="shadow"
						value={edittingFlowName}
						onChange={(e) => setEdittingFlowName(e.target.value)}
						onBlur={(e) => {
							renameFlow(flow, edittingFlowName);
							renameActualFlow(edittingFlowName);
							setEdittingFlow(null);
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								renameFlow(flow, edittingFlowName);
								renameActualFlow(edittingFlowName);
								setEdittingFlow(null);
							}
						}}
					/>
				) : (
					<span className="mr-2">{flow.name}</span>
				)}
			</button>
			{flow.id === selectedFlow.id ? (
				<div>
					<button
						onClick={() => {
							setEdittingFlowName(flow.name);
							setEdittingFlow(flow);
						}}
						className="shadow mr-1 rounded-full"
					>
						<SvgIcon component={Edit} />
					</button>
					<ActivateButton id={flow.id} />
					<ExportButton id={flow.id} credentials={credentials} documentRepositories={documentRepositories} />
					<SaveButton id={flow.id} />
					<button
						onClick={() => {
							const confirm = window.confirm(`Are you sure you want to delete ${flow.name}?`);
							if (confirm) {
								deleteFlow(flow);
							}
						}}
						className="shadow rounded-full"
					>
						<SvgIcon component={Delete} />
					</button>
				</div>
			) : null}
		</div>
	);
};
