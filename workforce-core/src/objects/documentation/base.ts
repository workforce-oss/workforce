import { BaseObject } from "../base/base.js";
import { DocumentationConfig } from "./model.js";

export abstract class Documentation extends BaseObject<DocumentationConfig> {
    public constructor(config: DocumentationConfig, onFailure: (objectId: string, error: string) => void) {
        super(config, onFailure);
    }
}