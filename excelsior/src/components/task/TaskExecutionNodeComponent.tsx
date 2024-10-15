import { TaskExecutionTreeNode } from "workforce-ui-core";

export const TaskExecutionNodeComponent = (props: {
    taskExecutionTreeNode: TaskExecutionTreeNode,
    selectedTaskExecutionId: string | null,
    depth?: number,
}) => {
    const { taskExecutionTreeNode, selectedTaskExecutionId } = props;

    const isSelected = taskExecutionTreeNode.data.id === selectedTaskExecutionId;

    return (
        <div>
            <div
                className="relative inline-flex mt-4 pt-1 pb-1 pl-2 pr-2 cursor-pointer rounded-lg"
                style={{
                    marginLeft: `${(props.depth ?? 0) + 1}rem`,
                    backgroundColor: isSelected ? "rgba(0, 0, 0, 0.5)" : "transparent",
                    border: isSelected ? "2px solid white" : "1px dashed gray",
                }}
            >
                {taskExecutionTreeNode.data.taskName ?? "Task"}
            </div>
            <div>
                {taskExecutionTreeNode.children.map((child) => (
                    <TaskExecutionNodeComponent
                        key={child.data.id}
                        taskExecutionTreeNode={child}
                        selectedTaskExecutionId={selectedTaskExecutionId}
                        depth={(props.depth ?? 0) + 1}
                    />
                ))}
            </div>
        </div>
    )
}
