import { useEffect, useState } from "react";
import { TaskExecutionDataState, TaskExecutionTreeNode, findRootNode, taskExecutionDataStore } from "workforce-ui-core";
import { shallow } from "zustand/shallow";
import { TaskExecutionNodeComponent } from "./TaskExecutionNodeComponent";


const selector = (state: TaskExecutionDataState) => {
    return {
        taskExecutionTree: state.taskExecutionTree,
        taskExecutions: state.taskExecutions,
    };
}

export const TaskExecutionListComponent = (props: {
    selectedTaskExecutionId?: string;
}) => {
    const { selectedTaskExecutionId } = props;
    const {
        taskExecutionTree,
    } = taskExecutionDataStore(selector, shallow);

    const [rootNode, setRootNode] = useState<TaskExecutionTreeNode | null>(null);

    useEffect(() => {
        if (selectedTaskExecutionId) {
            const rootNode = findRootNode(taskExecutionTree, selectedTaskExecutionId);
            setRootNode(rootNode);
        }
    }, [taskExecutionTree, selectedTaskExecutionId]);

    return (
        <div className="sticky top-0 w-auto">

            {rootNode &&
                <TaskExecutionNodeComponent
                    key={rootNode.data.id}
                    taskExecutionTreeNode={rootNode}
                    selectedTaskExecutionId={selectedTaskExecutionId}
                    depth={0}
                />
            }
        </div>

    )
}

