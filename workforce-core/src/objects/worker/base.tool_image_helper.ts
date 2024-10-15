import { Configuration } from "../../config/configuration.js";
import { Logger } from "../../logging/logger.js";
import { TaskDb } from "../task/db.js";
import { TaskExecutionDb } from "../task/db.task_execution.js";
import { ToolDb } from "../tool/db.js";
import { ToolStateDb } from "../tool/db.state.js";

export class ToolImageHelper {

    static getImageUrl(args: {
        toolId: string;
        taskExecutionId: string;

    }): string {
        const { toolId, taskExecutionId } = args;
        return `${Configuration.BaseUrl}/workforce-api/state-images?toolId=${toolId}&taskExecutionId=${taskExecutionId}`;
    }

    static async getAllImageUrls(args: {
        taskExecutionId: string;
    }): Promise<{
        imageUrl: string;
        taskName: string;
        toolName: string;
    }[]> {
        const { taskExecutionId } = args;
        const data = new Map<string, {
            taskName: string,
            toolName: string,
            toolId: string,
        }[]>();

        const taskExecution = await TaskExecutionDb.findOne({
            include: {
                model: TaskDb,
                required: true,
            },
            where: {
                id: taskExecutionId,
            },
        }).catch((e) => {
            Logger.getInstance("ToolImageHelper").error(`Error getting task execution: ${(e as Error).message}`, e);
            return undefined;
        });

        if (!taskExecution) {
            return [];
        }

        await ToolImageHelper.getRelatedData({
            taskExecutionId,
            taskName: taskExecution.task.name,
            parentTaskExecutionId: taskExecution.parentTaskExecutionId ?? undefined,
            currentData: data,
        }).catch((e) => {
            Logger.getInstance("ToolImageHelper").error(`Error getting related data: ${(e as Error).message}`, e);
        });

        const result: {
            imageUrl: string;
            taskName: string;
            toolName: string;
        }[] = [];
        for (const [key, value] of data) {
            for (const v of value) {
                result.push({
                    imageUrl: ToolImageHelper.getImageUrl({
                        toolId: v.toolId,
                        taskExecutionId: key,
                    }),
                    taskName: v.taskName,
                    toolName: v.toolName,
                });
            }
        }
        return result;
    }

    static async getRelatedData(args: {
        taskExecutionId: string,
        taskName: string,
        parentTaskExecutionId?: string,
        currentData: Map<string, {
            taskName: string;
            toolName: string;
            toolId: string;
        }[]>
    }): Promise<void> {
        const { taskExecutionId, parentTaskExecutionId, currentData } = args;

        if (!currentData.has(taskExecutionId)) {
            const thisState = await ToolStateDb.findAll({
                include: {
                    model: ToolDb,
                    required: true,
                },
                where: {
                    taskExecutionId,
                },
            });

            if (thisState.length > 0) {
                const rawData = thisState
                    .filter(state => state.machineImage !== null && state.machineImage !== undefined && state.machineImage !== "")
                    .map((s) => {
                        return {
                            taskName: args.taskName,
                            toolName: s.tool.name,
                            toolId: s.tool.id,
                        };
                    });

                // filter out duplicates
                const uniqueData = rawData.filter((v, i, a) => a.findIndex(t => (t.toolId === v.toolId)) === i);
                currentData.set(taskExecutionId, uniqueData);
            }
        }

        if (parentTaskExecutionId && !currentData.has(parentTaskExecutionId)) {
            const parentTaskExecution = await TaskExecutionDb.findOne({
                include: [{
                    model: TaskDb,
                    required: true,
                }],
                where: {
                    id: parentTaskExecutionId,
                },
            });
            if (parentTaskExecution) {
                await ToolImageHelper.getRelatedData({
                    taskExecutionId: parentTaskExecutionId,
                    taskName: parentTaskExecution.task.name,
                    parentTaskExecutionId: parentTaskExecution.parentTaskExecutionId ?? undefined,
                    currentData,
                });
            }
            const children = await TaskExecutionDb.findAll({
                include: {
                    model: TaskDb,
                    required: true,
                },
                where: {
                    parentTaskExecutionId,
                },
            });
            for (const child of children) {
                await ToolImageHelper.getRelatedData({
                    taskExecutionId: child.id,
                    taskName: child.task.name,
                    currentData,
                });
            }
        }
    }
}