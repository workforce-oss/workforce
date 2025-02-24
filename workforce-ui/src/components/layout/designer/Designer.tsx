import { Add, Upload } from "@mui/icons-material";
import { SvgIcon } from "@mui/material";
import { useEffect, useState } from "react";
import { ReactFlowProvider } from "reactflow";
import { shallow } from "zustand/shallow";
import { MetaState, metaStore } from "../../../state/store.meta";
import { SkillState, skillStore } from "../../../state/store.skills";
import { FlowArea } from "./FlowArea";
import { FlowHeader } from "./FlowHeader";
import { SideBar } from "./Sidebar";
import { WorkforceAPIClient } from "workforce-api-client";
import { ContextState, contextStore } from "../../../state/store.context";
import { CredentialState, credentialStore } from "../../../state/store.credentials";
import { DocumentRepositoryState, documentRepositoryStore } from "../../../state/store.documentation";

const metaSelector = (state: MetaState) => ({
	selectedFlow: state.selectedFlow,
	flows: state.flows,
	addFlow: state.addFlow,
	renameFlow: state.renameFlow,
	selectFlow: state.selectFlow,
	importData: state.importData,
	deleteFlow: state.deleteFlow,
	saveFlow: state.saveFlow,
	chatActive: state.chatActive,
	hydrate: state.hydrate,
	ready: state.ready,
	alertString: state.alertString,
	clearAlert: state.clearAlert,
	toggleFlowActive: state.toggleFlowActive,
});

const credentialSelector = (state: CredentialState) => ({
	credentials: state.credentials,
	hydrateCredentials: state.hydrate,
});

const documentRepositorySelector = (state: DocumentRepositoryState) => ({
	documentRepositories: state.documentRepositories,
	hydrateDocumentRepositories: state.hydrate,
});

const skillSelector = (state: SkillState) => ({
	hydrateSkills: state.hydrate,
});

const contextSelector = (state: ContextState) => ({
    currentOrg: state.currentOrg,
});


export const Designer = () => {
	const {
		flows,
		addFlow,
		importData,
		hydrate,
		ready,
		alertString,
		clearAlert,
	} = metaStore(metaSelector, shallow);

	const { hydrateSkills } = skillStore(skillSelector, shallow);
	const { currentOrg } = contextStore(contextSelector, shallow);
	const { credentials, hydrateCredentials } = credentialStore(credentialSelector, shallow);
	const { documentRepositories, hydrateDocumentRepositories } = documentRepositoryStore(documentRepositorySelector, shallow);

	useEffect(() => {
		if (alertString !== "") {
			alert(alertString);
			clearAlert();
		}
	}, [alertString]);

	useEffect(() => {
		hydrateSkills(currentOrg?.id);
	}, [currentOrg, ready]);

	
	useEffect(() => {
		hydrateCredentials(currentOrg?.id);
	}, [hydrateCredentials, currentOrg, ready]);

	useEffect(() => {
		hydrateDocumentRepositories(currentOrg?.id);
	}, [hydrateDocumentRepositories, currentOrg, ready]);

	if (!ready) {
		WorkforceAPIClient.FlowAPI
			.list({
				orgId: currentOrg?.id,
			})
			.then((data) => {
				hydrate(data, currentOrg?.id);
			}).catch((e) => {
				console.error(e);
			});
		return <div>Loading...</div>;
	}
	console.log("flows updated");

	return (
		<ReactFlowProvider>
			<div className="flex flex-col h-full">
				<div className="flex flex-row  h-full w-full overflow-auto">
					<div className="flex flex-1 overflow-hidden">
						{/* Main area */}
						<main className="min-w-0 flex-1 border-t border-gray-200 dark:border-gray-700 flex">
							{/* Sidebar */}
							<div className="w-64 bg-white flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-700">
								<SideBar />
							</div>
							{/* Buttons to switch between different flow areas */}
							<div
								className="absolute flex-shrink"
								style={{
									zIndex: 1000,
									marginLeft: "280px",
								}}
							>
								<div className="flex flex-row flex-wrap" style={{
									marginTop: "10px",
								}}>
									{
										flows.map((flow, index) => {
											return <FlowHeader flow={flow} key={index} credentials={credentials} documentRepositories={documentRepositories} />;
										})}
									{/* Import flow button */}
									<button
										onClick={() => {
											const input = document.createElement("input");
											input.type = "file";
											input.onchange = (e) => {
												const file = (e.target as HTMLInputElement).files[0];
												const reader = new FileReader();
												const fileName = file.name.split(".")[0];

												reader.onload = (e) => {
													const contents = e.target.result;
													importData(contents as string, currentOrg.id, credentials, documentRepositories);
												};
												reader.readAsText(file);
											};
											input.click();
										}}
										className="bg-white dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 m-1 px-2 rounded-full mx-1 ml-4 inline-flex items-center text-center"
										style={{
											border: "1px solid darkgrey",
											boxShadow: "1px 1px 2px 0px rgba(0,0,0,0.75)",
										}}
									>
										<SvgIcon component={Upload} />
									</button>
									{/* Add flow button */}
									<button
										onClick={() => addFlow(currentOrg.id)}
										className="bg-white dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 m-1 px-2 rounded-full mx-1 inline-flex items-center text-center"
										style={{
											border: "1px solid darkgrey",
											boxShadow: "1px 1px 2px 0px rgba(0,0,0,0.75)",
										}}
									>
										<SvgIcon component={Add} />
									</button>
								</div>
							</div>

							{/* Main content */}

							<FlowArea />

						</main>
					</div>
				</div>
			</div>
		</ReactFlowProvider>
	);
};
