import { CopyAll, Delete } from "@mui/icons-material";
import { shallow } from "zustand/shallow";
import { flowStates,  } from "../state/store.meta";
import { FlowConfig } from "workforce-core/model";

const selector = (state) => ({
    nodes: state.nodes,
    removeNode: state.removeNode,
    duplicateNode: state.duplicateNode,
});


export const NodeIconMenu = (props: { nodeId: string, flow: FlowConfig}) => {
    const { nodes, removeNode, duplicateNode } = flowStates.get(props.flow.id)(selector, shallow);

    const node = nodes.find((node) => node.id === props.nodeId);

    if (!node) {
        return null;
    }
    return (
        <div className="text-end grow">
            <button
                onClick={() => {
                    const confirm = window.confirm(`Are you sure you want to delete ${node.data.config.name}?`);
                    if (confirm) {
                        removeNode(props.nodeId);
                    }
                }}
                className="p-1 m-1 rounded-full hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            >
                <Delete></Delete>
            </button>
            <button
                onClick={() => {
                    duplicateNode(props.nodeId);
                }}
                className="p-1 m-1 rounded-full hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
                <CopyAll></CopyAll>
            </button>
        </div>


    );
}