import { BaseConfig } from "../base/model.js";
import { RetrievalScopeType, TokenFillStrategyType } from "../documentation/model.js";

export interface SearchRequest {
    requestId: string;
    repositoryId: string;
    documentIds?: string[];
    desiredTokens?: number;
    maxTokens?: number;
    tokenFillStrategy?: TokenFillStrategyType;
    retrievalScope?: RetrievalScopeType;
    query: string;
}

export interface SearchResponse {
    requestId: string;
    repositoryId: string;
    distance: number;
    result: string;
}

export interface DocumentData {
    id: string;
    repositoryId: string;
    name: string;
    format: string;
    location: string;
    status: DocumentStatusType;
    size?: number;
    hash?: string;
    externalId?: string;
}

export const documentStatusTypes = ["uploaded", "indexed", "error", "unknown"];

export type DocumentStatusType = typeof documentStatusTypes[number];

export const documentRepositoryTypes = ["internal-document-repository", "git-document-repository"] as const;

export type DocumentRepositoryType = typeof documentRepositoryTypes[number];

export const documentChunkStrategyTypes = ["none", "sentence", "paragraph", "section"] as const;

export interface DocumentRepositoryConfig extends BaseConfig {
    subtype: DocumentRepositoryType;
    
    documentChunkStrategy?: typeof documentChunkStrategyTypes[number];
    externalId?: string;
    status?: string;

}