import { WorkerConfig } from "workforce-core/model";
import { CustomNodeData } from "../../nodes/nodeData";
import { CustomColors } from "../../util/util";
import { GenericNode } from "./GenericNode";

export const WorkerNode = ({ data, selected }: { data: CustomNodeData<WorkerConfig>, selected: boolean }) => {
    return (
        <GenericNode readOnly={true} data={data} objectType="worker" selected={selected} children={""} headerColor={CustomColors.worker} />
    )
}