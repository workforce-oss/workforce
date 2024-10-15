import { VariablesSchema } from "../../base/variables_schema.js";
import { DefaultDocumentationMetadata } from "../impl/default/default_documentation_metadata.js";
import { DocumentationConfig } from "../model.js";

export class DocumentationConfigFactory {
    static variablesSchemaFor(config: DocumentationConfig): VariablesSchema {
        switch (config.subtype) {
            case "default":
                return DefaultDocumentationMetadata.variablesSchema();
            default:
                throw new Error(`DocumentationConfigFactory.variablesSchemaFor() unknown documentation type ${config.subtype as string}`);
        }
    }

    static defaultConfigFor(orgId: string, subtype: string): DocumentationConfig {
        switch (subtype) {
            case "default":
                return DefaultDocumentationMetadata.defaultConfig(orgId);
            default:
                throw new Error(`DocumentationConfigFactory.defaultConfigFor() unknown documentation type ${subtype}`);
        }
    }
}