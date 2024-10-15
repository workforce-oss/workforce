import OpenAI from "openai";

import { EmbeddingResult } from "./embedding_models.js";
import { Logger } from "../../../../../logging/logger.js";
import { DocumentChunkModel, DocumentModel, DocumentSectionModel } from "../model.js";

export class OpenAiEmbeddingClient {
    private defaultDimensions = 1024;
    private apiKey: string;
    private logger: Logger;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.logger = Logger.getInstance("OpenAiEmbeddingClient");
    }

    public async getEmbeddingsForDocument(document: DocumentModel, model: string): Promise<DocumentModel> {
        const embeddings = await this.getEmbeddingsForText([document.name], model);
        if (embeddings.length > 0) {
            document.vector = embeddings[0].embedding;
        }
        document.sections = await this.getEmbeddingsForDocumentSections(document.sections, model);
        return document;
    }

    public async getEmbeddingsForDocuments(documents: DocumentModel[], model: string): Promise<DocumentModel[]> {
        const inputs = documents.map((doc) => doc.name);

        const embeddings = await this.getEmbeddingsForText(inputs, model);
        for (const embedding of embeddings) {
            documents[embedding.index].vector = embedding.embedding;
        }
        for (const document of documents) {
            document.sections = await this.getEmbeddingsForDocumentSections(document.sections, model);
        }
        return documents;

    }

    private async getEmbeddingsForDocumentSections(documentSections: DocumentSectionModel[], model: string): Promise<DocumentSectionModel[]> {
        const inputs = documentSections.map((section) => section.description);

        const embeddings = await this.getEmbeddingsForText(inputs, model);
        for (const embedding of embeddings) {
            documentSections[embedding.index].vector = embedding.embedding;
        }

        for (const documentSection of documentSections) {
            documentSection.chunks = await this.getEmbeddingsForDocumentChunks(documentSection.chunks, model);
        }

        return documentSections;
    }


    private async getEmbeddingsForDocumentChunks(documentChunks: DocumentChunkModel[], model: string): Promise<DocumentChunkModel[]> {
        const inputs = documentChunks.map((chunk) => chunk.content);
        
        const embeddings = await this.getEmbeddingsForText(inputs, model);
        for (const embedding of embeddings) {
            documentChunks[embedding.index].vector = embedding.embedding;
        }
        return documentChunks;

    }

    public async getEmbeddingsForText(text: string[], model: string): Promise<EmbeddingResult[]> {
        text = text.filter((t) => t.length > 0);
        this.logger.debug(`Getting embeddings for text: ${JSON.stringify(text)}`);

        if (text.length === 0) {
            this.logger.debug("No text to embed");
            return [];
        }

        const openai = new OpenAI({
            apiKey: this.apiKey,
        });
        const response = await openai.embeddings.create({
            model: model,
            input: text,
            dimensions: this.defaultDimensions,
            user: "workforce"
        });
        if (response.data) {
            this.logger.debug(`Got embeddings: ${response.data.length}`);
            return response.data;
        } else {
            this.logger.error(`Error getting embeddings: ${JSON.stringify(response)}`);
        }
        return [];
    }
}