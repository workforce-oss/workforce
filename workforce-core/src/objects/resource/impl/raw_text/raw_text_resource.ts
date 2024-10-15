import { Logger } from "../../../../logging/logger.js";
import { VariablesSchema } from "../../../base/variables_schema.js";
import { Resource } from "../../base.js";
import { ResourceConfig } from "../../model.js";
import { RawTextResourceMetadata } from "./raw_test_resource_metadata.js";

export class RawTextResource extends Resource {
    logger = Logger.getInstance("RawTextResource");
    
    constructor(config: ResourceConfig, onFailure: (objectId: string, error: string) => void) {
        super(config, onFailure);
    }

    static defaultConfig(orgId: string): ResourceConfig {
        return RawTextResourceMetadata.defaultConfig(orgId);
    }

    static variablesSchema(): VariablesSchema {
        return RawTextResourceMetadata.variablesSchema();
    }
}