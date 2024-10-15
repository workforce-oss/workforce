import { Logger } from "../../../../logging/logger.js";
import { FunctionParameters } from "../../../../util/openapi.js";
import { snakeify } from "../../../../util/snake.js";
import { VariablesSchema } from "../../../base/variables_schema.js";
import { DocumentRepository } from "../../base.js";
import { DocumentRepositoryConfig } from "../../model.js";
import { InternalDocumentRepositoryMetadata } from "./internal_document_repository_metadata.js";

export class InternalDocumentRepository extends DocumentRepository {
    logger = Logger.getInstance("InternalDocumentRepository");

    constructor(config: DocumentRepositoryConfig, onFailure: (objectId: string, error: string) => void) {   
        super(config, onFailure);
    }

    public async destroy(): Promise<void> {
        // No-op

    }
    public topLevelObjectKey(): string {
        const snaked = snakeify(this.config.name);
        return `save_${snaked}`
    }


    public schema(): Promise<Record<string, FunctionParameters>> {
        const topLevelObjectKey = this.topLevelObjectKey();
        return Promise.resolve({
            [topLevelObjectKey]: {
                "type": "object",
                "properties": {
                    "content": {
                        "type": "string",
                        "description": "The content of the document to save"
                    }

                },
                "required": ["content"],
            },
        });
    }
    public validateObject(): Promise<boolean> {
        return Promise.resolve(true);
    }

    static defaultConfig(orgId: string): DocumentRepositoryConfig {
        return InternalDocumentRepositoryMetadata.defaultConfig(orgId);
    }

    static variablesSchema(): VariablesSchema {
        return InternalDocumentRepositoryMetadata.variablesSchema();
    }

}