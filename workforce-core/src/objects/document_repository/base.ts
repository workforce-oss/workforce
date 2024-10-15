import { BaseObject } from "../base/base.js";
import { DocumentData, DocumentRepositoryConfig } from "./model.js";
import { StorageApiClient } from "./impl/lib/storage/storage_api_client.js";
import { Parser, ParserFactory } from "./impl/lib/parser/parser.js";
import { VectorDbClient } from "./impl/lib/vectordb/vectordb_client.js";
import { EmbeddingClient } from "./impl/lib/embeddings/embedding_client.js";
import { VectorDbClientFactory } from "./impl/lib/vectordb/vectordb_client_factory.js";
import { Configuration } from "../../config/configuration.js";
import { EmbeddingClientFactory } from "./impl/lib/embeddings/embedding_client_factory.js";
import { Logger } from "../../logging/logger.js";
import { RetrievalScopeType, TokenFillStrategyType } from "../documentation/model.js";
import { DocumentDb } from "./db.document.js";
import { DocumentRepositoryDb } from "./db.js";
import { FunctionDocument } from "../../util/openapi.js";

export abstract class DocumentRepository extends BaseObject<DocumentRepositoryConfig> {

    storageApiClient?: StorageApiClient;
    parser?: Parser;
    vectorDbClient?: VectorDbClient;
    embeddingClient?: EmbeddingClient;

    constructor(config: DocumentRepositoryConfig, onFailure: (objectId: string, error: string) => void) {
        super(config, onFailure);

        if (!this.config.variables) {
            throw new Error("DocumentRepository missing variables");
        }

        if (!this.config.variables.model) {
            throw new Error("DocumentRepository missing model");
        }

        if (!this.config.variables.model_api_key) {
            throw new Error("DocumentRepository missing model_api_key");
        }
        try {
            this.storageApiClient = new StorageApiClient();
            this.parser = ParserFactory.getParser("nlm");
            this.vectorDbClient = VectorDbClientFactory.createVectorDBClient({
                host: Configuration.VectorDbHost,
                port: Configuration.VectorDbPort,
                grpcPort: Configuration.VectorDbGrpcPort,
                grpcHost: Configuration.VectorDbGrpcHost,
                scheme: Configuration.VectorDbScheme,
                apiKey: Configuration.VectorDbApiKey,
                logger: Logger.getInstance("DocumentRepository")
            });
            this.embeddingClient = EmbeddingClientFactory.createClient({
                apiKey: this.config.variables.model_api_key as string,
            });
        } catch (error) {
            Logger.getInstance("DocumentRepository").error(`Error initializing DocumentRepository:`, error);
            onFailure(this.config.id!, "Error initializing DocumentRepository");
        }
    }
    public topLevelObjectKey(): string {
        return "document-repository";
    }

    public async indexDocument(documentData: DocumentData): Promise<boolean> {
        await this.vectorDbClient?.addTenant(this.config.orgId);

        this.logger.debug("Indexing document: " + JSON.stringify(documentData));
        // test one at a time
        if (!this.storageApiClient) {
            throw new Error("DocumentRepository StorageAPIclient not initialized");
        }
        if (!this.parser) {
            throw new Error("DocumentRepository Parser not initialized");
        }
        if (!this.vectorDbClient) {
            throw new Error("DocumentRepository VectorDBClient not initialized");
        }
        if (!this.embeddingClient) {
            throw new Error("DocumentRepository EmbeddingClient not initialized");
        }
        if (!this.config.variables) {
            throw new Error("DocumentRepository missing variables");
        }
        if (!this.config.variables.model || !this.config.variables.model_api_key) {
            throw new Error("DocumentRepository missing model or model_api_key");
        }

        this.logger.debug("Getting document stream");
        const fileStream = await this.storageApiClient.getDocumentStream(this.config.orgId, documentData.repositoryId, documentData.id);
        if (!fileStream) {
            throw new Error("Error getting document stream");
        }

        this.logger.debug("Parsing document");
        const document = await this.parser.parseFile(documentData.name, fileStream);

        document.repository = {
            name: this.config.name,
            embeddingSecret: this.config.credential!,
            id: this.config.id
        }

        this.logger.debug("Embedding document");
        document.id = documentData.id;

        const embedded = await this.embeddingClient.getEmbeddingsForDocument(document, this.config.variables.model as string, this.config.variables.model_api_key as string);
        embedded.repository = document.repository;
        embedded.id = documentData.id;

        this.logger.debug("Creating document repository");
        await this.vectorDbClient.createDocumentRepository(this.config.orgId, document.repository);

        this.logger.debug("Indexing document");

        const existingDocument = await this.vectorDbClient.createDocument(this.config.orgId, embedded);

        const existingSections = await this.vectorDbClient.getAllSectionsInDocument(this.config.orgId, existingDocument.id!);

        // delete existing sections not in new document
        for (const section of existingSections.DocumentSections) {
            if (!embedded.sections.find((s) => s.name === section.name)) {
                this.logger.debug("Deleting section", section);
                await this.vectorDbClient.deleteDocumentSection(this.config.orgId, section.id);
            }
        }


        this.logger.debug("Indexing document sections");
        for (const section of embedded.sections) {
            this.logger.debug("Indexing section", section.name);
            await this.vectorDbClient.createDocumentSection(this.config.orgId, embedded.id, section);
            const existingSection = await this.vectorDbClient.getAllChunksInSection(this.config.orgId, section.id!);
            for (const chunk of existingSection.DocumentChunks) {
                if (!section.chunks.find((c) => c.content === chunk.content)) {
                    this.logger.debug("Deleting chunk", chunk.position);
                    await this.vectorDbClient.deleteDocumentChunk(this.config.orgId, chunk.id);
                }
            }


            this.logger.debug("Indexing section chunks");
            for (const chunk of section.chunks) {
                this.logger.debug("Indexing chunk", chunk.position);
                await this.vectorDbClient.createDocumentChunk(this.config.orgId, section.id!, chunk);
            }
        }
        return true;
    }

    public async deleteThis(): Promise<boolean> {

        const result = await DocumentRepositoryDb.findByPk(this.config.id).catch((error) => {
            this.logger.error(`Error finding document repository ${this.config.id} error=${error}`);
            return null;
        });

        if (!result) {
            return false;
        }

        const documentCount = await DocumentDb.count({ where: { repositoryId: this.config.id } }).catch((error) => {
            this.logger.error(`Error counting documents ${this.config.id} error=${error}`);
            return -1;
        });

        if (documentCount === -1) {
            return false;
        }

        if (documentCount === 0) {
            const deleted = await DocumentRepositoryDb.destroy({ where: { id: this.config.id } }).catch((error) => {
                this.logger.error(`Error deleting document repository ${this.config.id} error=${error}`);
                return 0;
            });
            return deleted >= 1;
        }

        const updated = await DocumentDb.update({ status: "deleted" }, { where: { repositoryId: this.config.id } }).catch((error) => {
            this.logger.error(`Error updating documents ${this.config.id} error=${error}`);
            return false;
        });

        if (!updated) {
            return false;
        }

        if (result.status !== "deleted") {
            result.status = "deleted";
            await result.save().catch((error) => {
                this.logger.error(`Error saving document repository ${this.config.id} error=${error}`);
            });
        }

        return false;
    }

    public async deleteDocument(documentId: string): Promise<boolean> {
        await this.vectorDbClient?.addTenant(this.config.orgId);
        const result = await this.vectorDbClient!.deleteDocument(this.config.orgId, documentId)
            .catch((error) => {
                this.logger.error(`Error deleting document ${documentId} error=${error}`);
                return false;
            });

        if (result) {
            const document = await DocumentDb.findByPk(documentId).catch((error) => {
                this.logger.error(`Error finding document ${documentId} error=${error}`);
                return null;
            });

            if (document && document.status === "deleted") {

                document.destroy().catch((error) => {
                    this.logger.error(`Error deleting document ${documentId} error=${error}`);
                });
                return true;
            }

        }

        return result;
    }

    public async search(query: string, documentIds?: string[], retrievalScope?: RetrievalScopeType, desiredTokens?: number, maxTokens?: number, tokenFillStrategy?: TokenFillStrategyType): Promise<{ result: string, distance: number }> {
        await this.vectorDbClient?.addTenant(this.config.orgId);
        // test one at a time
        if (!this.storageApiClient) {
            throw new Error("DocumentRepository StorageAPIclient not initialized");
        }
        if (!this.parser) {
            throw new Error("DocumentRepository Parser not initialized");
        }
        if (!this.vectorDbClient) {
            throw new Error("DocumentRepository VectorDBClient not initialized");
        }
        if (!this.embeddingClient) {
            throw new Error("DocumentRepository EmbeddingClient not initialized");
        }

        if (!this.config.variables) {
            throw new Error("DocumentRepository missing variables");
        }
        if (!this.config.variables.model || !this.config.variables.model_api_key) {
            throw new Error("DocumentRepository missing model or model_api_key");
        }


        const embeddings = await this.embeddingClient.getEmbeddingsForText([query], this.config.variables.model as string, this.config.variables.model_api_key as string);
        if (embeddings.length === 0) {
            this.logger.error("No embeddings found for query: " + query);
            return { result: "No results found", distance: 0 };
        }
        const vector = embeddings[0].embedding;
        this.logger.debug(`Search query: ${query}, retrievalScope: ${retrievalScope}, desiredTokens: ${desiredTokens}, maxTokens: ${maxTokens}, tokenFillStrategy: ${tokenFillStrategy}`);
        switch (retrievalScope) {
            case "section":
                return await this.getMostRelevantSectionText(this.config.orgId, vector, this.config.id, documentIds, undefined);
            case "chunk":
                return await this.getMostRelevantChunkText(this.config.orgId, vector, this.config.id, documentIds, undefined);
            case "document":
                return await this.getMostRelevantDocumentText(this.config.orgId, vector, this.config.id, documentIds, undefined);
            default:
                return await this.getMostRelevantSectionText(this.config.orgId, vector, this.config.id, documentIds, undefined);
        }
    }

    async getMostRelevantChunk(orgId: string, vector: number[], repositoryId?: string, documentIds?: string[], documentSectionId?: string): Promise<{ chunkId: string, content: string, distance: number }> {
        const chunkSearchResult = await this.vectorDbClient!.searchDocumentChunks(orgId, vector, repositoryId, documentIds, documentSectionId);
        const topChunkResult = chunkSearchResult.DocumentChunks[0];
        return { chunkId: topChunkResult.id, content: topChunkResult.content, distance: topChunkResult.distance };
    }

    async getMostRelevantChunkText(orgId: string, vector: number[], repositoryId?: string, documentIds?: string[], documentSectionId?: string): Promise<{ result: string, distance: number }> {
        const { content, distance } = await this.getMostRelevantChunk(orgId, vector, repositoryId, documentIds, documentSectionId);
        return { result: content, distance: distance };
    }

    async getMostRelevantSection(orgId: string, vector: number[], repositoryId?: string, documentIds?: string[], documentSectionId?: string): Promise<{ sectionId: string, description: string, documentId: string, bestDistance: number }> {
        const chunkSearchResult = await this.vectorDbClient!.searchDocumentChunks(orgId, vector, repositoryId, documentIds, documentSectionId);
        const topChunkResult = chunkSearchResult.DocumentChunks[0];
        if (!topChunkResult) {
            this.logger.debug("No top chunk found");
        } else {
            this.logger.debug("Top chunk", JSON.stringify(topChunkResult, null, 2));
        }


        const sectionSearchResult = await this.vectorDbClient!.searchDocumentSections(orgId, vector, repositoryId, documentIds);
        const topSectionResult = sectionSearchResult.DocumentSections[0];
        if (!topSectionResult) {
            this.logger.debug("No section found");
        }

        if (!topChunkResult && !topSectionResult) {
            throw new Error("No relevant section or chunk found");
        }
        this.logger.debug("Top section", JSON.stringify(topSectionResult, null, 2));

        let sectionId = topSectionResult?.id ?? "";
        let documentId = topSectionResult?.document.id ?? "";
        let bestDistance = topSectionResult?.distance ?? 1.0;
        let description = topSectionResult?.description ?? "";
        if ((topChunkResult?.distance ?? 1) < bestDistance) {
            sectionId = topChunkResult.section.id;
            bestDistance = topChunkResult.distance;
            documentId = topChunkResult.section.document.id;
            description = topChunkResult.section.description;
        }
        return { sectionId: sectionId, description: description, documentId: documentId, bestDistance: bestDistance };
    }

    async getMostRelevantSectionText(orgId: string, vector: number[], repositoryId?: string, documentIds?: string[], documentSectionId?: string): Promise<{ result: string, distance: number }> {
        const { sectionId, description, bestDistance } = await this.getMostRelevantSection(orgId, vector, repositoryId, documentIds, documentSectionId);

        const allChunks = await this.vectorDbClient!.getAllChunksInSection(orgId, sectionId);
        const chunkData = allChunks.DocumentChunks.map((chunk) => {
            return {
                content: chunk.content,
                position: chunk.position,
            }
        });
        let finalText = `# ${description}\n\n`;
        const results: string[] = [];
        results.fill("", 0, chunkData.length);
        chunkData.sort((a, b) => a.position - b.position);
        for (let i = 0; i < chunkData.length; i++) {
            results[i] = chunkData[i].content;
        }
        finalText += results.join("\n\n");
        return { result: finalText, distance: bestDistance };
    }

    async getMostRelevantDocument(orgId: string, vector: number[], repositoryId?: string, documentIds?: string[], documentSectionId?: string): Promise<{ documentId: string, description: string, bestDistance: number }> {
        const mostRelevantSection = await this.getMostRelevantSection(orgId, vector, repositoryId, documentIds, documentSectionId);
        const documentId = mostRelevantSection.documentId;

        const sections = await this.vectorDbClient!.getAllSectionsInDocument(orgId, documentId);
        const sectionData = sections.DocumentSections.map((section) => {
            return {
                description: section.description,
                id: section.id,
            }
        });
        this.logger.debug("Sections", JSON.stringify(sectionData, null, 2));

        const chunkData: { content: string, position: number }[][] = [];
        for (const section of sectionData) {
            const allChunks = await this.vectorDbClient!.getAllChunksInSection(orgId, section.id);
            const chunks = allChunks.DocumentChunks.map((chunk) => {
                return {
                    content: chunk.content,
                    position: chunk.position,
                }
            });
            chunkData.push(chunks);
        }
        this.logger.debug("Chunks", JSON.stringify(chunkData, null, 2));
        let finalText = "";
        for (const section of chunkData) {
            const results: string[] = [];
            results.fill("", 0, section.length);
            section.sort((a, b) => a.position - b.position);
            for (let i = 0; i < section.length; i++) {
                results[i] = section[i].content;
            }
            finalText += results.join("\n\n");
        }
        return { documentId: documentId, description: finalText, bestDistance: mostRelevantSection.bestDistance };
    }

    async getMostRelevantDocumentText(orgId: string, vector: number[], repositoryId?: string, documentIds?: string[], documentSectionId?: string): Promise<{ result: string, distance: number }> {
        const { description, bestDistance } = await this.getMostRelevantDocument(orgId, vector, repositoryId, documentIds, documentSectionId);
        return { result: description, distance: bestDistance };
    }

    static functionSchema(): FunctionDocument {
        return {
            "name": "query_documentation",
            "description": "You have been given a set of documentation related to your task. If you do not know the answer to a question already, there is a good chance it's in the documentation.  Use query_documentation to look up a relevant section in the documentation. This data has been indexed into a Vector Database and should be queried by using concepts and keywords.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The concept or keyword to search for in the documentation. This should be a single word or a short phrase."
                    },
                },
                "required": ["query"]
            }
        }
    }
}
