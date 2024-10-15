import { shallow } from "zustand/shallow";
import { RFState } from "../../../state/store.flow";
import { MetaState, flowStates, metaStore } from "../../../state/store.meta";
import { replacer } from "../../../util/json";
import { SvgIcon } from "@mui/material";
import { Save } from "@mui/icons-material";

const selector = (state: RFState) => ({
	flowData: state.flowData,
});

const metaSelector = (state: MetaState) => ({
	saveFlow: state.saveFlow,
});

export const SaveButton = (props: { id: string }) => {
	const { id } = props;
	const { flowData } = flowStates.get(id)(selector, shallow);
	const { saveFlow } = metaStore(metaSelector, shallow);

	return (
		<button
			onClick={() => {
				console.log("Saving flow:", JSON.stringify(flowData.flow, replacer, 2));
				saveFlow(flowData.flow);
			}}
			className="shadow mr-1 rounded-full"
		>
			<SvgIcon component={Save} />
		</button>
	);
};
