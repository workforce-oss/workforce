import { Add, ArrowDownward, ArrowUpward, Edit } from "@mui/icons-material";
import { Chip, Color, MenuItem, SvgIcon, TextField } from "@mui/material";
import _ from "lodash";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { BaseConfig, TaskConfig, VariablesSchemaFactory, CredentialConfig } from "workforce-core/model";

import { shallow } from "zustand/shallow";
import { CustomNodeData } from "../../nodes/nodeData";
import { CredentialState, credentialStore } from "../../state/store.credentials";
import { flowStates, metaStore } from "../../state/store.meta";
import { SkillState, skillStore } from "../../state/store.skills";
import { CustomIcons, classNames } from "../../util/util";
import { ConnectionComponent } from "../ConnectionComponent";
import { NodeIconMenu } from "../NodeIconMenuComponent";
import { SchemaVariableListComponent } from "../SchemaVariableListComponent";


import { Node } from "reactflow";
import { RFState } from "../../state/store.flow";
import { ContextState, contextStore } from "../../state/store.context";

const selector = (state: RFState) => ({
	updateNodeData: state.updateNodeData,
	updateNodeVariables: state.updateNodeVariables,
	updateNodeCredential: state.updateNodeCredential,
	addInputToTask: state.addInputToTask,
	removeInputFromTask: state.removeInputFromTask,
	updateInputForTask: state.updateInputForTask,
	renameNode: state.renameNode,
	nodes: state.nodes,
});

const credentialSelector = (state: CredentialState) => ({
	credentials: state.credentials,
	hydrateCredentials: state.hydrate,
});

const metaSelector = (state) => ({
	selectedFlow: state.selectedFlow,
	flows: state.flows,
	addFlow: state.addFlow,
	renameFlow: state.renameFlow,
	selectFlow: state.selectFlow,
	updateFlow: state.updateFlow,
	setChatActive: state.setChatActive,
});

const skillSelector = (state: SkillState) => ({
	skills: state.skills,
});

const contextSelector = (state: ContextState) => ({
	currentOrg: state.currentOrg,
});

export const GenericNode = <T extends BaseConfig>({
	data,
	selected,
	headerColor,
	children,
	additionalConfiguration,
	configType,
	readOnly,
	hideVariables,
}: {
	data: CustomNodeData<T>;
	selected: boolean;
	headerColor: Color;
	children: ReactNode;
	additionalConfiguration?: ReactNode;
	configType?: string;
	readOnly?: boolean;
	hideVariables?: boolean;
}) => {
	const { selectedFlow, updateFlow } = metaStore(metaSelector, shallow);
	const { skills } = skillStore(skillSelector, shallow);
	const { credentials, hydrateCredentials } = credentialStore(credentialSelector, shallow);
	const { currentOrg } = contextStore(contextSelector, shallow);

	const { updateNodeData, updateNodeVariables, updateNodeCredential, nodes, addInputToTask, removeInputFromTask, updateInputForTask, renameNode } = flowStates.get(
		selectedFlow.id
	)(selector, shallow);
	const paramsRef = useRef(null);

	const [configExpanded, setConfigExpanded] = useState(false);
	const [advancedConfigExpanded, setAdvancedConfigExpanded] = useState(false);
	const [descriptionExpanded, setDescriptionExpanded] = useState(false);
	const [skillsExpanded, setSkillsExpanded] = useState(false);
	const [selectedSkill, setSelectedSkill] = useState(skills && skills.length > 0 ? skills[0].name : "");
	const [resizeTracker, setResizeTracker] = useState(0);

	const [updatingName, setUpdatingName] = useState(false);
	const [active, setActive] = useState(false);
	const [credentialList, setCredentialList] = useState<CredentialConfig[]>([]);

	const [node, setNode] = useState<Node<CustomNodeData<T>>>(nodes.find((n: Node<CustomNodeData<T>>) => n.id === data.config.id));

	const hasAdvanced = useMemo(() => {
		const schema = VariablesSchemaFactory.for(data.config);
		let adv = false;
		for (const key in schema) {
			if (schema[key].advanced) {
				adv = true;
				break;
			}
		}
		return adv;
	}, [data.config]);

	useEffect(() => {
		const updatedNode = nodes.find((n: Node<CustomNodeData<T>>) => n.id === data.config.id);
		setNode(updatedNode);
	}, [nodes]);

	const onResize = (e) => {
		setResizeTracker(resizeTracker + 1);
	};

	function onPropertyChange(propertyName: string, newValue: string | number | boolean) {
		console.log("onPropertyChange", node.id, propertyName, newValue);
		try {
			const newData = _.cloneDeep(node.data);
			const config = newData.config;
			console.log("onPropertyChange", config, propertyName, newValue)
			if (!config) {
				console.error("Node does not implement Configurable interface");
				return;
			}
			if (propertyName === "credential") {
				updateNodeCredential(node.id, newValue as string);
				return;
			}
			config.variables[propertyName] = newValue;
			updateNodeVariables(node.id, config.variables);
		} catch (e) {
			console.error(e);
		}
	}

	const handleKeyDown = (e) => {
		if (e.key === "Enter") {
			setUpdatingName(false);
		}
	};

	useMemo(() => {
		if (data.config.type !== "task" && data.config.type !== "documentation") {
			hydrateCredentials(currentOrg?.id);
		}
	}, [currentOrg]);

	useEffect(() => {
		if (data.config.type !== "task" && data.config.type !== "documentation" && credentials && credentials.length > 0) {
			setCredentialList(credentials.filter((credential) => credential.subtype === data.config.subtype));
		}
	}, [credentials]);

	useEffect(() => {
		if (credentialList.length > 0 && node?.data.config.credential === undefined) {
			updateNodeCredential(data.config.id, credentialList[0].name as string);
		}
	}, [credentialList]);

	if (!node) {
		return <></>;
	}

	const customIcon = CustomIcons.icons.get((data.config as BaseConfig).subtype);
	
	return (
		<div
			className={classNames(
				selected ? "border-2 border-blue-500" : "border dark:border-gray-700",
				"prompt-node relative bg-white dark:bg-gray-900 rounded-lg flex flex-col justify-center"
			)}
		>
			<div
				className="w-full dark:text-white text-white flex items-center justify-between p-4 gap-8 rounded-t-lg border-b dark:border-b-gray-700"
				style={{
					backgroundColor: headerColor[900],
					animation: active ? "pulse 1s infinite" : "none",
				}}
			>
				{/**Header Area */}
				<div className="w-full flex items-center truncate gap-2 text-lg">
					<div className="w-4 h-full">
						<SvgIcon component={customIcon}></SvgIcon>
					</div>
					{updatingName ? (
						<input
							className="text-black nodrag"
							type="text"
							value={node.data.config.name}
							onChange={(e) => {
								if (e.target.value === "") {
									return;
								}
								renameNode(node.id, e.target.value);
							}}
							onBlur={() => {
								setUpdatingName(false);
							}}
							onKeyDown={handleKeyDown}
							autoFocus
						></input>
					) : (
						<div className="ml-2 truncate text-lg font-bold">{node.data.config.name}</div>
					)}
					{node.data.config.type !== "credential" && !readOnly ? (
						<button
							onClick={() => {
								setUpdatingName(true);
							}}
							className="p-1 m-1 rounded-full hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
						>
							<Edit></Edit>
						</button>
					) : null}

					<NodeIconMenu nodeId={node.id} flow={selectedFlow} />
				</div>
			</div>
			{/** Body */}
			<div className="w-full h-full">
				{children}
				<div
					className="w-full dark:text-white flex items-center justify-between p-4 gap-8 bg-gray-10 dark:bg-gray-800 border dark:border-b-gray-700 "
					onClick={(e) => {
						setDescriptionExpanded(!descriptionExpanded);
					}}
					style={{ cursor: "pointer" }}
				>
					<div className="nodrag w-full flex items-center truncate gap-2 text-lg">
						<div className="ml-2 truncate">Description</div>
						<div className="text-end grow pr-2">
							{descriptionExpanded ? <ArrowUpward /> : <ArrowDownward />}{" "}
						</div>
					</div>
				</div>
				{descriptionExpanded ? (
					<div className="h-auto w-auto py-4">
						<article
							className="w-full text-gray-700 dark:text-gray-300 px-5 pb-3 text-sm prose prose-slate"
							dangerouslySetInnerHTML={{ __html: node.data.config.description }}
						></article>
					</div>
				) : null}
				{hideVariables ? null : (
					<div
						className="w-full dark:text-white flex items-center justify-between p-4 gap-8 bg-gray-10 dark:bg-gray-800 border dark:border-b-gray-700 "
						onClick={(e) => {
							setConfigExpanded(!configExpanded);
						}}
						style={{ cursor: "pointer" }}
					>
						<div className="nodrag w-full flex items-center truncate gap-2 text-lg">
							<div className="ml-2 truncate">Configuration</div>
							<div className="text-end grow pr-2">
								{configExpanded ? <ArrowUpward /> : <ArrowDownward />}{" "}
							</div>
						</div>
					</div>
				)}
				{configExpanded && !hideVariables ? (
					<div className="h-auto w-auto">
						{node.data.config.type !== "task" && node.data.config.type !== "documentation" && credentialList && credentialList.length > 0?
							<div className="h-auto w-auto py-4">
								<div className="w-full">
									<div className={"flex flex-row flex-start items-center ml-8"}>
										<div className={"text-sm truncate"}>Integration</div>
										<select
											value={node.data.config.credential ?? ((credentialList.length > 0) ? credentialList[0].name : "")}
											onChange={(e) => {
												updateNodeCredential(node.id, e.target.value as string);
											}}
											className="nodrag block ml-2 form-select dark:bg-gray-900 dark:border-gray-600 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
										>
											{credentialList.map((credential) => {
												return (
													<option value={credential.name} key={credential.name} selected={node.data.config.credential === credential.name}>
														{credential.name}
													</option>
												);
											})}
										</select>
									</div>
								</div>
							</div>
							: null}
						{additionalConfiguration}
						<SchemaVariableListComponent
							readOnly={readOnly}
							config={node.data.config}
							onPropertyChange={onPropertyChange}
							onResize={onResize}
						/>
					</div>
				) : null}
				{(hideVariables || !hasAdvanced) ? null : (
					<div
						className="w-full dark:text-white flex items-center justify-between p-4 gap-8 bg-gray-10 dark:bg-gray-800 border dark:border-b-gray-700 "
						onClick={(e) => {
							setAdvancedConfigExpanded(!advancedConfigExpanded);
						}}
						style={{ cursor: "pointer" }}
					>
						<div className="nodrag w-full flex items-center truncate gap-2 text-lg">
							<div className="ml-2 truncate">Advanced Configuration</div>
							<div className="text-end grow pr-2">
								{advancedConfigExpanded ? <ArrowUpward /> : <ArrowDownward />}{" "}
							</div>
						</div>
					</div>
				)}
				{!hideVariables && hasAdvanced && advancedConfigExpanded ? (
					<div className="h-auto w-auto">
						<SchemaVariableListComponent
							readOnly={readOnly}
							config={node.data.config}
							onPropertyChange={onPropertyChange}
							onResize={onResize}
							advanced={true}
						/>
					</div>
				) : null}
				{node.data.config.type === "task" ? (
					<div
						className="w-full dark:text-white flex items-center justify-between p-4 gap-8 bg-gray-10 dark:bg-gray-800 border dark:border-b-gray-700 "
						onClick={(e) => {
							setSkillsExpanded(!skillsExpanded);
							setTimeout(() => {
								onResize(null);
							}, 100);
						}}
						style={{ cursor: "pointer" }}
					>
						<div className="nodrag w-full flex items-center truncate gap-2 text-lg">
							<div className="ml-2 truncate">Required Skills</div>
							<div className="text-end grow pr-2">
								{skillsExpanded ? <ArrowUpward /> : <ArrowDownward />}{" "}
							</div>
						</div>
					</div>
				) : null}
				{node.data.config.type === "task" && skillsExpanded ? (
					<div className="h-auto w-auto py-4">
						<div className="w-full">
							<div className={"flex flex-row flex-start items-center ml-8"}>
								<div className={"text-sm truncate"}>Add Skill</div>
								<select
									defaultValue={skills && skills.length > 0 ? skills[0].name : ""}
									onChange={(e) => {
										setSelectedSkill(e.target.value);
									}}
									className="nodrag block ml-2 form-select dark:bg-gray-900 dark:border-gray-600 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
								>
									{skills.map((skill) => {
										return (
											<option value={skill.name} key={skill.name}>
												{skill.name}
											</option>
										);
									})}
								</select>
								<button
									onClick={() => {
										const newData = _.cloneDeep(node.data);
										(newData.config as TaskConfig).requiredSkills = [
											...new Set([
												...((node.data.config as TaskConfig).requiredSkills ?? []),
												selectedSkill,
											]),
										];
										updateNodeData(node.id, newData);
									}}
									className="p-1 m-1 rounded-full hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
								>
									<Add></Add>
								</button>
							</div>
							<div className={"flex flex-row flex-start items-center ml-8 mt-3"}>
								{(node.data.config as TaskConfig).requiredSkills?.map((skill) => (
									<Chip
										key={skill}
										style={{ margin: 2 }}
										label={skill}
										onDelete={() => {
											const newData = _.cloneDeep(data);
											(newData.config as TaskConfig).requiredSkills = (
												node.data.config as TaskConfig
											).requiredSkills?.filter((s) => s !== skill);
											updateNodeData(node.id, newData);
										}}
									/>
								))}
							</div>
						</div>
					</div>
				) : null}
			</div>

			{/** Inputs/Outputs */}
			<div className="w-full flex justify-center bg-gray-50 dark:bg-gray-800" ref={paramsRef}>
				<div className="flex-1">
					{node.data.inputs?.map((output, index) => {
						return (
							<ConnectionComponent
								propertyName={output}
								type="input"
								nodeId={node.id}
								key={index}
								parentExpanded={configExpanded}
								descriptionExpanded={descriptionExpanded}
								resizeTracker={resizeTracker}
								configType={configType}
							/>
						);
					})}
				</div>
				<div className="flex-1">
					{node.data.outputs?.map((output, index) => {
						return (
							<ConnectionComponent
								propertyName={output}
								type="output"
								nodeId={node.id}
								key={index}
								parentExpanded={configExpanded}
								descriptionExpanded={descriptionExpanded}
								resizeTracker={resizeTracker}
								configType={configType}
							/>
						);
					})}
				</div>
			</div>
			{node.data.config.type === "task" ? (
				<div className="w-full flex justify-center bg-gray-50 dark:bg-gray-800" ref={paramsRef}>
					<div className="flex-1">
						{Object.keys((node.data.config as TaskConfig).inputs ?? {}).map((input: string, index: number) => {
							return (
								<ConnectionComponent
									propertyName={input}
									type="taskInput"
									nodeId={node.id}
									key={index}
									parentExpanded={configExpanded}
									descriptionExpanded={descriptionExpanded}
									resizeTracker={resizeTracker}
									configType={configType}
									editable={true}
									onChange={(value) => {
										updateInputForTask(node.id, input, value);
									}}
								/>
							);
						})}
						<div
							className="text-start py-2 px-3"
							style={{ cursor: "pointer" }}
							onClick={() => {
								addInputToTask(node.id, "newInput");
							}}
						>
							<Add></Add> Add Input
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
};
