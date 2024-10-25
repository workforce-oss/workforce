import { CustomColors } from "../../util/util";
import { GenericNode } from "./GenericNode";
import { CustomNodeData } from "../../nodes/nodeData";
import { TaskConfig } from "workforce-core/model";
import { RFState } from "../../state/store.flow";
import { flowStates, metaStore } from "../../state/store.meta";
import { shallow } from "zustand/shallow";
import _ from "lodash";

const selector = (state: RFState) => ({
	updateNodeData: state.updateNodeData,
})

const metaSelector = (state) => ({
	selectedFlow: state.selectedFlow,
});


export const TaskNode = ({ data, selected }: { data: CustomNodeData<TaskConfig>; selected: boolean }) => {
	const { selectedFlow } = metaStore(metaSelector, shallow);
	const { updateNodeData } = flowStates.get(selectedFlow.id)(selector, shallow);
	return (
		<GenericNode data={data} objectType="task" selected={selected} children={""} headerColor={CustomColors.task}
			additionalConfiguration={
				<div className="flex flex-wrap max-w-xl justify-between items-center dark:text-white mt-1 px-5 py-2">
					<div className="w-full">
						<div className={"text-sm truncate"}>
							<div className={"flex flex-row flex-start items-center mt-3"}>
								costLimit
							</div>
						</div>
						<input
							type="number"
							defaultValue={data.config.costLimit ?? 2.00}
							onChange={(e) => {
								const newData = _.cloneDeep(data);
								newData.config.costLimit = parseFloat(e.target.value);
								updateNodeData(data.config.id, newData);
							}}
							className="nodrag block w-full pr-12 form-input dark:bg-gray-900 dark:border-gray-600 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
						/>
					</div>
				</div>

			}
		/>
	);
};
