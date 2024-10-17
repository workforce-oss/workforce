import { RedisClientType, createClient } from "redis";
import { Logger } from "../../../logging/logger.js";
import { Configuration } from "../../../config/configuration.js";
import { AsyncMap } from "./async_map.js";
import { jsonParse } from "../../../util/json.js";
import EventEmitter from "events";

export class RedisAsyncMap<T> implements AsyncMap<T> {
    private logger = Logger.getInstance("RedisAsyncMap");
    private tableName: string;
    private objectId: string;
    private ttl: number = 60 * 60 * 7; // 7 days

    static _client?: RedisClientType & EventEmitter;

    private _client?: RedisClientType & EventEmitter;
    private get client(): RedisClientType & EventEmitter {
        if (!this._client) {
            throw new Error("Client not initialized");
        }
        return this._client;
    }

    constructor(tableName: string, objectId: string) {
        this.tableName = tableName;
        this.objectId = objectId;
    }

    static async for<T>(tableName: string, objectId: string): Promise<RedisAsyncMap<T>> {
        const map = new RedisAsyncMap<T>(tableName, objectId);

        if (!RedisAsyncMap._client) {
            RedisAsyncMap._client = map.createRedisClient();
            
            map._client = RedisAsyncMap._client;
            map.attachDefaultHandlers(map.client);
            await map.client.connect();
        } else {
            map._client = RedisAsyncMap._client;
        }
        return map;
    }

    static destroy() {
        if (RedisAsyncMap._client) {
            RedisAsyncMap._client.quit().catch((error) => {
                Logger.getInstance("RedisAsyncMap").error(`Error destroying client:`, error);
            });
        }
    }

    async has(key: string): Promise<boolean> {
        try {
            return (await this.client.exists(`${this.tableName}:${this.objectId}:${key}`)) === 1;
        } catch (error) {
            this.logger.error(`Error checking ${this.tableName}:${this.objectId}:${key}:`, error);
        }
        return false;
    }

    async get(key: string): Promise<T | undefined> {
        try {
            const value = await this.client.get(`${this.tableName}:${this.objectId}:${key}`);
            if (value) {
                return jsonParse(value);
            }
        } catch (error) {
            this.logger.error(`Error getting ${this.tableName}:${this.objectId}:${key}:`, error);
        }
        return undefined;
    }

    async set(key: string, value: T): Promise<void> {
        try {
            await this.client.set(`${this.tableName}:${this.objectId}:${key}`, JSON.stringify(value), {
                "EX": this.ttl,
            });
        } catch (error) {
            this.logger.error(`Error setting ${this.tableName}:${this.objectId}:${key}:`, error);
        }
    }

    async delete(key: string): Promise<void> {
        try {
            await this.client.del(`${this.tableName}:${this.objectId}:${key}`);
        } catch (error) {
            this.logger.error(`Error deleting ${this.tableName}:${this.objectId}:${key}:`, error);
        }
    }

    async destroy() {
        try {
            await this.client.del(`${this.tableName}:${this.objectId}:*`);
        } catch (error) {
            this.logger.error(`Error destroying ${this.tableName}:${this.objectId}:`, error);
        }
    }

    private createRedisClient(): RedisClientType & EventEmitter {
        return createClient({
            url: Configuration.CacheUri,
            username: Configuration.CacheUsername,
            password: Configuration.CachePassword,
        }) as RedisClientType & EventEmitter;
    }

    private attachDefaultHandlers(client: RedisClientType & EventEmitter) {
        client.on("connect", () => {
            this.logger.debug(`Connected to ${this.tableName}:${this.objectId}`)
        });
        client.on("ready", () => {
            this.logger.debug(`Ready from ${this.tableName}:${this.objectId}`)
        });
        client.on("reconnecting", () => {
            this.logger.debug(`Reconnecting from ${this.tableName}:${this.objectId}`)
        });

        client.on("error", (error: unknown) => {
            this.logger.error(`Error from ${this.tableName}:${this.objectId}:`, error)
        });
        client.on("end", () => {
            this.logger.debug(`End from ${this.tableName}:${this.objectId}`)
        });
    }




}