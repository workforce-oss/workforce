import { Delete, ExpandMore, Save } from "@mui/icons-material";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Chip,
	Grid,
	IconButton,
	MenuItem,
	TextField,
	Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { ChannelUserCredentialType, CredentialConfig, WorkerConfig, WorkerType, channelTypes, channelUserCredentialTypes, workerTypes } from "workforce-core/model";
import { shallow } from "zustand/shallow";
import { CredentialState, credentialStore } from "../../state/store.credentials";
import { SkillState, skillStore } from "../../state/store.skills";
import { WorkerState, workerStore } from "../../state/store.workers";
import { SchemaVariableListComponent } from "../SchemaVariableListComponent";
import { WorkforceAPIClient } from "workforce-api-client";
import { ContextState, contextStore } from "../../state/store.context";

const selector = (state: WorkerState) => ({
	updateWorker: state.updateWorker,
	removeWorker: state.removeWorker,
});

const credentialSelector = (state: CredentialState) => ({
	credentials: state.credentials,
	hydrateCredentials: state.hydrate,
});

const skillSelector = (state: SkillState) => ({
	skills: state.skills,
	hydrateSkills: state.hydrate,
});

const contextSelector = (state: ContextState) => ({
    currentOrg: state.currentOrg,
});


export const WorkerComponent = (props: { config: WorkerConfig }) => {
	const { config } = props;
	const { credentials, hydrateCredentials } = credentialStore(credentialSelector, shallow);
	const { skills, hydrateSkills } = skillStore(skillSelector, shallow);

	const { updateWorker, removeWorker } = workerStore(selector, shallow);
	const { currentOrg } = contextStore(contextSelector, shallow);

	const [expanded, setExpanded] = useState(false);
	const [details, setDetails] = useState<WorkerConfig>(config);
	const [credentialList, setCredentialList] = useState<CredentialConfig[]>([]); // credentials.map((credential) => credential.name) as string[

	useEffect(() => {
		if (!expanded) {
			return;
		}
		WorkforceAPIClient.WorkerAPI
			.get(config.id)
			.then((config) => {
				setDetails(config);
			});
	}, [config, expanded]);

	useMemo(() => {
		hydrateCredentials(currentOrg?.id);
		hydrateSkills(currentOrg?.id);
	}, [currentOrg]);

	useEffect(() => {
		setCredentialList(credentials.filter((credential) => workerTypes.includes(credential.subtype as WorkerType)));
	}, [credentials]);

	return (
		<Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
			<AccordionSummary expandIcon={<ExpandMore />}>
				<Grid container spacing={2}>
					<Grid item xs={6}>
						<b>{config.name}</b>
					</Grid>

					<Grid item xs={4}>
						<Typography color="text.secondary">{config.subtype}</Typography>
					</Grid>
					<Grid item xs={2}>
						{expanded && (
						<IconButton
							onClick={() => {
								updateWorker({
									...details,
								});
							}}
						>
							<Save />
						</IconButton>
						)}
						{/** Delete Btton */}
						<IconButton
							onClick={() => {
								removeWorker(config);
							}}
						>
							<Delete />
						</IconButton>
					</Grid>
				</Grid>
			</AccordionSummary>
			<AccordionDetails>
				<Grid container spacing={2}>
					<Grid item xs={12}>
						<Typography color="text.secondary">{config.id}</Typography>
					</Grid>
					<Grid item xs={6}>
						<TextField
							label="Integration"
							select
							style={{
								minWidth: 235,
							}}
							value={details.credential ?? ""}
							onChange={(e) => {
								setDetails({
									...details,
									credential: e.target.value as string,
								});
							}}
						>
							{credentialList.map((credential) => (
								<MenuItem key={credential?.name} value={credential?.name}>
									{credential?.name}
								</MenuItem>
							))}
						</TextField>
					</Grid>
					<Grid item xs={6}>
						<div className="flex flex-row justify-between items-center">
							<TextField
								label="WIP Limit"
								type="number"
								value={details.wipLimit}
								onChange={(e) => {
									setDetails({
										...details,
										wipLimit: parseInt(e.target.value),
									});
								}}
							/>

						</div>
						<div className="flex-grow"></div>
					</Grid>
					<Grid item xs={12}>
						<SchemaVariableListComponent
							config={details}
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
					</Grid>
					<Grid item xs={12}>
						<b>Channel Tokens</b>
					</Grid>
					{channelTypes
						.filter((channelType) => channelType !== "mock")
						.map((channelType) => (
							<Grid item xs={12} key={channelType}>
								<TextField
									select
									label={channelType}
									style={{
										minWidth: 235,
									}}
									value={details.channelUserConfig?.[channelType] ?? ""}
									onChange={(e) => {
										setDetails({
											...details,
											channelUserConfig: {
												...details.channelUserConfig,
												[channelType]: e.target.value as string,
											},
										});
									}}
								>
									{credentials
										.filter((credential) =>
											channelUserCredentialTypes.includes(
												credential.subtype as ChannelUserCredentialType
											)
										)

										.map((credential) => (
											<MenuItem key={credential.id} value={credential.name}>
												{credential.name}
											</MenuItem>
										))}
								</TextField>
							</Grid>
						))}
					<Grid item xs={12}>
						<b>Skills</b>
					</Grid>
					<Grid item xs={12}>
						<TextField
							label="Add Skill"
							select
							style={{
								minWidth: 235,
							}}
							value={""}
							onChange={(e) => {
								setDetails({
									...details,
									skills: [...new Set([...(details.skills ?? []), e.target.value as string])],
								});
							}}
						>
							{skills.map((skill) => (
								<MenuItem key={skill.name} value={skill.name}>
									{skill.name}
								</MenuItem>
							))}
						</TextField>
					</Grid>
					<Grid item xs={12}>
						{details.skills?.map((skill) => (
							<Chip
								key={skill}
								style={{ margin: 2 }}
								label={skill}
								onDelete={() => {
									setDetails({
										...details,
										skills: details.skills?.filter((s) => s !== skill),
									});
								}}
							/>
						))}
					</Grid>
				</Grid>
			</AccordionDetails>
		</Accordion>
	);
};
