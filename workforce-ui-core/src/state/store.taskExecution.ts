import { TaskExecutionRequest, TaskExecution, TaskExecutionResponse } from "workforce-core/model";
import { create } from "zustand";

export type TaskExecutionTreeNode = {
    data: TaskExecution;
    children: TaskExecutionTreeNode[];
}

export type TaskExecutionDataState = {
    taskExecutionTree: TaskExecutionTreeNode[];
    taskExecutions: TaskExecution[];
    selectedTaskExecutionId: string | null;
    addTaskExecutions: (taskExecutions: TaskExecution[]) => void;
    removeTaskExecutionData: (id: string) => void;
    selectTaskExecutionData: (id: string) => void;
    updateTaskExecution: (taskExecutionData: TaskExecutionRequest | TaskExecutionResponse) => void;
    clearTaskExecutions: () => void;
}

export function findNode(taskExecutionTree: TaskExecutionTreeNode[], id: string): TaskExecutionTreeNode | undefined {
    for (const node of taskExecutionTree) {
        if (node.data.id === id) {
            return node;
        }
        if (node.children.length > 0) {
            const found = findNode(node.children, id);
            if (found) {
                return found;
            }
        }
    }
    console.log("Node not found", id);
    return undefined;
}

export function findRootNode(taskExecutionTree: TaskExecutionTreeNode[], id: string): TaskExecutionTreeNode | undefined {
    const node = findNode(taskExecutionTree, id);
    if (!node) {
        console.log("Node not found", id);
        return undefined;
    }

    if (node.data.parentTaskId === node.data.id) {
        console.log("Parent task id is same as task id", node.data.id);
        return node;
    }


    if (node.data.parentTaskId) {
        console.log("Finding parent task", node.data.parentTaskId);
        return findRootNode(taskExecutionTree, node.data.parentTaskId);
    }

    console.log("Root node found", node.data.id);
    return node;
}


function buildTaskExecutionTree(taskExecutions: TaskExecution[]): TaskExecutionTreeNode[] {
    const taskExecutionTree: TaskExecutionTreeNode[] = [];
    const taskExecutionMap: Record<string, TaskExecutionTreeNode> = {};

    taskExecutions.forEach((taskExecution) => {
        const taskExecutionNode: TaskExecutionTreeNode = {
            data: taskExecution,
            children: [],
        };
        taskExecutionMap[taskExecution.id] = taskExecutionNode;
    });

    taskExecutions.forEach((taskExecution) => {
        const taskExecutionNode = taskExecutionMap[taskExecution.id];
        if (taskExecution.parentTaskId && taskExecution.parentTaskId !== taskExecution.id) {
            const parentTaskExecutionNode = taskExecutionMap[taskExecution.parentTaskId];
            if (parentTaskExecutionNode) {
                parentTaskExecutionNode.children.push(taskExecutionNode);
            }
        } else {
            taskExecutionTree.push(taskExecutionNode);
        }
    });

    return taskExecutionTree;
}

function addTaskExecutionToTree(taskExecution: TaskExecution, taskExecutionTree: TaskExecutionTreeNode[]): TaskExecutionTreeNode[] {
    const taskExecutionNode: TaskExecutionTreeNode = {
        data: taskExecution,
        children: [],
    };

    if (taskExecution.parentTaskId && taskExecution.parentTaskId !== taskExecution.id) {
        const parentTaskExecutionNode = taskExecutionTree.find((node) => node.data.id === taskExecution.parentTaskId);
        if (parentTaskExecutionNode) {
            parentTaskExecutionNode.children.push(taskExecutionNode);
        } else {
            for (const node of taskExecutionTree) {
                const children = addTaskExecutionToTree(taskExecution, node.children);
                if (children.length > 0) {
                    node.children = children;
                    break;
                }
            }
        }
    } else {
        taskExecutionTree.push(taskExecutionNode);
    }

    return taskExecutionTree;
}

function removeTaskExecutionFromTree(id: string, taskExecutionTree: TaskExecutionTreeNode[]): TaskExecutionTreeNode[] {
    const newTaskExecutionTree: TaskExecutionTreeNode[] = [];
    for (const node of taskExecutionTree) {
        if (node.data.id === id) {
            continue;
        }
        if (node.children.length > 0) {
            node.children = removeTaskExecutionFromTree(id, node.children);
        }
        newTaskExecutionTree.push(node);
    }
    return newTaskExecutionTree;
}

export const taskExecutionDataStore = create<TaskExecutionDataState>()(
   (set, get: () => TaskExecutionDataState) => ({
        taskExecutionTree: [],
        taskExecutions: [],
        selectedTaskExecutionId: undefined,
        addTaskExecutions: (taskExecutions: TaskExecution[]) => {
            // Remove duplicates
            const newTaskExecutions = taskExecutions.filter((taskExecution) => !get().taskExecutions.some((s) => s.id === taskExecution.id));
            // set taskName for task executions based on task.name
            newTaskExecutions.forEach((taskExecution) => {
                if (!taskExecution.taskName) {
                   taskExecution.taskName = (taskExecution as any).task?.name ?? "unknown";
                }
            });
            const taskExecutionTree = buildTaskExecutionTree([...get().taskExecutions, ...newTaskExecutions]);
            console.log("addTaskExecutions", newTaskExecutions, taskExecutionTree);

            set({
                taskExecutionTree: buildTaskExecutionTree([...get().taskExecutions, ...newTaskExecutions]),
                taskExecutions: [...get().taskExecutions, ...newTaskExecutions],
            });

        },
        removeTaskExecutionData: (id: string) => {
            set({
                taskExecutionTree: removeTaskExecutionFromTree(id, get().taskExecutionTree),
                taskExecutions: get().taskExecutions.filter((s) => s.id !== id),
            });
        },
        selectTaskExecutionData: (id: string) => {
            if (get().selectedTaskExecutionId === id) {
                return;
            }
            set({
                selectedTaskExecutionId: id,
            });
        },
        updateTaskExecution: (taskExecutionData: TaskExecutionRequest | TaskExecutionResponse) => {
            try {
            let taskExecution: TaskExecution = get().taskExecutions.find((s) => s?.id === taskExecutionData.taskExecutionId);
            if (!taskExecution) {
                let status = "pending";
                if ((taskExecutionData as TaskExecutionResponse).result) {
                    status = typeof (taskExecutionData as TaskExecutionResponse).result === "string" ? "error" : "completed";
                }
                taskExecution = {
                    id: taskExecutionData.taskExecutionId,
                    taskId: taskExecutionData.taskId,
                    status: status,
                    timestamp: Date.now(),
                    inputs: (taskExecutionData as TaskExecutionRequest).inputs,
                    outputs: typeof (taskExecutionData as TaskExecutionResponse).result === "string" ? { error: (taskExecutionData as TaskExecutionResponse).result as string } : (taskExecutionData as TaskExecutionResponse).result as unknown as Record<string, string>,
                    orgId: taskExecutionData.orgId,
                    users: taskExecutionData.users,
                    parentTaskId: (taskExecutionData as TaskExecutionRequest).parentTaskExecutionId ?? taskExecutionData.taskExecutionId,
                    taskName: (taskExecutionData as TaskExecutionRequest).taskName,
                };

                let selectedTaskExecutionId = get().selectedTaskExecutionId;
                if ((taskExecutionData as TaskExecutionRequest).parentTaskExecutionId === selectedTaskExecutionId) {
                    selectedTaskExecutionId = taskExecutionData.taskExecutionId;
                }

                set({
                    selectedTaskExecutionId: selectedTaskExecutionId ?? get().selectedTaskExecutionId ?? taskExecution.id,
                    taskExecutionTree: addTaskExecutionToTree(taskExecution, get().taskExecutionTree),
                    taskExecutions: [...get().taskExecutions, taskExecution],
                });
            } else {
                set({
                    taskExecutions: get().taskExecutions.map((s) => {
                        if (s?.id === taskExecutionData.taskExecutionId) {
                            if ((taskExecutionData as TaskExecutionRequest).inputs) {
                                return {
                                    ...s,
                                    inputs: (taskExecutionData as TaskExecutionRequest).inputs,
                                    users: taskExecutionData.users,
                                };
                            } else {
                                return {
                                    ...s,
                                    status: typeof (taskExecutionData as TaskExecutionResponse).result === "string" ? "error" : "completed",
                                    outputs: typeof (taskExecutionData as TaskExecutionResponse).result === "string" ? { error: (taskExecutionData as TaskExecutionResponse).result as string } : (taskExecutionData as TaskExecutionResponse).result as unknown as Record<string, string>,
                                };
                            }
                        } else {
                            return s;
                        }
                    }),
                });
            }
            } catch (e) {
                console.error("Error updating task execution", e);
            }

        
        },
        updateTaskExecutionFromResponse: (taskExecutionData: TaskExecutionResponse) => {
            let taskExecution: TaskExecution = get().taskExecutions.find((s) => s.id === taskExecutionData.taskExecutionId);
            if (!taskExecution) {
                taskExecution = {
                    id: taskExecutionData.taskExecutionId,
                    taskId: taskExecutionData.taskId,
                    status: typeof taskExecutionData.result === "string" ? "error" : "completed",
                    timestamp: Date.now(),
                    outputs: typeof taskExecutionData.result === "string" ? { error: taskExecutionData.result } : taskExecutionData.result as unknown as Record<string, string>,
                    orgId: taskExecutionData.orgId,
                    users: taskExecutionData.users,
                    taskName: "unknown",
                };

                set({
                    taskExecutionTree: addTaskExecutionToTree(taskExecution, get().taskExecutionTree),
                    taskExecutions: [...get().taskExecutions, taskExecution],
                });
            } else {
                set({
                    taskExecutions: get().taskExecutions.map((s) => {
                        if (s.id === taskExecutionData.taskExecutionId) {
                            return {
                                ...s,
                                status: typeof taskExecutionData.result === "string" ? "error" : "completed",
                                outputs: typeof taskExecutionData.result === "string" ? { error: taskExecutionData.result } : taskExecutionData.result as unknown as Record<string, string>,
                            };
                        }
                        return s;
                    }),
                });
            }
        },
        clearTaskExecutions: () => {
            set({
                taskExecutionTree: [],
                taskExecutions: [],
            });
        }
    })
);