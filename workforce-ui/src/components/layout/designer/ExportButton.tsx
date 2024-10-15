import { shallow } from "zustand/shallow";
import { RFState } from "../../../state/store.flow";
import { flowStates } from "../../../state/store.meta";
import { FlowManager } from "../../../manager/flow_manager";
import { Download } from "@mui/icons-material";
import { SvgIcon } from "@mui/material";

const selector = (state: RFState) => ({
	flowData: state.flowData,
});

export const ExportButton = (props: { id: string }) => {
	const { id } = props;
	const { flowData } = flowStates.get(id)(selector, shallow);

	return (
		<button
			onClick={() => {
				const flowYaml = FlowManager.convertToYaml(flowData.flow);

				const blob = new Blob([flowYaml], {
					type: "application/yaml",
				});
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `${flowData.flow.name}.yaml`;
				a.click();
				URL.revokeObjectURL(url);
				a.remove();
			}}
			className="shadow mr-1 rounded-full"
		>
			<SvgIcon component={Download} />
		</button>
	);
};
