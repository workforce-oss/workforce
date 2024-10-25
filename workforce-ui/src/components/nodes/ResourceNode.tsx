import { CustomColors } from "../../util/util";
import { GenericNode } from "./GenericNode";
import { CustomNodeData } from "../../nodes/nodeData";
import { ResourceConfig } from "workforce-core/model";
import { flowStates, metaStore } from "../../state/store.meta";
import { shallow } from "zustand/shallow";
import _ from "lodash";
import { useEffect } from "react";

const metaSelector = (state) => ({
	selectedFlow: state.selectedFlow,
	updateFlow: state.updateFlow,
});

const selector = (state) => ({
	updateNodeData: state.updateNodeData,
	flow: state.flow,
});

export const ResourceNode = ({ data, selected }: { data: CustomNodeData<ResourceConfig>; selected: boolean }) => {
	const { selectedFlow, updateFlow } = metaStore(metaSelector, shallow);
	const { updateNodeData, flowData } = flowStates.get(selectedFlow.id)(selector, shallow);

	useEffect(() => {
    if (flowData) {
		  updateFlow(flowData.flow);
    }
	}, [flowData]);

	return (
		<GenericNode
			data={data}
			objectType="resource"
			selected={selected}
			children={""}
			headerColor={CustomColors.resource}
		/>
	);
};
