export type DocumentRepository = {
    id?: string,
    name: string,
    embeddingSecret: string,
}

export type Document = {
    id?: string,
    name: string,
    format: string,
    repository: DocumentRepository,
    sections: DocumentSection[],
    location: string,
    vector?: number[],
}

export type DocumentSection = {
    id?: string,
    name: string,
    description: string,
    chunks: DocumentChunk[],
    vector?: number[],
}

export type DocumentChunk = {
    id?: string,
    content: string,
    position: number,
    vector?: number[],
}

export type UploadResult = {
    success: boolean,
    hash: string,
}