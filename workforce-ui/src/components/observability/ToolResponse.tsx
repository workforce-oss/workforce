import { BuildOutlined, ExpandMore } from "@mui/icons-material";
import { Accordion, AccordionDetails, AccordionSummary, Card, CardContent, Grid } from "@mui/material";
import { useState } from "react";
import { ToolResponse } from "workforce-core/model";
import { actualTabsAndNewlines } from "../../util/util";

export const ToolResponseComponent = (props: { toolResponse: ToolResponse }) => {
	const { toolResponse } = props;
	const [expanded, setExpanded] = useState(false);

	return (
		<Accordion
			style={{ marginLeft: "10px", marginTop: 1 }}
			expanded={expanded}
			onChange={() => setExpanded(!expanded)}
		>
			<AccordionSummary expandIcon={<ExpandMore />}>
				<Grid container spacing={2}>
					<Grid item xs={2}>
						<BuildOutlined style={{ marginRight: 10 }} />
						<b>Tool Response</b>
					</Grid>
					<Grid item xs={10}>
						<b>Timestamp:</b> {new Date(toolResponse.timestamp).toISOString()}
					</Grid>
					<Grid item xs={12}>
						{toolResponse.machine_message}
					</Grid>
				</Grid>
			</AccordionSummary>
			<AccordionDetails key="item0">
				<Grid container spacing={2}>
					<Grid item xs={12}>
						<b>Tool ID:</b> {toolResponse.toolId}
					</Grid>
					<Grid item xs={12}>
						<b>Request ID:</b> {toolResponse.requestId}
					</Grid>
					<Grid item xs={12}>
						<b>Success:</b> {toolResponse.success ? "true" : "false"}
					</Grid>

					<Grid item xs={12}>
						<b>Machine State:</b>{" "}
						<pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
							{actualTabsAndNewlines(JSON.stringify(toolResponse.machine_state, null, 2))}
						</pre>
					</Grid>
					<Grid item xs={12}>
						<b>Human State:</b>{" "}
						<pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{actualTabsAndNewlines(JSON.stringify(toolResponse.human_state, null, 2))}</pre>
					</Grid>
				</Grid>
			</AccordionDetails>
		</Accordion>
	);
};