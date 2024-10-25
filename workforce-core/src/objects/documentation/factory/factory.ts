import { Documentation } from "../base.js";
import { DefaultDocumentation } from "../impl/default/default_documentation.js";
import { DocumentationConfig } from "../model.js";

export class DocumentationFactory {
    static create(config: DocumentationConfig, onFailure: (objectId: string, error: string) => void): Documentation {
        switch (config.type) {
            case "default-documentation":
                return new DefaultDocumentation(config, onFailure);
            default:
                throw new Error(`DocumentationFactory.create() unknown documentation type ${config.type as string}`);
        }
    }
}