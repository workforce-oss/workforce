import { ExpandMore, WorkHistoryOutlined, WorkOutline } from "@mui/icons-material";
import { Accordion, AccordionDetails, AccordionSummary, Card, CardContent, Grid } from "@mui/material";
import { useState } from "react";
import { WorkRequest } from "workforce-core/model";
import { formatMoney } from "../../util/util";

export const WorkRequestComponent = (props: { workRequest: WorkRequest & {cost?: number} }) => {
	const { workRequest } = props;
	const [expanded, setExpanded] = useState(false);

	return (
		<Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
			<AccordionSummary expandIcon={<ExpandMore />} key="item0">
				<Grid container spacing={2}>
					<Grid item xs={2}>
						<WorkOutline style={{ marginRight: 10 }} /><b>Work Request</b>
					</Grid>
					<Grid item xs={10}>
						<b>Timestamp:</b> {new Date(workRequest.timestamp).toISOString()}
					</Grid>
				</Grid>
			</AccordionSummary>
			<AccordionDetails key="item1">
				<Grid container spacing={2}>
					<Grid item xs={12}>
						<b>Worker ID:</b> {workRequest.workerId}
					</Grid>
					<Grid item xs={12}>
						<b>Task ID:</b> {workRequest.taskId}
					</Grid>
					<Grid item xs={12}>
						<b>Channel ID:</b> {workRequest.channelId}
					</Grid>
					<Grid item xs={12}>
						<b>Cost:</b> {formatMoney(workRequest.cost)}
					</Grid>
					<Grid item xs={12}>
						<b>Input:</b>{" "}
						<pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(workRequest.input, null, 2)}</pre>
					</Grid>
					{workRequest.tools?.length > 0 &&
						<Grid item xs={12}>
							<b>Tools:</b>{" "}
							<pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(workRequest.tools, null, 2)}</pre>
						</Grid>
					}
					{workRequest.documentation?.length > 0 &&
						<Grid item xs={12}>
							<b>Documentation:</b>{" "}
							<pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(workRequest.documentation, null, 2)}</pre>
						</Grid>
					}
					<Grid item xs={12}>
						<b>Completion Function:</b>{" "}
						<pre style={{ whiteSpace: "pre-wrap" }}>
							{JSON.stringify(workRequest.completionFunction, null, 2)}
						</pre>
					</Grid>
				</Grid>
			</AccordionDetails>
		</Accordion>
	);
};