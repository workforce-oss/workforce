import { BuildOutlined, ExpandMore } from "@mui/icons-material";
import { Accordion, AccordionDetails, AccordionSummary, Card, CardContent, Grid } from "@mui/material";
import { useState } from "react";
import { ToolRequest } from "workforce-core/model";

export const ToolRequestComponent = (props: { toolRequest: ToolRequest }) => {
	const { toolRequest } = props;
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
						<BuildOutlined style={{marginRight: 10}}/><b>Tool Request</b>
					</Grid>
					<Grid item xs={10}>
						<b>Timestamp:</b> {new Date(toolRequest.timestamp).toISOString()}
					</Grid>
				</Grid>
			</AccordionSummary>
			<AccordionDetails key="item0">
				<Grid container spacing={2}>
					<Grid item xs={12}>
						<b>Function Call:</b>{" "}
						<pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
							{JSON.stringify(toolRequest.toolCall, null, 2)}
						</pre>
					</Grid>
					<Grid item xs={4}>
						<b>Tool ID:</b> {toolRequest.toolId}
					</Grid>
					<Grid item xs={12}>
						<b>Request ID:</b> {toolRequest.requestId}
					</Grid>

					<Grid item xs={12}>
						<b>Channel ID:</b> {toolRequest.channelId}
					</Grid>
					<Grid item xs={12}>
						<b>Machine State:</b>{" "}
						<pre style={{ whiteSpace: "pre-wrap" }}>
							{JSON.stringify(toolRequest.machine_state, null, 2)}
						</pre>
					</Grid>
				</Grid>
			</AccordionDetails>
		</Accordion>
	);
};
