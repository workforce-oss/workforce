import { VariablesSchema } from "../../base/variables_schema.js";
import { DefaultDocumentationMetadata } from "../impl/default/default_documentation_metadata.js";
import { DocumentationConfig, DocumentationType } from "../model.js";

export class DocumentationConfigFactory {
    static variablesSchemaFor(config: DocumentationConfig): VariablesSchema {
        switch (config.type) {
            case "default-documentation":
                return DefaultDocumentationMetadata.variablesSchema();
            default:
                throw new Error(`DocumentationConfigFactory.variablesSchemaFor() unknown documentation type ${config.type as string}`);
        }
    }

    static defaultConfigFor(orgId: string, subtype: DocumentationType): DocumentationConfig {
        switch (subtype) {
            case "default-documentation":
                return DefaultDocumentationMetadata.defaultConfig(orgId);
            default:
                throw new Error(`DocumentationConfigFactory.defaultConfigFor() unknown documentation type ${subtype as string}`);
        }
    }
}