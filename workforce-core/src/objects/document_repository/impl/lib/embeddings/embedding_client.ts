import { DocumentModel } from "../model.js";
import { EmbeddingResult } from "./embedding_models.js";

export interface EmbeddingClient {
    getEmbeddingsForDocument(document: DocumentModel, model: string, apiKey: string): Promise<DocumentModel>;
    getEmbeddingsForDocuments(documents: DocumentModel[], model: string, apiKey: string): Promise<DocumentModel[]>;
    getEmbeddingsForText(inputs: string[], model: string, apiKey: string): Promise<EmbeddingResult[]>;
}