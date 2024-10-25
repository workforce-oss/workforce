import { VariablesSchema } from "../../base/variables_schema.js";
import { GitDocumentRepositoryMetadata } from "../impl/git/git_document_repository_metadata.js";
import { InternalDocumentRepositoryMetadata } from "../impl/internal/internal_document_repository_metadata.js";
import { DocumentRepositoryConfig, DocumentRepositoryType } from "../model.js";

export class DocumentRepositoryConfigFactory {
   static variablesSchemaFor(config: DocumentRepositoryConfig): VariablesSchema {
      switch (config.type) {
         case "internal-document-repository":
            return InternalDocumentRepositoryMetadata.variablesSchema();
         case "git-document-repository":
            return GitDocumentRepositoryMetadata.variablesSchema();
         default:
            throw new Error(`DocumentRepositoryFactory.variablesSchemaFor() unknown document repository type ${config.type as string}`);
      }
   }

   static defaultConfigFor(orgId: string, subtype: DocumentRepositoryType): DocumentRepositoryConfig {
      switch (subtype) {
         case "internal-document-repository":
            return InternalDocumentRepositoryMetadata.defaultConfig(orgId);
         case "git-document-repository":
            return GitDocumentRepositoryMetadata.defaultConfig(orgId);
         default:
            throw new Error(`DocumentRepositoryFactory.defaultConfigFor() unknown document repository type ${subtype as string}`);
      }
   }
}