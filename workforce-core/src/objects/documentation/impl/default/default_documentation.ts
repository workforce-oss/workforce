import { Logger } from "../../../../logging/logger.js";
import { FunctionParameters } from "../../../../util/openapi.js";
import { Documentation } from "../../base.js";
import { DocumentationConfig } from "../../model.js";

export class DefaultDocumentation extends Documentation {
    public logger: Logger = Logger.getInstance("DefaultDocumentation");

    public destroy(): Promise<void> {
        // Nothing to do
        return Promise.resolve();
    }
    public topLevelObjectKey(): string {
        // Nothing to do
        return "";
    }
    public schema(): Promise<Record<string, FunctionParameters>> {
        // Nothing to do
        return Promise.resolve({});
    }
    public validateObject(): Promise<boolean> {
        // Nothing to do
        return Promise.resolve(true);
    }
    public constructor(config: DocumentationConfig, onFailure: (objectId: string, error: string) => void) {
        super(config, onFailure);
    }
}