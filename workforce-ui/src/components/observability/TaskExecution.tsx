import { Delete, ExpandMore, MemoryOutlined } from "@mui/icons-material";
import { Accordion, AccordionDetails, AccordionSummary, Grid, IconButton } from "@mui/material";
import { useState } from "react";
import { WorkforceAPIClient } from "workforce-api-client";
import { ChatSession, TaskExecution, WorkRequestData } from "workforce-core/model";
import { ContextState, contextStore } from "../../state/store.context";
import { ChannelRequestComponent } from "./ChannelMessageRequest";
import { ToolRequestComponent } from "./ToolRequest";
import { ToolResponseComponent } from "./ToolResponse";
import { WorkerChatSessionComponent } from "./WorkerChatSession";
import { WorkRequestComponent } from "./WorkRequest";
import { WorkResponseComponent } from "./WorkResponse";

type componentTypes =
	| "ChannelMessageRequest"
	| "ChannelMessageResponse"
	| "WorkerChatSession"
	| "ToolRequest"
	| "ToolResponse"
	| "WorkRequest"
	| "WorkResponse";

type componentData = {
	componentType: componentTypes;
	id: string;
	data: any;
};

const componentRanks = {
	WorkRequest: 0,
	WorkerChatSession: 1,
	WorkResponse: 2,
}

const contextSelector = (state: ContextState) => ({
    currentOrg: state.currentOrg,
});


export const TaskExecutionComponent = (props: { taskExecution: TaskExecution }) => {
	const { taskExecution } = props;
	const [expanded, setExpanded] = useState(false);
	const [children, setChildren] = useState(new Map<number, componentData>());
	const [deleted, setDeleted] = useState(false);
	const { currentOrg } = contextStore(contextSelector);

	const handleExpandClick = () => {
		setExpanded(!expanded);
		if (expanded) {
			return;
		}
		const newChildren = new Map<number, componentData>();

		WorkforceAPIClient.TaskExecutionAPI.ChatSessions
			.list({ taskExecutionId: taskExecution.id, orgId: currentOrg?.id })
			.then((response: ChatSession[]) => {
				response.forEach((chatSession: ChatSession) => {
					newChildren[chatSession.id] = {
						componentType: "WorkerChatSession",
						id : chatSession.id,
						data: chatSession,
					};
				});
				setChildren({ ...newChildren });
			})
			.catch((error: any) => {
				console.error(error);
			});
		WorkforceAPIClient.TaskExecutionAPI.WorkRequests
			.list({ taskExecutionId: taskExecution.id, orgId: currentOrg?.id })
			.then((response: WorkRequestData[]) => {
				response.forEach((workRequestData: WorkRequestData) => {
					if (workRequestData.request) {
						newChildren[workRequestData.request.timestamp] = {
							componentType: "WorkRequest",
							id: workRequestData.id,
							data: {...workRequestData.request, cost: workRequestData.cost}, 
						};
					}
					if (workRequestData.response) {
						newChildren[workRequestData.response.timestamp] = {
							componentType: "WorkResponse",
							id: `${workRequestData.id}-response`,
							data: workRequestData.response,
						};
					}
				});
				setChildren({ ...newChildren });
			});
	};

	const deleteTaskExecution = (taskExecution: TaskExecution) => {
		WorkforceAPIClient.TaskExecutionAPI
			.delete(taskExecution.id, { orgId: currentOrg.id })
			.then(() => {
				console.log("Task Execution Deleted");
				setDeleted(true);
			})
			.catch((error: any) => {
				console.error(error);
			});
	};

	return (
		deleted ? null :
		<Accordion expanded={expanded} onChange={handleExpandClick}>
			<AccordionSummary expandIcon={<ExpandMore />} id={taskExecution.id}>
				<Grid container spacing={2}>
					<Grid item xs={2}>
						<MemoryOutlined style={{ marginRight: 10 }} /><b>Task Execution</b>
					</Grid>
					<Grid item xs={4}>
						<b>Timestamp:</b> {new Date(Math.floor(taskExecution.timestamp)).toISOString()}
					</Grid>
					<Grid item xs={2}>
						<b>Status:</b> {taskExecution.status}
					</Grid>
					<Grid item xs={2}>
						<IconButton
							onClick={() => {
								deleteTaskExecution(taskExecution);
							}}
						>
							<Delete />
						</IconButton>
					</Grid>
				</Grid>
			</AccordionSummary>
			<AccordionDetails>
				<Grid container spacing={2}>
					<Grid item xs={4}>
						<b>ID:</b> {taskExecution.id}
					</Grid>
					<Grid item xs={4}>
						<b>Task ID:</b> {taskExecution.taskId}
					</Grid>
				</Grid>
				<div style={{ marginTop: 10 }}>
					{Array.from(Object.keys(children))
						.sort((a, b) => componentRanks[children[a].componentType] - componentRanks[children[b].componentType])
						.map((key) =>
							getComponent(children[key].componentType, children[key].id, children[key].data)
						)}
				</div>
			</AccordionDetails>
		</Accordion>
	);
};

function getComponent(componentType: componentTypes, id: string, data: any) {
	switch (componentType) {
		case "ChannelMessageRequest":
			return <ChannelRequestComponent channelMessage={data} key={id} />;
		case "ChannelMessageResponse":
			return <ChannelRequestComponent channelMessage={data} key={id} />;
		case "ToolRequest":
			return <ToolRequestComponent toolRequest={data} key={id} />;
		case "ToolResponse":
			return <ToolResponseComponent toolResponse={data} key={id} />;
		case "WorkRequest":
			return <WorkRequestComponent workRequest={data} key={id} />;
		case "WorkResponse":
			return <WorkResponseComponent workResponse={data} key={id} />;
		case "WorkerChatSession":
			return <WorkerChatSessionComponent chatSession={data} key={id} />;
		default:
			return <div>Unknown Component Type</div>;
	}
}
