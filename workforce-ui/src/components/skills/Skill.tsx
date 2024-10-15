import { ExpandMore } from "@mui/icons-material";
import { Accordion, AccordionDetails, AccordionSummary } from "@mui/material";
import { useState } from "react";
import { Skill } from "workforce-core/model";

export const SkillComponent = (props: { skill: Skill }) => {
	const { skill } = props;
	const [expanded, setExpanded] = useState(false);

	return (
		<Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
			<AccordionSummary expandIcon={<ExpandMore />}>
				<b>{skill.name}</b>
			</AccordionSummary>
			<AccordionDetails>
				<pre style={{ whiteSpace: "pre-wrap" }}>{skill.description}</pre>
			</AccordionDetails>
		</Accordion>
	);
};
