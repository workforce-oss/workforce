import { ToolConfig } from "workforce-core/model";
import { CustomNodeData } from "../../nodes/nodeData";
import { CustomColors } from "../../util/util";
import { GenericNode } from "./GenericNode";
import { flowStates, metaStore } from "../../state/store.meta";
import { shallow } from "zustand/shallow";
import _ from "lodash";
import { useEffect } from "react";

const metaSelector = (state) => ({
	selectedFlow: state.selectedFlow,
	updateFlow: state.updateFlow,
});

const selector = (state) => ({
	flow: state.flow,
	updateNodeData: state.updateNodeData,
});

export const ToolNode = ({ data, selected }: { data: CustomNodeData<ToolConfig>; selected: boolean }) => {
	const { selectedFlow, updateFlow } = metaStore(metaSelector, shallow);
	const { updateNodeData, flowData } = flowStates.get(selectedFlow.id)(selector, shallow);

	useEffect(() => {
    if (flowData) {
		  updateFlow(flowData.flow);
    }
	}, [flowData]);

	return (
		<GenericNode data={data} selected={selected} children={""} headerColor={CustomColors.tool} />
	);
};
