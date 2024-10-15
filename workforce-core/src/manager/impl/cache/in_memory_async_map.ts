/* eslint-disable @typescript-eslint/require-await */
import { Logger } from "../../../logging/logger.js";
import { AsyncMap } from "./async_map.js";

export class InMemoryAsyncMap<T> implements AsyncMap<T> {
    private map = new Map<string, T>();
    private logger = Logger.getInstance("InMemoryAsyncMap");
    private tableName: string;
    private objectId: string;

    constructor(tableName: string, objectId: string) {
        this.tableName = tableName;
        this.objectId = objectId
    }

    static async for<T>(tableName: string, objectId: string): Promise<InMemoryAsyncMap<T>>{
        return new InMemoryAsyncMap<T>(tableName, objectId);
    }

    async has(key: string): Promise<boolean> {
        return this.map.has(`${this.tableName}:${this.objectId}:${key}`);
    }

    async get(key: string): Promise<T | undefined> {
        return this.map.get(`${this.tableName}:${this.objectId}:${key}`);
    }

    async set(key: string, value: T): Promise<void> {
        this.map.set(`${this.tableName}:${this.objectId}:${key}`, value);
    }

    async delete(key: string): Promise<void> {
        this.map.delete(`${this.tableName}:${this.objectId}:${key}`);
    }

    async destroy(): Promise<void> {
        this.map.clear();
    }

    async keys(): Promise<string[]> {
        return Array.from(this.map.keys());
    }

    async clear(): Promise<void> {
        this.map.clear();
    }
}