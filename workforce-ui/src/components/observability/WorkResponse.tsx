import { ExpandMore, WorkOutline } from "@mui/icons-material";
import { Accordion, AccordionDetails, AccordionSummary, Card, CardContent, Grid } from "@mui/material";
import { useState } from "react";
import { WorkResponse } from "workforce-core/model";

export const WorkResponseComponent = (props: { workResponse: WorkResponse }) => {
	const { workResponse } = props;
	const [expanded, setExpanded] = useState(false);

	const getDate = (timestamp: number) => {
		try {
			return new Date(timestamp).toISOString();
		} catch (e) {
			return "Invalid Date";
		}
	};
	return (
		<Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
			<AccordionSummary expandIcon={<ExpandMore />}>
				<Grid container spacing={2}>
					<Grid item xs={2}>
					<WorkOutline style={{marginRight: 10}}/><b>Work Response</b>
					</Grid>
					<Grid item xs={10}>
						<b>Timestamp:</b> {getDate(workResponse.timestamp)}
					</Grid>
					
				</Grid>
			</AccordionSummary>
			<AccordionDetails>
				<Grid container spacing={2}>
				<Grid item xs={12}>
						<b>Worker ID:</b> {workResponse.workerId}
					</Grid>
					<Grid item xs={12}>
						<b>Task ID:</b> {workResponse.taskId}
					</Grid>
					<Grid item xs={12}>
						<b>Output:</b>{" "}
						<pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
							{JSON.stringify(workResponse.output, null, 2)}
						</pre>
					</Grid>
				</Grid>
			</AccordionDetails>
		</Accordion>
	);
};
