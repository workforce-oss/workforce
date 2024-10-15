import { ExpandMore } from "@mui/icons-material";
import { Accordion, AccordionDetails, AccordionSummary, Grid } from "@mui/material";
import { useState } from "react";
import { FlowConfig } from "workforce-core/model";

export const FlowComponent = (props: { flow: FlowConfig }) => {
	const { flow } = props;
	const [expanded, setExpanded] = useState(false);
	const handleExpandClick = () => {
		setExpanded(!expanded);
	};
	return (
		<Accordion expanded={expanded} onChange={handleExpandClick}>
			<AccordionSummary expandIcon={<ExpandMore />} id={flow.id}>
				<b>{flow.name}</b>
			</AccordionSummary>
			<AccordionDetails>
				<Grid container spacing={2}>
					<Grid item xs={12}>
						<pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(flow, null, 2)}</pre>
					</Grid>
				</Grid>
			</AccordionDetails>
		</Accordion>
	);
};
