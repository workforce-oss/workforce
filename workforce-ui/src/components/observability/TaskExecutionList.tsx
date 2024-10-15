import { useMemo, useState } from "react";
import { TaskExecution } from "workforce-core/model";
import { TaskExecutionComponent } from "./TaskExecution";
import { WorkforceAPIClient } from "workforce-api-client";
import { ContextState, contextStore } from "../../state/store.context";

const contextSelector = (state: ContextState) => ({
    currentOrg: state.currentOrg,
});

export const TaskExecutionListComponent = () => {
	const [taskExecutions, setTaskExecutions] = useState<TaskExecution[]>([]);
	const { currentOrg } = contextStore(contextSelector);

	useMemo(() => {
		WorkforceAPIClient.TaskExecutionAPI
			.list({
				orgId: currentOrg?.id,
			})
			.then((response: TaskExecution[]) => {
				response.sort((a: TaskExecution, b: TaskExecution) => {
					return a.timestamp < b.timestamp ? 1 : -1;
				});
				setTaskExecutions(response);
			})
			.catch((error: any) => {
				console.error(error);
			});
	}, [currentOrg]);

	return (
		<div style={{padding: 20, maxWidth: 1280}}>
			{taskExecutions.map((taskExecution: TaskExecution) => {
				return <TaskExecutionComponent taskExecution={taskExecution} key={taskExecution.id}/>;
			})}
		</div>
	);
};
