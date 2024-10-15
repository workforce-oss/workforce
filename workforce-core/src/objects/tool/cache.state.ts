import { AsyncMap } from "../../manager/impl/cache/async_map.js";
import { MapFactory } from "../../manager/impl/map_factory.js";

export class ToolStateCache {
    taskExecutionIdsToToolState: AsyncMap<string>;

    private constructor(taskExecutionIdsToToolState: AsyncMap<string>) {
        this.taskExecutionIdsToToolState = taskExecutionIdsToToolState;
    }

    static async for(toolId: string): Promise<ToolStateCache> {
        const taskExecutionIdsToToolState = await MapFactory.for<string>(`tool:${toolId}`, 'taskExecutionIdsToToolState');
        const cache = new ToolStateCache(taskExecutionIdsToToolState);
        return cache;
    }
    
}