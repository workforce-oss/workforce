import { ExpandMore } from "@mui/icons-material";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Grid,
	Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import { CredentialConfig } from "workforce-core/model";
import { shallow } from "zustand/shallow";
import { CredentialState, credentialStore } from "../../state/store.credentials";
import { SchemaVariableListComponent } from "../SchemaVariableListComponent";
import { WorkforceAPIClient } from "workforce-api-client";

const selector = (state: CredentialState) => ({
	updateCredential: state.updateCredential,
});


export const CredentialComponent = (props: { config: CredentialConfig; }) => {
	const { config } = props;
	const { updateCredential } = credentialStore(selector, shallow);
	const [expanded, setExpanded] = useState(false);
	const [details, setDetails] = useState<CredentialConfig>(config);

	useEffect(() => {
		if (!expanded) {
			return;
		}
		WorkforceAPIClient.CredentialAPI
			.get(config.id)
			.then((config) => {
				setDetails(config);
			});
	}, [config, expanded]);

	return (
		<Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
			<AccordionSummary expandIcon={<ExpandMore />}>
				<Grid container spacing={2}>
					<Grid item xs={6}>
						
							<b>{config.name}</b>
					</Grid>

					<Grid item xs={6}>
						<Typography color="text.secondary">{config.subtype}</Typography>
					</Grid>
				</Grid>
			</AccordionSummary>
			<AccordionDetails>
				<SchemaVariableListComponent
					config={details}
					onPropertyChange={(name, newValue) => {
						updateCredential({
							...details,
							variables: {
								...details.variables,
								[name]: newValue,
							},
						});
					}}
					onResize={(e) => {}}
					readOnly={false}
				/>
			</AccordionDetails>
		</Accordion>
	);
}
