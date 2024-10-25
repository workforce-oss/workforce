import { CustomColors } from "../../util/util"
import { GenericNode } from "./GenericNode"
import { CustomNodeData } from "../../nodes/nodeData"
import { TrackerConfig } from "workforce-core/model"

export const TrackerNode = ({ data, selected }: { data: CustomNodeData<TrackerConfig>, selected: boolean }) => {
    return (
    <GenericNode data={data} objectType="tracker" selected={selected} children={""} headerColor={CustomColors.tracker}/>
    )
}