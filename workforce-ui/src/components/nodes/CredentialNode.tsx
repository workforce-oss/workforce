import { useEffect, useState } from "react";
import { CustomColors } from "../../util/util";
import { GenericNode } from "./GenericNode";
import _ from "lodash";
import { flowStates, metaStore } from "../../state/store.meta";
import { shallow } from "zustand/shallow";
import { RFState } from "../../state/store.flow";
import { CustomNodeData } from "../../nodes/nodeData";
import { CredentialConfig, ObjectSubtype } from "workforce-core/model";

type CredentialTypeOptions = {
	value: ObjectSubtype;
	label: string;
};

const credentialTypeOptions: CredentialTypeOptions[] = [
	{ value: "github-repo-resource", label: "Github Repo" },
	{ value: "trello-tracker", label: "Trello" },
	{ value: "ai-worker", label: "AI Worker" },
	{ value: "native-channel", label: "Native Channel" },
	{ value: "slack-channel", label: "Slack Channel" },
	{ value: "discord-channel", label: "Discord Channel" },
];

const metaSelector = (state) => ({
	selectedFlow: state.selectedFlow,
});

const selector = (state) => ({
	updateNodeData: state.updateNodeData,
	flow: state.flow,
});

export const CredentialNode = ({ data, selected }: { data: CustomNodeData<CredentialConfig>; selected: boolean }) => {
	const { selectedFlow } = metaStore(metaSelector, shallow);

	const { flowData } = flowStates.get(selectedFlow.id)(selector, shallow) as RFState;
	const [type, setType] = useState<ObjectSubtype>(data.config.type as ObjectSubtype);

	useEffect(() => {
		const node = selectedFlow.nodes?.find((node) => node.id === data.config.id);
		if (node && node.data?.type !== type) {
			setType(node.data?.type as ObjectSubtype);
		}
	}, [data]);

	return (
		<GenericNode
			data={data}
			objectType="credential"
			selected={selected}
			headerColor={CustomColors.credential}
			readOnly={true}
			configType={type}
			hideVariables={true}
			children={
				<div className="flex flex-row w-full p-4 ml-2 pr-8">
					<label className="text-lg">Type</label>{" "}
					<select
						disabled={true}
						className="w-48 ml-2 pl-4 h-8 rounded-md border border-gray-300 text-lg text-gray-800"
						value={type}
					>
						{credentialTypeOptions.map((option) => {
							return (
								<option value={option.value} key={option.value}>
									{option.label}
								</option>
							);
						})}
					</select>
				</div>
			}
		/>
	);
};
