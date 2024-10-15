import { Logger } from "../../../../logging/logger.js";
import { GithubService } from "../../../../services/github/service.js";
import { FunctionParameters } from "../../../../util/openapi.js";
import { snakeify } from "../../../../util/snake.js";
import { VariablesSchema } from "../../../base/variables_schema.js";
import { DocumentRepository } from "../../base.js";
import { DocumentDb } from "../../db.document.js";
import { DocumentRepositoryConfig } from "../../model.js";
import { GitDocumentRepositoryMetadata } from "./git_document_repository_metadata.js";

export class GitDocumentRepository extends DocumentRepository {

    logger = Logger.getInstance("GitDocumentRepository");

    private githubService: GithubService;

    constructor(config: DocumentRepositoryConfig, onFailure: (objectId: string, error: string) => void) {
        super(config, onFailure);

        if (!this.config.variables?.access_token) {
            throw new Error("GitDocumentRepository requires an access_token");
        }

        this.githubService = new GithubService(this.config.variables.access_token as string, true);

        this.syncDocumentStorage()
            .then(() => {
                this.logger.info("Document storage synced");
            })
            .catch((err) => {
                this.logger.error("Error syncing document storage: " + err);
                onFailure(this.config.id!, "Error syncing document storage: " + err);
            });
    }

    private async syncDocumentStorage(): Promise<void> {
        if (!this.config.variables) {
            this.logger.error("No variables found for GitDocumentRepository");
            return;
        }

        if (!this.config.variables.repo || !this.config.variables.owner || !this.config.variables.file_regex) {
            this.logger.error("Missing required variables for GitDocumentRepository");
            return;
        }
        const repo = this.config.variables.repo as string;
        const owner = this.config.variables.owner as string;
        const fileRegex = this.config.variables.file_regex as string;

        const existingDocumentsDb = await DocumentDb.findAll({
            where: {
                repositoryId: this.config.id
            }
        }).catch((err) => {
            this.logger.error("Error getting existing documents: " + err);
            return [];
        });

        if (!existingDocumentsDb || existingDocumentsDb?.length === 0) {
            this.logger.info("No existing documents found");
        }


        const existingDocuments = existingDocumentsDb.map((doc) => doc.toModel()).filter(doc => doc.status === "indexed").map((doc) => {
            return {
                path: doc.name,
                sha: doc.hash
            }
        });


        const fileCallback = (async (file: { path: string, content: string, sha?: string, delete?: boolean, size?: number }) => {
            if (file.delete) {
                await DocumentDb.update({
                    status: "deleted"
                }, {
                    where: {
                        repositoryId: this.config.id,
                        name: file.path
                    }
                }).catch((err) => {
                    this.logger.error("Error deleting document: " + err);
                });
                return;
            }
            this.storageApiClient?.uploadDocument(this.config.orgId, this.config.id!, file.path, file.content, file.size).catch((err) => {
                this.logger.error("Error uploading document: " + err);
            });
        });

        await this.githubService.getUpdatedFilesMatchingRegexWithContent({owner, repo, regex: fileRegex, fileCallback, existing: existingDocuments}).catch((err) => {
            this.logger.error("Error getting files from Github: " + err);
        });
    }

    public async destroy(): Promise<void> {
        // No-op

    }

    public topLevelObjectKey(): string {
        const snaked = snakeify(this.config.name);
        return `save_${snaked}`
    }


    public async schema(): Promise<Record<string, FunctionParameters>> {
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
        return GitDocumentRepositoryMetadata.defaultConfig(orgId);
    }

    static variablesSchema(): VariablesSchema {
        return GitDocumentRepositoryMetadata.variablesSchema();
    }
}