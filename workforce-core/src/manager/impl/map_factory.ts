import { Configuration } from "../../config/configuration.js";
import { Logger } from "../../logging/logger.js";
import { AsyncMap } from "./cache/async_map.js";
import { InMemoryAsyncMap } from "./cache/in_memory_async_map.js";
import { RedisAsyncMap } from "./cache/redis_async_map.js";

export class MapFactory {

    static destroy() {
        switch (Configuration.CacheMode) {
            case "redis":
                RedisAsyncMap.destroy();
                break;
            case "in-memory":
                Logger.getInstance("MapFactory").warn(`Destroying in-memory cache`);
                break;
            default:
                Logger.getInstance("MapFactory").warn(`Unknown cache mode: ${Configuration.CacheMode}. Destroying in-memory cache`);
                break;
        }
    }

    static async for<T>(tableName: string, objectId: string): Promise<AsyncMap<T>> {
        switch (Configuration.CacheMode) {
            case "redis":
                return await RedisAsyncMap.for<T>(tableName, objectId);
            case "in-memory":
                return await InMemoryAsyncMap.for<T>(tableName, objectId);
            default:
                Logger.getInstance("MapFactory").warn(`Unknown cache mode: ${Configuration.CacheMode}. Using in-memory cache`);
                return await InMemoryAsyncMap.for<T>(tableName, objectId);
        }
    }
}