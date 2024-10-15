import { DocumentChunkModel, DocumentModel, DocumentRepositoryModel, DocumentSectionModel } from "../model.js";
import { DocumentChunkSearchResult, DocumentSectionSearchResult } from "./model.js";



export interface VectorDbClient {
    addTenant(orgId: string): Promise<void>;
    createDocumentRepository(orgId: string, documentRepository: DocumentRepositoryModel): Promise<DocumentRepositoryModel>;
    createDocument(orgId: string, document: DocumentModel): Promise<DocumentModel>;
    createDocumentSection(orgId: string, documentId: string, documentSection: DocumentSectionModel): Promise<DocumentSectionModel>;
    createDocumentChunk(orgId: string, sectionId: string, documentChunk: DocumentChunkModel): Promise<DocumentChunkModel>;
    listRepositories(orgId: string): Promise<DocumentRepositoryModel[]>;
    listDocuments(orgId: string, repositoryId: string): Promise<DocumentModel[]>;
    searchDocumentChunks(orgId: string, nearVector: number[], repositoryId?: string, documentIds?: string[], documentSectionId?: string): Promise<DocumentChunkSearchResult>;
    searchDocumentSections(orgId: string, nearVector: number[], repositoryId?: string, documentIds?: string[]): Promise<DocumentSectionSearchResult>;
    getAllChunksInSection(orgId: string, sectionId: string): Promise<DocumentChunkSearchResult>;
    getAllSectionsInDocument(orgId: string, documentId: string): Promise<DocumentSectionSearchResult>;

    deleteDocumentRepository(orgId: string, repositoryId: string): Promise<void>;
    deleteDocuments(orgId: string, repositoryId: string): Promise<void>;
    deleteDocument(orgId: string, documentId: string): Promise<boolean>;
    deleteDocumentSections(orgId: string, documentId: string): Promise<void>;
    deleteDocumentSection(orgId: string, sectionId: string): Promise<void>;
    deleteDocumentChunks(orgId: string, sectionId: string): Promise<void>;
    deleteDocumentChunk(orgId: string, chunkId: string): Promise<void>;
}