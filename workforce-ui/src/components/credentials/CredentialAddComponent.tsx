import { shallow } from "zustand/shallow";
import { CredentialState, credentialStore } from "../../state/store.credentials";
import { useEffect, useState } from "react";
import { ObjectSubtype, ObjectType, objectSubtypes, objectTypes, ConfigFactory, CredentialConfig } from "workforce-core/model";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import { Grid, IconButton, Input, MenuItem, Select, TextField, Typography } from "@mui/material";
import { AddCard, Cancel, Save } from "@mui/icons-material";
import { SchemaVariableListComponent } from "../SchemaVariableListComponent";
import { capitalize } from "../../util/util";
import { ContextState, contextStore } from "../../state/store.context";

const selector = (state: CredentialState) => ({
	addCredential: state.addCredential,
});

const contextSelector = (state: ContextState) => ({
    currentOrg: state.currentOrg,
});


export const CredentialAddComponent = () => {
	const { addCredential } = credentialStore(selector, shallow);

	const [editting, setEditting] = useState(false);
	const [name, setName] = useState("");
	const [selectedType, setSelectedType] = useState("channel");

	const subTypes = ConfigFactory.getSubtypesForType(selectedType as ObjectType).filter(s => s !== "mock") as string[];

	const { currentOrg } = contextStore(contextSelector, shallow);
	const [subtype, setSubtype] = useState("slack-channel" as string);
	const [details, setDetails] = useState<CredentialConfig>({
		name: "",
		orgId: currentOrg.id,
		subtype: subtype as ObjectSubtype,
		description: "",
		type: "credential",
		variables: {},
	});

	const reset = () => {
		setName("");
		setSelectedType(objectTypes[0] as string);
		setSubtype(ConfigFactory.getSubtypesForType(objectTypes[0]).filter(s => s !== "mock")[0]);
		setDetails({
			name: "",
			orgId: currentOrg.id,
			subtype: subtype as ObjectSubtype,
			description: "",
			type: "credential",
			variables: {},
		});
		setEditting(false);
	}


	useEffect(() => {
		setSubtype(subTypes[0]);
	}, [selectedType]);

	return editting ? (
		<Card
			style={{
				maxWidth: 800,
			}}
		>
			<CardContent>
				<Grid container spacing={2}>
					<Grid item xs={6}>
						<TextField
							placeholder="Name"
							value={name}
							onChange={(e) => {
								setDetails({
									...details,
									name: e.target.value,
								});
								setName(e.target.value);
							}}
						/>
					</Grid>
					<Grid item xs={6}>
						<div className="flex flex-row justify-between items-center">

							<div className="flex-grow"></div>

							<IconButton
								onClick={() => {
									addCredential({
										name,
										subtype,
										description: "",
										type: "credential",
										variables: details.variables,
									} as CredentialConfig);

									reset();
								}}
							>
								<Save />
							</IconButton>
							<IconButton onClick={() => reset()}>
								<Cancel />
							</IconButton>
						</div>
					</Grid>
					<Grid item xs={12}>
						<div className="flex flex-row justify-between items-center">
							<TextField
								label="Object Type"
								select
								style={{
									minWidth: 210,
								}}
								value={selectedType}
								onChange={(e) => {
									setSelectedType(e.target.value);
									setDetails({
										...details,
										subtype: ConfigFactory.getSubtypesForType(e.target.value as ObjectType).filter(s => s !== "mock")[0],
									});
								}}
							>
								{[...new Set(objectTypes.filter(t => t !== "credential" && t !== "task" && t !== "documentation"))].map((t) => (
									<MenuItem key={t} value={t}>{t}</MenuItem>
								))}
							</TextField>
						</div>
					</Grid>
					<Grid item xs={12}>
						<div className="flex flex-row justify-between items-center">
							<TextField
								label={`${capitalize(selectedType)} Type`}
								select
								style={{
									minWidth: 210,
								}}
								value={subtype}
								onChange={(e) => {
									setDetails({
										...details,
										subtype: e.target.value as ObjectSubtype,
									});
									setSubtype(e.target.value as ObjectSubtype);
								}}
							>
								{[...new Set(subTypes)].map((s) => (
									<MenuItem key={s} value={s}>{s}</MenuItem>
								))}
							</TextField>
						</div>
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
				Add Integration
			</Typography>
			<IconButton
				onClick={() => {
					setName("");
					setSubtype(objectSubtypes[0] as ObjectSubtype);
					setDetails({
						name: "",
						orgId: currentOrg.id,
						subtype: "mock",
						description: "",
						type: "credential",
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
