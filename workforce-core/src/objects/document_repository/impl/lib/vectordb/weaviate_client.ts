import weaviate, { ApiKey, Filters, WeaviateClient } from "weaviate-client";
import { Logger } from "../../../../../logging/logger.js";
import { DocumentChunkModel, DocumentModel, DocumentRepositoryModel, DocumentSectionModel } from "../model.js";
import { DocumentChunkSearchResult, DocumentSectionSearchResult } from "./model.js";
import { VectorDbClient } from "./vectordb_client.js";
import { WeaviateDocumentChunkClass, WeaviateDocumentClass, WeaviateDocumentRepositoryClass, WeaviateDocumentSectionClass } from "./weaviate_classes.js";

export class WeaviateVectorDbClient implements VectorDbClient {
    private client?: WeaviateClient;
    private logger: Logger;

    constructor(args: { scheme: string, host: string, port: number, grpcHost?: string, grpcPort?: number, apiKey?: string, }) {
        this.logger = Logger.getInstance('WeaviateVectorDbClient');
        this.logger.debug('WeaviateVectorDbClient', args);

        const hostParts = args.host.split('.');
        let grpcHost = args.grpcHost;
        if (!grpcHost) {
            if (hostParts.length >= 1) {
                hostParts[0] = `${hostParts[0]}-grpc`;
                grpcHost = hostParts.join('.');
                this.logger.debug('WeaviateVectorDbClient grpcHost', grpcHost);
            }
        } else {
            this.logger.debug('WeaviateVectorDbClient grpcHost', grpcHost);
        }

        weaviate.connectToCustom({
            httpHost: args.host,
            httpPort: args.port,
            httpSecure: args.scheme === 'https',
            grpcHost: grpcHost,
            grpcSecure: args.scheme === 'https',
            grpcPort: args.grpcPort ?? 50051,
            authCredentials: args.apiKey ? new ApiKey(args.apiKey) : undefined,

        }).then((client) => {
            this.client = client;
            this.initialize().then(() => {
                this.logger.debug('WeaviateVectorDbClient initialized');
            }).catch((error) => {
                this.logger.error('WeaviateVectorDbClient initialization failed', error);
            });
        }).catch((error) => {
            this.logger.error('WeaviateVectorDbClient connection failed', error);
        });

    }

    private async initialize(): Promise<void> {
        if (!await this.client?.collections.exists(WeaviateDocumentRepositoryClass.name)) {
            await this.createDocumentRepositoryCollection();
        }
        if (!await this.client?.collections.exists(WeaviateDocumentClass.name)) {
            await this.createDocumentCollection();
        }
        if (!await this.client?.collections.exists(WeaviateDocumentSectionClass.name)) {
            await this.createDocumentSectionCollection();
        }
        if (!await this.client?.collections.exists(WeaviateDocumentChunkClass.name)) {
            await this.createDocumentChunkCollection();
        }

        this.logger.debug('WeaviateVectorDbClient initialized');
    }

    public async addTenant(tenantId: string): Promise<void> {
        await Promise.all([
            this.client?.collections.get(WeaviateDocumentClass.name).tenants.create({
                name: tenantId,
                activityStatus: 'HOT'
            }).catch((error) => {
                this.logger.error('addTenant error', error);
            }),

            this.client?.collections.get(WeaviateDocumentRepositoryClass.name).tenants.create({
                name: tenantId,
                activityStatus: 'HOT'
            }).catch((error) => {
                this.logger.error('addTenant error', error);
            }),

            this.client?.collections.get(WeaviateDocumentSectionClass.name).tenants.create({
                name: tenantId,
                activityStatus: 'HOT'
            }).catch((error) => {
                this.logger.error('addTenant error', error);
            }),

            this.client?.collections.get(WeaviateDocumentChunkClass.name).tenants.create({
                name: tenantId,
                activityStatus: 'HOT'
            }).catch((error) => {
                this.logger.error('addTenant error', error);
            }),
        ]).catch((error) => {
            this.logger.error('addTenant error', error);
        });
    }



    public async getDocumentRepository(tenantId: string, repositoryId: string): Promise<DocumentRepositoryModel> {
        const result = await this.client?.collections.get(WeaviateDocumentRepositoryClass.name).withTenant(tenantId).query.fetchObjectById(repositoryId).catch((error) => {
            this.logger.error('getDocumentRepository error', error);
            throw error;
        });
        this.logger.debug('getDocumentRepository', result);
        if (!result) {
            throw new Error('Document repository not found');
        }
        return {
            name: result.properties.name as string,
            id: result.uuid,
            embeddingSecret: result.properties.embeddingSecret as string,
        };

    }

    private async createDocumentRepositoryCollection(): Promise<void> {
        const result = await this.client?.collections.create(WeaviateDocumentRepositoryClass);
        this.logger.debug('createDocumentRepositoryCollection', result);
    }

    private async createDocumentCollection(): Promise<void> {
        const result = await this.client?.collections.create(WeaviateDocumentClass);
        this.logger.debug('createDocumentCollection', result);
    }

    private async createDocumentSectionCollection(): Promise<void> {
        const result = await this.client?.collections.create(WeaviateDocumentSectionClass);
        this.logger.debug('createDocumentSectionCollection', result);
    }

    private async createDocumentChunkCollection(): Promise<void> {
        const result = await this.client?.collections.create(WeaviateDocumentChunkClass);
        this.logger.debug('createDocumentChunkCollection', result);
    }

    public async createDocumentRepository(tenantId: string, repository: DocumentRepositoryModel): Promise<DocumentRepositoryModel> {
        this.logger.debug('createDocumentRepository', repository);

        const existing = await this.client?.collections.get(WeaviateDocumentRepositoryClass.name).withTenant(tenantId).query.fetchObjectById(repository.id!).catch((error) => {
            this.logger.error('createDocumentRepository error', error);
            return null;
        })
        if (existing) {
            this.logger.debug('createDocumentRepository repository already exists', existing.uuid);
            repository.id = existing.uuid;
            return repository;
        }


        const result = await this.client?.collections.get(WeaviateDocumentRepositoryClass.name).withTenant(tenantId).data.insert({
            id: repository.id,
            properties: {
                name: repository.name,
                embeddingSecret: repository.embeddingSecret,
            }
        }).catch((error) => {
            this.logger.error('createDocumentRepository error', error);
            throw error;
        })

        if (!result) {
            throw new Error('Document repository not created');
        }


        this.logger.debug('createDocumentRepository', result);

        repository.id = result;
        return repository;
    }

    public async createDocument(tenantId: string, document: DocumentModel): Promise<DocumentModel> {
        this.logger.debug('createDocument', document.name)
        if (!document.repository.id) {
            throw new Error('Repository id is missing');
        }
        if (!document.id) {
            throw new Error('Document id is missing');
        }
        const collection = this.client?.collections.get(WeaviateDocumentClass.name).withTenant(tenantId);
        const existing = await collection?.query.fetchObjects({
            filters: Filters.and(
                collection.filter.byProperty('name').equal(document.name),
                collection.filter.byRef('repository').byId().equal(document.repository.id)
            )
        }).catch((error) => {
            this.logger.error('createDocument error', error);
            throw error;
        });

        let existingLength = existing?.objects.length ?? 0;
        if (existing && existing?.objects.length > 0) {
            for (const obj of existing.objects) {
                this.logger.debug('createDocument existing', obj.uuid);
                if (document.id !== obj.uuid) {
                    await this.deleteDocument(tenantId, obj.uuid).catch((error) => {
                        this.logger.error('createDocument error', error);
                    });
                    existingLength--;
                }
            }

        }
        if (existingLength > 0) {
            const result = await collection?.data.update({
                id: document.id,
                properties: {
                    name: document.name,
                    format: document.format,
                },
                vectors: document.vector,
            }).catch((error) => {
                this.logger.error('createDocument error', error);
                throw error;
            });
            this.logger.debug('createDocument, update', result);
            return document;
        }




        const result = await collection?.data.insert({
            id: document.id,
            properties: {
                name: document.name,
                format: document.format,
            },
            vectors: document.vector,
            references: {
                repository: document.repository.id
            }
        }).catch((error) => {
            this.logger.error('createDocument error', error);
            throw error;
        });
        this.logger.debug('createDocument, insert', result);
        if (!result) {
            throw new Error('Document not created');
        }
        document.id = result;
        return document;

    }

    public async createDocumentSection(tenantId: string, documentId: string, section: DocumentSectionModel): Promise<DocumentSectionModel> {
        this.logger.debug('createDocumentSection', section);
        const collection = this.client?.collections.get(WeaviateDocumentSectionClass.name).withTenant(tenantId);

        const existing = await collection?.query.fetchObjects({
            filters: Filters.and(
                collection.filter.byProperty('name').equal(section.name),
                collection.filter.byRef('document').byId().equal(documentId)
            )
        }).catch((error) => {
            this.logger.error('createDocumentSection error', error);
            throw error;
        });

        if (existing && existing?.objects.length > 0) {
            section.id = existing.objects[0].uuid;
            const result = await collection?.data.update({
                id: section.id,
                properties: {
                    name: section.name,
                    description: section.description,
                },
                vectors: section.vector
            }).catch((error) => {
                this.logger.error('createDocumentSection error', error);
                throw error;
            });
            this.logger.debug('createDocumentSection', result);
            return section;
        } else {
            const result = await collection?.data.insert({
                properties: {
                    name: section.name,
                    description: section.description,
                },
                vectors: section.vector,
                references: {
                    document: documentId
                }
            }).catch((error) => {
                this.logger.error('createDocumentSection error', error);
                throw error;
            });
            this.logger.debug('createDocumentSection', result);
            if (!result) {
                throw new Error('Document section not created');
            }
            section.id = result;
            return section;
        }
    }

    public async createDocumentChunk(tenantId: string, sectionId: string, chunk: DocumentChunkModel): Promise<DocumentChunkModel> {
        this.logger.debug('createDocumentChunk', chunk);
        const collection = this.client?.collections.get(WeaviateDocumentChunkClass.name).withTenant(tenantId);

        const existing = await collection?.query.fetchObjects({
            filters: Filters.and(
                collection.filter.byProperty('content').equal(chunk.content),
                collection.filter.byRef('section').byId().equal(sectionId)
            )
        }).catch((error) => {
            this.logger.error('createDocumentChunk error', error);
            throw error;
        });

        if (existing && existing?.objects.length > 0) {
            chunk.id = existing.objects[0].uuid;
            const result = await collection?.data.update({
                id: chunk.id,
                properties: {
                    content: chunk.content,
                    position: chunk.position,
                },
                vectors: chunk.vector
            }).catch((error) => {
                this.logger.error('createDocumentChunk error', error);
                throw error;
            });
            this.logger.debug('createDocumentChunk', result);
            return chunk;
        } else {
            const result = await collection?.data.insert({
                properties: {
                    content: chunk.content,
                    position: chunk.position,
                },
                vectors: chunk.vector,
                references: {
                    section: sectionId
                }
            }).catch((error) => {
                this.logger.error('createDocumentChunk error', error);
                throw error;
            });
            this.logger.debug('createDocumentChunk', result);
            if (!result) {
                throw new Error('Document chunk not created');
            }
            chunk.id = result;
            return chunk;
        }
    }

    public async listRepositories(tenantId: string): Promise<DocumentRepositoryModel[]> {
        const collection = this.client?.collections.get(WeaviateDocumentRepositoryClass.name).withTenant(tenantId);
        const result = await collection?.query.fetchObjects().catch((error) => {
            this.logger.error('listRepositories error', error);
            throw error;
        });
        if (!result) {
            return [];
        }
        return result.objects.map((repo) => {
            return {
                name: repo.properties.name as string,
                id: repo.uuid,
                embeddingSecret: repo.properties.embeddingSecret as string,
            };
        });
    }

    public async listDocuments(tenantId: string, repositoryId: string): Promise<DocumentModel[]> {
        const collection = this.client?.collections.get(WeaviateDocumentClass.name).withTenant(tenantId);

        const result = await collection?.query.fetchObjects({
            filters: collection.filter.byRef('repository').byId().equal(repositoryId)
        }).catch((error) => {
            this.logger.error('listDocuments error', error);
            throw error;
        });

        if (!result) {
            return [];
        }

        return result.objects.map((doc) => {
            return {
                name: doc.properties.name as string,
                format: doc.properties.format as string,
                repository: {
                    name: doc.references?.repository.objects?.[0]?.properties.name as string,
                    id: doc.references?.repository.objects?.[0]?.uuid,
                    embeddingSecret: doc.references?.repository.objects?.[0]?.properties.embeddingSecret as string,
                },
                sections: [],
                location: '',
                id: doc.uuid,
            };
        });
    }

    public async searchDocumentChunks(tenantId: string, nearVector: number[], repositoryId?: string, documentIds?: string[], documentSectionId?: string): Promise<DocumentChunkSearchResult> {
        this.logger.debug('searchDocumentChunks', { tenantId, repositoryId, documentIds, documentSectionId });

        const chunkCollection = this.client?.collections.get(WeaviateDocumentChunkClass.name).withTenant(tenantId);

        if (documentSectionId) {
            const result = await chunkCollection?.query.fetchObjects({
                filters: chunkCollection.filter.byRef('section').byId().equal(documentSectionId),
                returnProperties: ['content', 'position'],
                returnMetadata: 'all',
                returnReferences: [
                    {
                        linkOn: 'section',
                        targetCollection: WeaviateDocumentSectionClass.name,
                        returnProperties: ['name', 'description'],
                        // returnReferences: [
                        //     // {
                        //     //     linkOn: 'document',
                        //     //     targetCollection: WeaviateDocumentClass.name,
                        //     //     returnProperties: ['name'],
                        //     //     returnReferences: [
                        //     //         {
                        //     //             linkOn: 'repository',
                        //     //             targetCollection: WeaviateDocumentRepositoryClass.name,
                        //     //             returnProperties: ['name'],
                        //     //             returnMetadata: 'all'
                        //     //         }
                        //     //     ]
                        //     // }
                        // ]
                    }
                ]
            }).catch((error) => {
                this.logger.error('searchDocumentChunks error', error);
                throw error;
            });
            if (!result) {
                this.logger.debug('searchDocumentChunks no result');
                return {
                    DocumentChunks: [],
                } as DocumentChunkSearchResult;
            }
            const resultChunks = result.objects.map((chunk) => {
                
                return {
                    id: chunk.uuid,
                    content: chunk.properties.content as string,
                    position: chunk.properties.position as number,
                    distance: chunk.metadata?.distance ?? 1,
                    section: {
                        id: chunk.references?.section.objects?.[0]?.uuid,
                        name: chunk.references?.section.objects?.[0]?.properties.name as string,
                        description: chunk.references?.section.objects?.[0]?.properties.description as string,
                        // document: {
                        //     id: section.document.id,
                        //     name: section.document.name,                           
                        // }
                    }
                };
            });
            return {
                DocumentChunks: resultChunks,
            } as DocumentChunkSearchResult;
        } else if (documentIds) {
            const sections = await this.getAllSectionsInDocuments(tenantId, documentIds);
            const sectionIds = sections.DocumentSections.map((section) => section.id ?? "undefined").filter((id) => id !== "undefined");
            
            const result = await chunkCollection?.query.nearVector(nearVector, {
                filters: chunkCollection.filter.byRef('section').byId().containsAny(sectionIds),
                returnProperties: ['content', 'position'],
                returnMetadata: ['distance'],
                returnReferences: [
                    {
                        linkOn: 'section',
                        targetCollection: WeaviateDocumentSectionClass.name,
                        returnProperties: ['name', 'description'],
                        // returnReferences: [
                        //     {
                        //         linkOn: 'document',
                        //         targetCollection: WeaviateDocumentClass.name,
                        //         returnProperties: ['name'],
                        //         returnReferences: [
                        //             {
                        //                 linkOn: 'repository',
                        //                 targetCollection: WeaviateDocumentRepositoryClass.name,
                        //                 returnProperties: ['name'],
                        //                 returnMetadata: 'all'
                        //             }
                        //         ]
                        //     }
                        // ]
                    }
                ]
            }).catch((error) => {
                this.logger.error('searchDocumentChunks error', error);
                throw error;
            });
            if (!result) {
                this.logger.debug('searchDocumentChunks no result');

                return {
                    DocumentChunks: [],
                } as DocumentChunkSearchResult;
            }
            return {
                DocumentChunks: result.objects.map((chunk) => {
                    const section = sections.DocumentSections.find((section) => section.id === chunk.references?.section.objects?.[0]?.uuid);
                    return {
                        id: chunk.uuid,
                        content: chunk.properties.content as string,
                        position: chunk.properties.position as number,
                        distance: chunk.metadata?.distance ?? 1,
                        section: {
                            id: chunk.references?.section.objects?.[0]?.uuid,
                            name: chunk.references?.section.objects?.[0]?.properties.name as string,
                            description: chunk.references?.section.objects?.[0]?.properties.description as string,
                            document: {
                                id: section?.document.id,
                                name: section?.document.name,
                            }
                        }
                    };
                }),
            } as DocumentChunkSearchResult;
        } else if (repositoryId) {
            const documents = await this.listDocuments(tenantId, repositoryId);
            const documentIds = documents.map((doc) => doc.id ?? "undefined");
            const sections = await this.getAllSectionsInDocuments(tenantId, documentIds);
            const sectionIds = sections.DocumentSections.map((section) => section.id ?? "undefined").filter((id) => id !== "undefined");
            const result = await chunkCollection?.query.nearVector(nearVector, {
                filters: chunkCollection.filter.byRef('section').byId().containsAny(sectionIds),
                returnProperties: ['content', 'position'],
                returnMetadata: ['distance'],
                limit: 100,
                returnReferences: [
                    {
                        linkOn: 'section',
                        targetCollection: WeaviateDocumentSectionClass.name,
                        returnProperties: ['name', 'description'],
                        // returnReferences: [
                        //     {
                        //         linkOn: 'document',
                        //         targetCollection: WeaviateDocumentClass.name,
                        //         returnProperties: ['name'],
                        //         returnReferences: [
                        //             {
                        //                 linkOn: 'repository',
                        //                 targetCollection: WeaviateDocumentRepositoryClass.name,
                        //                 returnProperties: ['name'],
                        //                 returnMetadata: 'all'
                        //             }
                        //         ]
                        //     }
                        // ]
                    }
                ]
            }).catch((error) => {
                this.logger.error('searchDocumentChunks error', error);
                throw error;
            });
            if (!result) {
                this.logger.debug('searchDocumentChunks no result');
                return {
                    DocumentChunks: [],
                } as DocumentChunkSearchResult;
            }
            this.logger.debug('searchDocumentChunks', result.objects.length);
            this.logger.debug('searchDocumentChunks', JSON.stringify(result));
            return {
                DocumentChunks: result.objects.map((chunk) => {
                    const section = sections.DocumentSections.find((section) => section.id === chunk.references?.section.objects?.[0]?.uuid);
                    return {
                        id: chunk.uuid,
                        content: chunk.properties.content as string,
                        position: chunk.properties.position as number,
                        distance: chunk.metadata?.distance ?? 1,
                        section: {
                            id: chunk.references?.section.objects?.[0]?.uuid,
                            name: chunk.references?.section.objects?.[0]?.properties.name as string,
                            description: chunk.references?.section.objects?.[0]?.properties.description as string,
                            document: {
                                id: section?.document.id,
                                name: section?.document.name,
                            }
                        }
                    };
                }),
            } as DocumentChunkSearchResult;
        }

        return {
            DocumentChunks: [],
        } as DocumentChunkSearchResult;
    }

    public async searchDocumentSections(tenantId: string, nearVector: number[], repositoryId?: string, documentIds?: string[]): Promise<DocumentSectionSearchResult> {
        this.logger.debug('searchDocumentSections', { tenantId, repositoryId, documentIds });

        const sectionCollection = this.client?.collections.get(WeaviateDocumentSectionClass.name).withTenant(tenantId);

        if (documentIds) {
            const result = await sectionCollection?.query.nearVector(nearVector, {
                filters: sectionCollection.filter.byRef('document').byId().containsAny(documentIds),
                returnProperties: ['name', 'description'],
                returnMetadata: ['distance'],
                returnReferences: [
                    {
                        linkOn: 'document',
                        targetCollection: WeaviateDocumentClass.name,
                        returnProperties: ['name'],
                        returnReferences: [
                            {
                                linkOn: 'repository',
                                targetCollection: WeaviateDocumentRepositoryClass.name,
                                returnProperties: ['name'],
                                returnMetadata: 'all'
                            }
                        ]
                    }
                ]
            }).catch((error) => {
                this.logger.error('searchDocumentSections error', error);
                throw error;
            });
            if (!result) {
                return {
                    DocumentSections: [],
                } as DocumentSectionSearchResult;
            }
            return {
                DocumentSections: result.objects.map((section) => {
                    return {
                        id: section.uuid,
                        name: section.properties.name as string,
                        description: section.properties.description as string,
                        distance: section.metadata?.distance ?? 1,
                        document: {
                            id: section.references?.document.objects?.[0]?.uuid,
                            name: section.references?.document.objects?.[0]?.properties.name as string,
                            repository: {
                                id: section.references?.document.objects?.[0]?.references?.repository.objects?.[0]?.uuid,
                                name: section.references?.document.objects?.[0]?.references?.repository.objects?.[0]?.properties.name as string,
                            }
                        }
                    };
                }),
            } as DocumentSectionSearchResult;
        } else if (repositoryId) {
            const documents = await this.listDocuments(tenantId, repositoryId);
            const documentIds = documents.map((doc) => doc.id ?? "");
            const result = await sectionCollection?.query.nearVector(nearVector, {
                filters: sectionCollection.filter.byRef('document').byId().containsAny(documentIds),
                returnProperties: ['name', 'description'],
                returnMetadata: ['distance'],
                returnReferences: [
                    {
                        linkOn: 'document',
                        targetCollection: WeaviateDocumentClass.name,
                        returnProperties: ['name'],
                        returnReferences: [
                            {
                                linkOn: 'repository',
                                targetCollection: WeaviateDocumentRepositoryClass.name,
                                returnProperties: ['name'],
                                returnMetadata: 'all'
                            }
                        ]
                    }
                ]
            }).catch((error) => {
                this.logger.error('searchDocumentSections error', error);
                throw error;
            });

            if (!result) {
                return {
                    DocumentSections: [],
                } as DocumentSectionSearchResult;
            }

            return {
                DocumentSections: result.objects.map((section) => {
                    return {
                        id: section.uuid,
                        name: section.properties.name as string,
                        description: section.properties.description as string,
                        distance: section.metadata?.distance ?? 1,
                        document: {
                            id: section.references?.document.objects?.[0]?.uuid,
                            name: section.references?.document.objects?.[0]?.properties.name as string,
                            repository: {
                                id: section.references?.document.objects?.[0]?.references?.repository.objects?.[0]?.uuid,
                                name: section.references?.document.objects?.[0]?.references?.repository.objects?.[0]?.properties.name as string,
                            }
                        }
                    };
                }),
            } as DocumentSectionSearchResult;
        }

        return {
            DocumentSections: [],
        } as DocumentSectionSearchResult;
    }

    private async getAllSectionsInDocuments(tenantId: string, documentIds: string[]): Promise<DocumentSectionSearchResult> {
        const collection = this.client?.collections.get(WeaviateDocumentSectionClass.name).withTenant(tenantId);

        const result = await collection?.query.fetchObjects({
            filters: collection.filter.byRef('document').byId().containsAny(documentIds),
            returnProperties: ['name', 'description'],
            returnReferences: [
                {
                    linkOn: 'document',
                    targetCollection: WeaviateDocumentClass.name,
                    returnProperties: ['name'],
                    returnMetadata: 'all'
                }
            ],
            limit: 1000
        }).catch((error) => {
            this.logger.error('getAllSectionsInDocument error', error);
            throw error;
        });

        this.logger.debug('getAllSectionsInDocuments', result?.objects.length);

        if (!result) {
            return {
                DocumentSections: [],
            } as DocumentSectionSearchResult;
        }

        this.logger.debug('getAllSectionsInDocuments', JSON.stringify(result));

        return {
            DocumentSections: result.objects.map((section) => {
                return {
                    id: section.uuid,
                    name: section.properties.name as string,
                    description: section.properties.description as string,
                    document: {
                        id: section.references?.document.objects?.[0]?.uuid,
                        name: section.references?.document.objects?.[0]?.properties.name as string,
                        // repository: {
                        //     id: section.references?.document.objects?.[0]?.references?.repository.objects?.[0]?.uuid,
                        //     name: section.references?.document.objects?.[0]?.references?.repository.objects?.[0]?.properties.name as string,
                        // }
                    }
                };
            }),
        } as DocumentSectionSearchResult;
    }

    public async getAllSectionsInDocument(tenantId: string, documentId: string): Promise<DocumentSectionSearchResult> {
        const collection = this.client?.collections.get(WeaviateDocumentSectionClass.name).withTenant(tenantId);

        const result = await collection?.query.fetchObjects({
            filters: collection.filter.byRef('document').byId().equal(documentId),
            returnProperties: ['name', 'description'],
            returnReferences: [
                {
                    linkOn: 'document',
                    targetCollection: WeaviateDocumentClass.name,
                    returnProperties: ['name'],
                    returnReferences: [
                        {
                            linkOn: 'repository',
                            targetCollection: WeaviateDocumentRepositoryClass.name,
                            returnProperties: ['name'],
                            returnMetadata: 'all'
                        }
                    ]
                }
            ]
        }).catch((error) => {
            this.logger.error('getAllSectionsInDocument error', error);
            throw error;
        });

        this.logger.debug('getAllSectionsInDocument', result?.objects.length);

        if (!result) {
            return {
                DocumentSections: [],
            } as DocumentSectionSearchResult;
        }

        return {
            DocumentSections: result.objects.map((section) => {
                return {
                    id: section.uuid,
                    name: section.properties.name as string,
                    description: section.properties.description as string,
                    document: {
                        id: section.references?.document.objects?.[0]?.uuid,
                        name: section.references?.document.objects?.[0]?.properties.name as string,
                        // repository: {
                        //     id: section.references?.document.objects?.[0]?.references?.repository.objects?.[0]?.uuid,
                        //     name: section.references?.document.objects?.[0]?.references?.repository.objects?.[0]?.properties.name as string,
                        // }
                    }
                };
            }),
        } as DocumentSectionSearchResult;
    }


    public async getAllChunksInSection(tenantId: string, sectionId: string): Promise<DocumentChunkSearchResult> {
        const collection = this.client?.collections.get(WeaviateDocumentChunkClass.name).withTenant(tenantId);

        const result = await collection?.query.fetchObjects({
            filters: collection.filter.byRef('section').byId().equal(sectionId),
            returnProperties: ['content', 'position'],
            returnReferences: [
                {
                    linkOn: 'section',
                    targetCollection: WeaviateDocumentSectionClass.name,
                    returnProperties: ['name', 'description'],
                    returnReferences: [
                        {
                            linkOn: 'document',
                            targetCollection: WeaviateDocumentClass.name,
                            returnProperties: ['name'],
                            returnReferences: [
                                {
                                    linkOn: 'repository',
                                    targetCollection: WeaviateDocumentRepositoryClass.name,
                                    returnProperties: ['name'],
                                    returnMetadata: 'all'
                                }
                            ]
                        }
                    ]
                }
            ]
        }).catch((error) => {
            this.logger.error('getAllChunksInSection error', error);
            throw error;
        });

        this.logger.debug('getAllChunksInSection', result?.objects.length);

        if (!result) {
            return {
                DocumentChunks: [],
            } as DocumentChunkSearchResult;
        }

        return {
            DocumentChunks: result.objects.map((chunk) => {
                return {
                    id: chunk.uuid,
                    content: chunk.properties.content as string,
                    position: chunk.properties.position as number,
                    section: {
                        id: chunk.references?.section.objects?.[0]?.uuid,
                        name: chunk.references?.section.objects?.[0]?.properties.name as string,
                        description: chunk.references?.section.objects?.[0]?.properties.description as string,
                        // document: {
                        //     id: chunk.references?.section.objects?.[0]?.references?.document.objects?.[0]?.uuid,
                        //     name: chunk.references?.section.objects?.[0]?.references?.document.objects?.[0]?.properties.name as string,
                        //     repository: {
                        //         id: chunk.references?.section.objects?.[0]?.references?.document.objects?.[0]?.references?.repository.objects?.[0]?.uuid,
                        //         name: chunk.references?.section.objects?.[0]?.references?.document.objects?.[0]?.references?.repository.objects?.[0]?.properties.name as string,
                        //     }
                        // }
                    }
                };
            }),
        } as DocumentChunkSearchResult;
    }

    async deleteDocumentRepository(orgId: string, repositoryId: string): Promise<void> {
        await this.deleteDocuments(orgId, repositoryId);
        const collection = this.client?.collections.get(WeaviateDocumentRepositoryClass.name).withTenant(orgId);

        const result = await collection?.data.deleteById(repositoryId).catch((error) => {
            this.logger.error('deleteDocumentRepository error', error);
            throw error;
        });

        this.logger.debug('deleteDocumentRepository', result);
    }

    async deleteDocuments(orgId: string, repositoryId: string): Promise<void> {
        const documents = await this.listDocuments(orgId, repositoryId);
        documents.forEach((doc) => {
            this.deleteDocument(orgId, doc.id!).catch((error) => {
                this.logger.error('deleteDocuments error', error);
            });
        });
    }

    async deleteDocument(orgId: string, documentId: string): Promise<boolean> {
        await this.deleteDocumentSections(orgId, documentId).catch((error) => {
            this.logger.error('deleteDocument error', error);
        });
        const collection = this.client?.collections.get(WeaviateDocumentClass.name).withTenant(orgId);

        const result = await collection?.data.deleteById(documentId).catch((error) => {
            this.logger.error('deleteDocument error', error);
            throw error;
        });

        this.logger.debug('deleteDocument', result);
        return result ? true : false;
    }

    async deleteDocumentSections(orgId: string, documentId: string): Promise<void> {
        const sections = await this.getAllSectionsInDocument(orgId, documentId);

        const promises = sections.DocumentSections.map((section) => {
            return this.deleteDocumentChunks(orgId, section.id).then(() => {
                return this.deleteDocumentSection(orgId, section.id).catch((error) => {
                    this.logger.error('deleteDocumentSections error', error);
                });
            }).catch((error) => {
                this.logger.error('deleteDocumentSections error', error);
            });
        });
        await Promise.all(promises);
    }

    async deleteDocumentSection(orgId: string, sectionId: string): Promise<void> {
        const collection = this.client?.collections.get(WeaviateDocumentSectionClass.name).withTenant(orgId);
        const result = await collection?.data.deleteById(sectionId).catch((error) => {
            this.logger.error('deleteDocumentSection error', error);
            throw error;
        });

        this.logger.debug('deleteDocumentSection', result);

        return Promise.resolve();

    }

    async deleteDocumentChunks(orgId: string, sectionId: string): Promise<void> {
        const collection = this.client?.collections.get(WeaviateDocumentChunkClass.name).withTenant(orgId);
        const result = await collection?.data.deleteMany(collection.filter.byRef('section').byId().equal(sectionId)).catch((error) => {
            this.logger.error('deleteDocumentChunks error', error);
            throw error;
        });
        this.logger.debug('deleteDocumentChunks', JSON.stringify(result));
    }

    async deleteDocumentChunk(orgId: string, chunkId: string): Promise<void> {
        const collection = this.client?.collections.get(WeaviateDocumentChunkClass.name).withTenant(orgId);
        const result = await collection?.data.deleteById(chunkId).catch((error) => {
            this.logger.error('deleteDocumentChunk error', error);
            throw error;
        });
        this.logger.debug('deleteDocumentChunk', JSON.stringify(result));
    }
}

