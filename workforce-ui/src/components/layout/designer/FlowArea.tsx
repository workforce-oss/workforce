import { useCallback, useEffect, useMemo, useRef } from "react";
import ReactFlow, { Background, BackgroundVariant, Controls, MarkerType, MiniMap, useReactFlow } from "reactflow";
import { ObjectSubtype, ObjectType, BaseConfig } from "workforce-core/model";
import { useStore } from "zustand";
import { shallow } from "zustand/shallow";
import { flowStates, metaStore } from "../../../state/store.meta";
import { CustomEdge } from "../../edges/CustomEdge";
import { ChannelNode } from "../../nodes/ChannelNode";
import { CredentialNode } from "../../nodes/CredentialNode";
import { ResourceNode } from "../../nodes/ResourceNode";
import { TaskNode } from "../../nodes/TaskNode";
import { ToolNode } from "../../nodes/ToolNode";
import { TrackerNode } from "../../nodes/TrackerNode";
import { WorkerNode } from "../../nodes/WorkerNode";
import { DocumentationNode } from "../../nodes/DocumentationNode";

const selector = (state) => ({
    nodes: state.nodes,
    edges: state.edges,
    onNodesChange: state.onNodesChange,
    onEdgesChange: state.onEdgesChange,
    onConnect: state.onConnect,
    addNode: state.addNode,
    addNodeType: state.addNodeType,
    removeNode: state.removeNode,
    undo: state.undo,
    redo: state.redo,
    setCredentials: state.setCredentials,
    flow: state.flow,
});

const metaSelector = (state) => ({
    selectedFlow: state.selectedFlow,
    credentials: state.credentials,
    updateFlow: state.updateFlow,
})

export const FlowArea = (props: {}) => {
    const reactFlowWrapper = useRef(null);

    const {
        selectedFlow,
        credentials,
        updateFlow,
    } = metaStore(metaSelector, shallow);

    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        addNode,
        removeNode,
        addNodeType,
        setCredentials,
        flowData,
    } = flowStates.get(selectedFlow.id)(selector, shallow);
    const { undo, redo } = useStore(flowStates.get(selectedFlow.id).temporal, selector, shallow);

    const reactFlowInstance = useReactFlow();

    const nodeTypes = useMemo(() => ({
        resource: ResourceNode,
        worker: WorkerNode,
        task: TaskNode,
        tool: ToolNode,
        tracker: TrackerNode,
        channel: ChannelNode,
        credential: CredentialNode,
        documentation: DocumentationNode,
    }), []);
    const edgeTypes = useMemo(() => ({
        custom: CustomEdge,
    }), []);
    const edgeOptions = useMemo(() => ({
        markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "black",
            width: 25,
            height: 25,
        }
    }), []);

    useEffect(() => {
        // this effect is used to attach the global event handlers

        const onKeyDown = (event: KeyboardEvent) => {
            if (
                (event.ctrlKey || event.metaKey) &&
                event.key === "z") {
                event.preventDefault();
                undo();
            }
            if (
                (event.ctrlKey || event.metaKey) &&
                event.key === "y") {
                event.preventDefault();
                redo();
            }
            if (
                (event.ctrlKey || event.metaKey) &&
                (event.shiftKey && event.key === "z")) {
                event.preventDefault();
                redo();
            }
            if (event.key === "Delete" || event.key === "Backspace") {
                for (const edge of edges) {
                    if (edge.selected) {
                        console.log("deleting edge")
                        event.preventDefault();
                        onEdgesChange([{ type: "remove", id: edge.id }]);
                    }
                }
            }

        };

        document.addEventListener("keydown", onKeyDown);

        return () => {
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [edges, onEdgesChange, undo, redo]);

    useEffect(() => {
        if (flowData) {
            updateFlow(flowData.flow);
        }
    }, [flowData]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            // Get the current bounds of the ReactFlow wrapper element
            const reactflowBounds = reactFlowWrapper.current.getBoundingClientRect();

            const position = reactFlowInstance.project({
                x: event.clientX - reactflowBounds.left,
                y: event.clientY - reactflowBounds.top,
            });

            let data: { type: ObjectType; subtype: ObjectSubtype, config?: BaseConfig } = JSON.parse(
                event.dataTransfer.getData("json")
            );
            console.log(`Dropped ${data.type} ${data.subtype}`);
            console.log(data);
            addNodeType("", data.type, data.subtype, position, data.config);
        },
        // Specify dependencies for useCallback
        [addNodeType, reactFlowInstance]
    );
    const edgeUpdateSuccessful = useRef(true);

    const onEdgeUpdateStart = useCallback(() => {
        edgeUpdateSuccessful.current = false;
    }, []);

    const onEdgeUpdate = useCallback((oldEdge, newConnection) => {
        edgeUpdateSuccessful.current = true;
        onConnect(newConnection);
    }, [onConnect]);

    const onEdgeUpdateEnd = useCallback((_, edge) => {
        if (!edgeUpdateSuccessful.current) {
            onEdgesChange([{ type: "remove", id: edge.id }]);
        }

        edgeUpdateSuccessful.current = true;
    }, [onEdgesChange]);

    return (
        <div className="flex-1 h-full flex flex-col" ref={reactFlowWrapper}>
            <>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onEdgeUpdateStart={onEdgeUpdateStart}
                    onEdgeUpdate={onEdgeUpdate}
                    onEdgeUpdateEnd={onEdgeUpdateEnd}
                    defaultEdgeOptions={edgeOptions}

                    maxZoom={1}
                    minZoom={0.1}
                    fitView

                >
                    <Background className="dark:bg-gray-900" variant={BackgroundVariant.Lines} />
                    <Controls className="[&>button]:text-black  [&>button]:dark:bg-gray-800 hover:[&>button]:dark:bg-gray-700 [&>button]:dark:text-gray-400 [&>button]:dark:fill-gray-400 [&>button]:dark:border-gray-600"></Controls>
                    <MiniMap className="dark:bg-gray-800" />
                </ReactFlow>

            </>
        </div>
    )


}