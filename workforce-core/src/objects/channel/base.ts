import { RequestHandler } from "express";
import { Subject, Subscription } from "rxjs";
import { snakeify } from "../../util/snake.js";
import { BaseObject } from "../base/base.js";
import { ChannelConfig, ChannelMessageEvent, MessageRequest } from "./model.js";
import { ObjectError } from "../base/model.js";
import { ChannelDataCache } from "./cache.js";
import { FunctionParameters } from "../../util/openapi.js";

export abstract class Channel extends BaseObject<ChannelConfig> {
    subject = new Subject<ChannelMessageEvent>();
    errors = new Subject<ObjectError>();

    private _dataCache?: ChannelDataCache;

    get dataCache(): ChannelDataCache {
        if (!this._dataCache) {
            throw new Error("Channel.dataCache not initialized");
        }
        return this._dataCache;
    }

    set dataCache(dataCache: ChannelDataCache) {
        this._dataCache = dataCache;
    }

    async initializeDataCache(): Promise<void> {
        this._dataCache = await ChannelDataCache.for(this.config.id!);
    }

    abstract message(message: MessageRequest): Promise<void>;
    abstract webhookHandler: RequestHandler;

    subscribe(callback: (message: ChannelMessageEvent) => void): Subscription {
        return this.subject.subscribe(callback);
    }

    abstract establishSession(taskExecutionId: string, originalMessageData?: Record<string, string>): Promise<void>;

    abstract join(workerId: string, token: string, username?: string, taskExecutionId?: string): Promise<void>;

    abstract leave(workerId: string): Promise<void>;

    async getThreadId(taskExecutionId: string): Promise<string | undefined> {
        return this._dataCache?.sessionThreads.get(taskExecutionId);
    }

    destroy(): Promise<void> {
        this.subject.complete();
        this.errors.complete();
        this._dataCache?.destroy().catch((error) => {
            this.logger.error(`destroy() error=${error}`);
        });
        return Promise.resolve();
    }

    async releaseThread(taskExecutionId: string): Promise<void> {
        try {
            // delay by 1 second to allow any final messages to be sent
            await new Promise((resolve) => setTimeout(resolve, 1000));
            let threadId = await this._dataCache?.sessionThreads.get(taskExecutionId);
            if (!threadId) {
                threadId = await this._dataCache?.threadSessions.get(taskExecutionId);
                if (!threadId) {
                    throw new Error(`releaseSession() threadId not found for taskExecutionId=${taskExecutionId}`);
                }
                await this._dataCache?.sessionThreads.delete(threadId);
                await this._dataCache?.threadSessions.delete(taskExecutionId);
            } else {
                await this.dataCache?.sessionThreads.delete(taskExecutionId);
                await this.dataCache?.threadSessions.delete(threadId);
            }
        } catch (error) {
            this.logger.error(`releaseSession() error=`, error);
        }
        return;
    }

    async handOffSession(oldTaskExecutionId: string, newTaskExecutionId: string): Promise<void> {
        try {
            let sessionId = await this._dataCache?.sessionThreads.get(oldTaskExecutionId);
            if (!sessionId) {
                sessionId = await this._dataCache?.threadSessions.get(oldTaskExecutionId);
                if (!sessionId) {
                    throw new Error(`releaseSession() sessionId not found for taskExecutionId=${oldTaskExecutionId}`);
                }
                await this._dataCache?.sessionThreads.set(sessionId, newTaskExecutionId);
                await this._dataCache?.threadSessions.set(newTaskExecutionId, sessionId);
            } else {
                await this.dataCache?.sessionThreads.set(newTaskExecutionId, sessionId);
                await this.dataCache?.threadSessions.set(sessionId, newTaskExecutionId);
            }
        } catch (error) {
            this.logger.error(`releaseSession() error=`, error);
        }
        return;
    }

    public topLevelObjectKey(): string {
        const snaked = snakeify(this.config.name);
        return `final_message_${snaked}`;
    }
 
    schema(): Promise<Record<string, FunctionParameters>> {
        const topLevelObjectKey = this.topLevelObjectKey();
        return Promise.resolve({
            [topLevelObjectKey]: {
                "type": "object",
                "description": `Purpose: Send the final message to the channel ${this.config.name}.\nDescription: ${this.config.description}`,
                "properties": {
                    "message": {
                        "type": "string",
                        "description": `The final message to send to the channel ${this.config.name}`
                    },
                },
                "required": [
                    "message"
                ],
            }
        });
    }

    public validateObject(object: Record<string, unknown>): Promise<boolean> {
        const topLevelObjectKey = this.topLevelObjectKey();
        if (!object.message) {
            this.logger.debug(`validateObject() ${topLevelObjectKey}.message not found`);
            return Promise.resolve(false);
        }
        return Promise.resolve(true);
    }
}