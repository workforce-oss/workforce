import { CollectionConfigCreate, dataType, vectorizer } from "weaviate-client";

export const WeaviateDocumentRepositoryClass: CollectionConfigCreate = {
    name: 'DocumentRepository',
    description: 'A repository of documents',
    vectorizers: vectorizer.none(),
    properties: [
        {
            name: 'name',
            dataType: dataType.TEXT
        },
        {
            name: 'embeddingSecret',
            dataType: dataType.TEXT
        }
    ],

    multiTenancy: {
        enabled: true,
        autoTenantCreation: true,
        autoTenantActivation: true,
    },
}

export const WeaviateDocumentClass: CollectionConfigCreate = {
    name: 'Document',
    description: 'A document',
    vectorizers: vectorizer.none(),
    properties: [
        {
            name: 'name',
            dataType: dataType.TEXT
        },
        {
            name: 'format',
            dataType: dataType.TEXT
        },
    ],
    references: [
        {
            name: 'repository',
            targetCollection: 'DocumentRepository',
        }
    ],
    multiTenancy: { 
        enabled: true,
        autoTenantCreation: true,
        autoTenantActivation: true,
    }
}

export const WeaviateDocumentSectionClass: CollectionConfigCreate = {
    name: 'DocumentSection',
    description: 'A section of a document',
    vectorizers: vectorizer.none(),
    properties: [
        {
            name: 'name',
            dataType: dataType.TEXT
        },
        {
            name: 'description',
            dataType: dataType.TEXT
        },
    ],
    references: [
        {
            name: 'document',
            targetCollection: 'Document',
        }
    ],
    multiTenancy: {
        enabled: true,
        autoTenantCreation: true,
        autoTenantActivation: true,
    }

}

export const WeaviateDocumentChunkClass: CollectionConfigCreate = {
    name: 'DocumentChunk',
    description: 'A chunk of a document',
    vectorizers: vectorizer.none(),
    properties: [
        {
            name: 'content',
            dataType: dataType.TEXT
        },
        {
            name: 'position',
            dataType: dataType.INT
        },
    ],
    references: [
        {
            name: 'section',
            targetCollection: 'DocumentSection',
        }
    ],
    multiTenancy: {
        enabled: true,
        autoTenantCreation: true,
        autoTenantActivation: true,
    }
}

export interface WeaviateDocumentChunkSearchResult {
    data: {
        Get: {
            DocumentChunk: {
                _additional: {
                    id: string
                    distance: number
                }
                content: string
                position: number
                section?: {
                    _additional: {
                        id: string
                    }
                    name: string
                    description: string
                    document?: {
                        _additional: {
                            id: string
                        }
                        name: string
                        repository?: {
                            _additional: {
                                id: string
                            }
                            name: string
                        }[]
                    }[]
                }[]
            }[]
        }
    }
}

export interface WeaviateDocumentSectionSearchResult {
    data: {
        Get: {
            DocumentSection: {
                _additional: {
                    id: string
                    distance: number
                }
                name: string
                description: string
                document?: {
                    _additional: {
                        id: string
                    }
                    name: string
                    repository?: {
                        _additional: {
                            id: string
                        }
                        name: string
                    }[]
                }[]
            }[]
        }
    }
}