import { shallow } from "zustand/shallow";
import { WorkerState, workerStore } from "../../state/store.workers";
import { useEffect, useMemo, useState } from "react";
import { CredentialConfig, WorkerConfig, objectSubtypes, WorkerType, workerTypes, ChannelType, channelTypes, ChannelUserCredential, channelUserCredentialTypes, ChannelUserCredentialType } from "workforce-core/model";
import { CredentialState, credentialStore } from "../../state/store.credentials";
import { SchemaVariableListComponent } from "../SchemaVariableListComponent";
import {
	Card,
	CardContent,
	Chip,
	Grid,
	IconButton,
	Input,
	List,
	ListItem,
	MenuItem,
	Select,
	TextField,
	Typography,
} from "@mui/material";
import { AddCard, Cancel, Label, Save } from "@mui/icons-material";
import { SkillState, skillStore } from "../../state/store.skills";
import { ContextState, contextStore } from "../../state/store.context";

const selector = (state: WorkerState) => ({
	addWorker: state.addWorker,
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

export const WorkerAddComponent = () => {
	const { addWorker } = workerStore(selector, shallow);
	const { credentials, hydrateCredentials } = credentialStore(credentialSelector, shallow);
	const [credentialList, setCredentialList] = useState<CredentialConfig[]>([]); // credentials.map((credential) => credential.name) as string[

	const { currentOrg } = contextStore(contextSelector, shallow);

	const { skills, hydrateSkills } = skillStore(skillSelector, shallow);

	const [editting, setEditting] = useState(false);
	const [details, setDetails] = useState<WorkerConfig>({
		name: "",
		orgId: currentOrg.id,
		subtype: "ai-worker",
		description: "",
		type: "worker",
		channelUserConfig: {
		} as Record<ChannelType, string>,
		variables: {},
	});
	useMemo(() => {
		hydrateCredentials(currentOrg?.id);
		hydrateSkills(currentOrg?.id);
	}, [currentOrg]);

	useEffect(() => {
		setCredentialList(credentials.filter((credential) => workerTypes.includes(credential.subtype as WorkerType)));
	}, [credentials]);

	return editting ? (
		<Card
			style={{
				maxWidth: 800,
			}}
		>
			<CardContent
				style={{
					padding: 8,
				}}
			>
				<Grid container spacing={2}>
					<Grid item xs={6}>
						<TextField
							placeholder="Name"
							value={details.name}
							onChange={(e) => {
								setDetails({
									...details,
									name: e.target.value,
								});
							}}
						/>
					</Grid>
					<Grid item xs={6}>
						<div className="flex flex-row justify-between items-center">
							<TextField
								label="Worker Type"
								select
								style={{
									minWidth: 235,
								}}
								value={details.subtype}
								onChange={(e) => {
									setDetails({
										...details,
										subtype: e.target.value as WorkerType,
									});
								}}
							>
								{[...new Set(workerTypes)].filter(t => t !== "mock").map((subtype) => (
									<MenuItem value={subtype} key={subtype}>{subtype}</MenuItem>
								))}
							</TextField>

							<div className="flex-grow"></div>
							<IconButton
								onClick={() => {
									addWorker({
										...details,
									});
									setEditting(false);
								}}
							>
								<Save />
							</IconButton>
							<IconButton
								onClick={() => {
									setEditting(false);
								}}
							>
								<Cancel />
							</IconButton>
						</div>
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
								<MenuItem value={credential.name} key={credential.name}>{credential.name}</MenuItem>
							))}
						</TextField>
					</Grid>
					<Grid item xs={6}>
						<TextField
							label="WIP Limit"
							type="number"
							value={details.wipLimit ?? 0}
							onChange={(e) => {
								setDetails({
									...details,
									wipLimit: parseInt(e.target.value ?? "0"),
								});
							}}
						/>
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
							onResize={(e) => {}}
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
									value={details.channelUserConfig ? details.channelUserConfig[channelType] ?? "" : ""}
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
							{skills?.map((skill) => (
								<MenuItem key={skill.name} value={skill.name}>
									{skill.name}
								</MenuItem>
							))}
						</TextField>
					</Grid>
					<Grid item xs={12}>
						{details.skills?.map((skill) => (
							<Chip
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
			</CardContent>
		</Card>
	) : (
		<div
			className="flex flex-row justify-between items-center"
			style={{
				maxWidth: 800,
				paddingLeft: "16px",
				paddingTop: "8px",
				paddingRight: "8px",
			}}
		>
			<Typography variant="h6" component="div">
				Add Worker
			</Typography>
			<IconButton
				onClick={() => {
					setDetails({
						name: "",
						orgId: currentOrg.id,
						subtype: "ai-worker",
						description: "",
						type: "worker",
						variables: {},
					});
					setEditting(true);
				}}
			>
				<AddCard />
			</IconButton>
		</div>
	);
};
