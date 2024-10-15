import { useEffect, useMemo, useState } from "react";
import { MetaState, metaStore } from "../../../state/store.meta";
import { WorkerState, workerStore } from "../../../state/store.workers";
import { TaskExecution } from "workforce-core/model";
import { shallow } from "zustand/shallow";
import { Card, CardContent, Grid } from "@mui/material";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { FlowComponent } from "./FlowComponent";
import { AuthSession } from "workforce-ui-core";
import { ConfigurationState, configurationStore } from "../../../state/store.configuration";
import { WorkforceAPIClient } from "workforce-api-client";
import { ContextState, contextStore } from "../../../state/store.context";

const selector = (state: WorkerState) => ({
	workers: state.workers,
	hydrateWorkers: state.hydrate,
});

const metaSelector = (state: MetaState) => ({
	flows: state.flows,
	hydrateFlows: state.hydrate,
});

const configSelector = (state: ConfigurationState) => ({
	auth: state.auth,
});

const contextSelector = (state: ContextState) => ({
    currentOrg: state.currentOrg,
});


export const DashboardComponent = () => {
	const [taskExecutions, setTaskExecutions] = useState<TaskExecution[]>([]);

	const { auth } = configurationStore(configSelector, shallow);
	const { currentOrg } = contextStore(contextSelector, shallow);

	useMemo(() => {
		WorkforceAPIClient.TaskExecutionAPI
			.list({
				orgId: currentOrg?.id,
			})
			.then((response: TaskExecution[]) => {
				setTaskExecutions(response);
			})
			.catch((error: any) => {
				console.error(error);
			});
	}, [currentOrg]);

	const { workers, hydrateWorkers } = workerStore(selector, shallow);
	useEffect(() => {
		hydrateWorkers(currentOrg?.id);
	}, [hydrateWorkers, currentOrg]);

	const { flows, hydrateFlows } = metaStore(metaSelector, shallow);
	useEffect(() => {
		WorkforceAPIClient.FlowAPI
			.list({
				orgId: currentOrg?.id,
			})
			.then((data) => {
				hydrateFlows(data, currentOrg?.id);
			});
	}, [hydrateFlows, currentOrg]);

	let totalWipLimit = 0;
	workers.forEach((worker) => {
		totalWipLimit += worker.wipLimit ?? 0;
	});
	if (totalWipLimit === 0) {
		totalWipLimit = 1;
	}
	const totalStartedTasks = taskExecutions.filter((taskExecution) => taskExecution.status === "started").length;
	console.log(totalWipLimit, totalStartedTasks);

	const taskData = [
		{
			name: "Completed",
			value: taskExecutions.filter((taskExecution) => taskExecution.status === "completed").length,
			color: "#00C853",
		},
		{
			name: "Started",
			value: taskExecutions.filter((taskExecution) => taskExecution.status === "started").length,
			color: "#FFD600",
		},
		{
			name: "Failed",
			value: taskExecutions.filter((taskExecution) => taskExecution.status === "failed").length,
			color: "#D50000",
		},
	];

	const workerData = [
		{
			name: "In Use",
			value: totalStartedTasks,
			color: "#FFD600",
		},
		{
			name: "Available",
			value: totalWipLimit - totalStartedTasks,
			color: "#00C853",
		},
	];

	return (
		<div style={{ padding: 20, maxWidth: 1280 }}>
			<Grid
				container
				spacing={2}
				style={{
					width: "100%",
					height: "100%",
				}}
			>
				<Grid item xs={6} key="task-executions">
					<Card>
						<CardContent>
							<ResponsiveContainer width="100%" height={300}>
								<PieChart height={300} width={400} title="Task Executions">
									<Pie
										dataKey={"value"}
										startAngle={180}
										endAngle={0}
										data={taskData}
										cx={"50%"}
										cy={"98%"}
										outerRadius={200}
										innerRadius={120}
										fill="#8884d8"
										labelLine={false}
										label={(entry) => {
											const radius =
												entry.innerRadius + (entry.outerRadius - entry.innerRadius) / 2;
											const x = entry.cx + radius * Math.cos((-entry.midAngle * Math.PI) / 180);
											const y = entry.cy + radius * Math.sin((-entry.midAngle * Math.PI) / 180);
											if (entry.percent > 0) {
												return (
													<text
														x={x}
														y={y - entry.outerRadius + entry.innerRadius}
														fill="green"
														textAnchor={"middle"}
														dominantBaseline="central"
														style={{
															fontSize: "1.25rem",
															fontWeight: "bold",
														}}
													>
														{`${Math.round(entry.percent * 100) }% ${entry.name}`}
													</text>
												);
											}
										}}
									>
										{taskData.map((entry, index) => (
											<Cell
												key={`cell-${index}`}
												fill={entry.color}
												stroke={entry.color}
												style={{
													filter: `drop-shadow(0px 0px 5px #888888)`,
												}}
											/>
										))}
									</Pie>
									<text
										x="50%"
										y="95%"
										textAnchor="middle"
										dominantBaseline="middle"
										style={{
											fontSize: "1.25rem",
											fontWeight: "bold",
										}}
									>
										{taskData.reduce((accumulator, entry) => accumulator + entry.value, 0)} Tasks
										Executed
									</text>
								</PieChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={6} key="worker-capacity">
					<Card>
						<CardContent>
							<ResponsiveContainer width="100%" height={300}>
								<PieChart height={300} width={400}>
									<Pie
										dataKey={"value"}
										startAngle={180}
										endAngle={0}
										data={workerData}
										cx={"50%"}
										cy={"100%"}
										outerRadius={200}
										innerRadius={120}
										fill="#8884d8"
										stroke="none"
										labelLine={false}
										label={(entry) => {
											const radius =
												entry.innerRadius + (entry.outerRadius - entry.innerRadius) / 2;
											const x = entry.cx + radius * Math.cos((-entry.midAngle * Math.PI) / 180);
											const y = entry.cy + radius * Math.sin((-entry.midAngle * Math.PI) / 180);
											if (entry.percent > 0) {
												return (
													<text
														x={x}
														y={y - entry.outerRadius + entry.innerRadius}
														fill="green"
														textAnchor={"middle"}
														dominantBaseline="central"
														style={{
															fontSize: "1.25rem",
															fontWeight: "bold",
														}}
													>
														{`${workerData[entry.index].value} ${entry.name}`}
													</text>
												);
											}
										}}
									>
										{workerData.map((entry, index) => (
											<Cell
												key={`cell-${index}`}
												fill={entry.color}
												stroke={entry.color}
												style={{
													filter: `drop-shadow(0px 0px 5px #888888)`,
												}}
											/>
										))}
									</Pie>
									<text
										x="50%"
										y="95%"
										textAnchor="middle"
										dominantBaseline="middle"
										style={{
											fontSize: "1.25rem",
											fontWeight: "bold",
										}}
									>
										Worker Capacity: {totalWipLimit}
									</text>
								</PieChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} key="flows">
					<Card>
						<CardContent>
							<Grid container spacing={2}>
								<Grid item xs={12} key="header">
									<b>Flows</b>
								</Grid>
								{flows.map((flow) => {
									return (
										<Grid item xs={12} key={flow.name}>
											<FlowComponent flow={flow} key={flow.id} />
										</Grid>
									);
								})}
							</Grid>
						</CardContent>
					</Card>
				</Grid>
			</Grid>
		</div>
	);
};
