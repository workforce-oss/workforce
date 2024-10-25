import { DocumentRepository } from "../base.js";
import { GitDocumentRepository } from "../impl/git/git_document_repository.js";
import { InternalDocumentRepository } from "../impl/internal/internal_document_repository.js";
import { DocumentRepositoryConfig } from "../model.js";

export class DocumentRepositoryFactory {
    static create(config: DocumentRepositoryConfig, onFailure: (objectId: string, error: string) => void): DocumentRepository {
        switch (config.type) {
            case "internal-document-repository":
                return new InternalDocumentRepository(config, onFailure);
            case "git-document-repository":
                return new GitDocumentRepository(config, onFailure);
            default:
                throw new Error(`DocumentRepositoryFactory.create() unknown document repository type ${config.type as string}`);
        }
    }
}