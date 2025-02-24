import { ExpandMore, Save } from "@mui/icons-material";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Grid,
	IconButton,
	Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import { CredentialConfig } from "workforce-core/model";
import { shallow } from "zustand/shallow";
import { CredentialState, credentialStore } from "../../state/store.credentials";
import { SchemaVariableListComponent } from "../SchemaVariableListComponent";
import { WorkforceAPIClient } from "workforce-api-client";
import { ContextState, contextStore } from "../../state/store.context";

const selector = (state: CredentialState) => ({
	updateCredential: state.updateCredential,
});
const contextSelector = (state: ContextState) => ({
	currentOrg: state.currentOrg,
});


export const CredentialComponent = (props: { config: CredentialConfig; }) => {
	const { config } = props;
	const { updateCredential } = credentialStore(selector, shallow);
	const [expanded, setExpanded] = useState(false);
	const [details, setDetails] = useState<CredentialConfig>(config);
	const { currentOrg } = contextStore(contextSelector, shallow);

	useEffect(() => {
		if (!expanded) {
			return;
		}
		WorkforceAPIClient.CredentialAPI
			.get(config.id, { orgId: currentOrg.id })
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

					<Grid item xs={4}>
						<Typography color="text.secondary">{config.type}</Typography>
					</Grid>
					<Grid item xs={2}>
						{expanded && (
							<IconButton
								onClick={() => {
									updateCredential({
										...details,
									});
								}}
							>
								<Save />
							</IconButton>
						)}
					</Grid>
				</Grid>

			</AccordionSummary>
			<AccordionDetails>
				<SchemaVariableListComponent
					config={details}
					objectType="credential"
					onPropertyChange={(name, newValue) => {
						setDetails({
							...details,
							variables: {
								...details.variables,
								[name]: newValue,
							},
						});
					}}
					onResize={(e) => { }}
					readOnly={false}
				/>
			</AccordionDetails>
		</Accordion>
	);
}
