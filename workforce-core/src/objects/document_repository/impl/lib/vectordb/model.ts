import { Logger } from "../../../../../logging/logger.js"

export interface VectorDbCreationArgs {
    scheme: string,
    host: string,
    port: number,
    grpcHost?: string,
    grpcPort?: number,
    apiKey?: string,
    logger?: Logger
}

export interface DocumentChunkSearchResult {
    DocumentChunks: {
        id: string
        distance: number
        content: string
        position: number
        section: {
            id: string
            name: string
            description: string
            document: {
                id: string
                name: string
            //     // repository: {
            //     //     id: string
            //     //     name: string
            //     // }
            }
        }
    }[]
}

export interface DocumentSectionSearchResult {
    DocumentSections: {
        id: string
        distance: number
        name: string
        description: string
        document: {
            id: string
            name: string
            // repository: {
            //     id: string
            //     name: string
            // }
        }
    }[]
}