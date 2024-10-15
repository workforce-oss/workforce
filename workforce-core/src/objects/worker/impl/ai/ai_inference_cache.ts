import stringify from "json-stringify-deterministic";
import { Logger } from "../../../../logging/logger.js";
import { createHash } from "crypto";

export class AIInferenceCache {
    static _instance: AIInferenceCache;
    private cache: Map<string, Record<string, unknown>>;
    private logger: Logger;

    constructor() {
        this.cache = new Map();
        this.logger = Logger.getInstance("AIInferenceCache");
    }

    public static getInstance(): AIInferenceCache {
        if (!AIInferenceCache._instance) {
            AIInferenceCache._instance = new AIInferenceCache();
        }
        return AIInferenceCache._instance;
    }

    public get(key: string): Record<string, unknown> | undefined {
        const stringified = stringify(key);
        // do a sha1 hex hash of the stringified key
        const hash = createHash("sha1").update(stringified).digest("hex");
        this.logger.debug(`get() Cache key: ${hash}`);
        return this.cache.get(hash);
    }

    public set(key: string, value: Record<string, unknown>): void {
        const stringified = stringify(key);
        // do a sha1 hex hash of the stringified key
        const hash = createHash("sha1").update(stringified).digest("hex");
        this.logger.debug(`set() Cache key: ${hash}`);
        this.cache.set(hash, value);
    }
}