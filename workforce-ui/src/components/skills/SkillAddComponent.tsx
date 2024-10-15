import { shallow } from "zustand/shallow";
import { SkillState, skillStore } from "../../state/store.skills";
import { useState } from "react";
import { Card, CardContent, Grid, IconButton, TextField, Typography } from "@mui/material";
import { AddCard, Cancel, Save } from "@mui/icons-material";
import { ContextState, contextStore } from "../../state/store.context";

const selector = (state: SkillState) => ({
	addSkill: state.addSkill,
});

const contextSelector = (state: ContextState) => ({
    currentOrg: state.currentOrg,
});


export const SkillAddComponent = () => {
	const { addSkill } = skillStore(selector, shallow);
	const { currentOrg } = contextStore(contextSelector, shallow);
	const [editting, setEditting] = useState(false);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");


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
								setName(e.target.value);
							}}
						/>
					</Grid>
					<Grid item xs={6}>
						<div className="flex flex-row justify-between items-center">
							<div className="flex-grow"></div>

							<IconButton
								onClick={() => {
									addSkill({
										name: name,
										orgId: currentOrg.id,
										description: description,
									});
									setEditting(false);
								}}
							>
								<Save />
							</IconButton>
							<IconButton onClick={() => setEditting(false)}>
								<Cancel />
							</IconButton>
						</div>
					</Grid>
					<Grid item xs={12}>
						<TextField
							placeholder="Description"
							multiline
                            rows={4}
                            fullWidth
							value={description}
							onChange={(e) => {
								setDescription(e.target.value);
							}}
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
				Add Skill
			</Typography>
			<IconButton
				onClick={() => {
					setName("");
					setDescription("");
					setEditting(true);
				}}
			>
				<AddCard />
			</IconButton>
		</div>
	);
};
