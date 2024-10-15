export interface DocumentRepositoryModel {
    id?: string,
    name: string,
    embeddingSecret: string,
}

export interface DocumentModel {
    id?: string,
    name: string,
    format: string,
    repository: DocumentRepositoryModel,
    sections: DocumentSectionModel[],
    location: string,
    vector?: number[],
}

export interface DocumentSectionModel {
    id?: string,
    name: string,
    description: string,
    chunks: DocumentChunkModel[],
    vector?: number[],
}

export interface DocumentChunkModel {
    id?: string,
    content: string,
    position: number,
    vector?: number[],
}