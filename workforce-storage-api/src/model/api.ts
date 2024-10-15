export const MODEL_HEADER = "X-API-EMBEDDING-MODEL";
export const MODEL_API_KEY_HEADER = "X-API-EMBEDDING-API-KEY";

import { Document } from "./internal.js";

export type RequestConfiguration = {
    model: string,
    apiKey: string,
}

export type CreateDocumentRepostoryRequest = {
    name: string,
    embeddingSecret: string,
}

export type ListDocumentRepositoriesResponse = {
    repositories: {
        name: string,
    }[]
}

export type IndexDocumentRequest = {
    configuration: RequestConfiguration,
    name: string,
    format: string,
    content: string,
    repositoryName: string,
}

export type GetDocumentRequest = {
    name: string,
    repositoryName: string,
}

export type GetDocumentResponse = {
    name: string,
    format: string,
    content: string,
}

export type ListDocumentsResponse = {
    documents: Document[],
}

export type SearchRequest = {
    query: string,
    repositoryName: string,
    documentName?: string,
    documentSectionName?: string,
}

export type SearchResponse = {
    result: string,
}


