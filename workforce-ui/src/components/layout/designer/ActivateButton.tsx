import { shallow } from "zustand/shallow";
import { RFState } from "../../../state/store.flow";
import { MetaState, flowStates, metaStore } from "../../../state/store.meta";
import { SvgIcon } from "@mui/material";
import { ToggleOffOutlined, ToggleOn } from "@mui/icons-material";
import { update } from "lodash";

const selector = (state: RFState) => ({
	flowData: state.flowData,
    updateFlowState: state.updateFlowState,
});

const metaSelector = (state: MetaState) => ({
    toggleFlowActive: state.toggleFlowActive,
});


export const ActivateButton = (props: { id: string }) => {
    const { id } = props;
    const { flowData, updateFlowState } = flowStates.get(id)(selector, shallow);
    const { toggleFlowActive } = metaStore(metaSelector, shallow);
	return (
		<button
			onClick={() => {
                updateFlowState(flowData.flow.status === "inactive");
				toggleFlowActive(flowData.flow);
			}}
			className="shadow mr-1 rounded-full"
		>
			{flowData.flow.status === "inactive" ? (
				<SvgIcon component={ToggleOffOutlined} />
			) : (
				<SvgIcon component={ToggleOn} color="success" />
			)}
		</button>
	);
};
