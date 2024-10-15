import { Logger } from "../../logging/logger.js";
import { FunctionDocuments, FunctionParameters } from "../../util/openapi.js";
import { BaseConfig } from "./model.js";

export abstract class BaseObject<TConfig extends BaseConfig> {
    config: TConfig;
    abstract logger: Logger;
    onFailure: (objectId: string, error: string) => void;

    constructor(config: TConfig, onFailure: (objectId: string, error: string) => void) {
        this.config = config;
        this.onFailure = onFailure;
    }

    public abstract destroy(): Promise<void>;
    public abstract topLevelObjectKey(): string;
    public abstract schema(isToolOutput?: boolean): Promise<Record<string, FunctionParameters> | FunctionDocuments>;
    public abstract validateObject(object: Record<string, unknown>): Promise<boolean> | boolean;
}