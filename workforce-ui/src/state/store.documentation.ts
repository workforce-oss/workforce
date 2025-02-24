
import { WorkforceAPIClient } from "workforce-api-client";
import { DocumentData, DocumentRepositoryConfig, VariableSchemaValidationError } from "workforce-core/model";
import { temporal } from "zundo";
import { create, StateCreator } from "zustand";

export type DocumentRepositoryState = {
    message: string | undefined;
    error: string | undefined;
    documentRepositories: DocumentRepositoryConfig[];
    documents: DocumentData[];
    clearMessage: () => void;
    clearError: () => void;
    addDocumentRepository: (documentRepository: DocumentRepositoryConfig) => void;
    removeDocumentRepository: (documentRepository: DocumentRepositoryConfig) => void;
    updateDocumentRepository: (documentRepository: DocumentRepositoryConfig) => void;
    deleteDocument: (repositoryId: string, documentId: string) => void;
    uploadDocument: (documentRepository: DocumentRepositoryConfig, formData: FormData,) => void;
    hydrateDocuments: (documentRepository: DocumentRepositoryConfig) => void;
    hydrate: (orgId: string) => void;
};

export const documentRepositoryStore = create<DocumentRepositoryState>()(
    temporal((set, get: () => DocumentRepositoryState) => ({
        message: undefined,
        error: undefined,
        documentRepositories: [],
        documents: [],
        clearMessage: () => {
            set({
                message: undefined,
            });
        },
        clearError: () => {
            set({
                error: undefined,
            });
        },
        addDocumentRepository: (documentRepository: DocumentRepositoryConfig) => {
            WorkforceAPIClient.DocumentRepositoryAPI
                .create(documentRepository, { orgId: documentRepository.orgId })
                .then((response: DocumentRepositoryConfig | VariableSchemaValidationError[]) => {
                    if (Array.isArray(response)) {
                        const error = response.map((e) => e.message).join("\n");
                        console.error(response);
                        set({
                            error: error,
                        });
                        return;
                    }
                    set({
                        documentRepositories: [...get().documentRepositories, response],
                    });
                })
                .catch((e) => {
                    console.error(e);
                    set({
                        error: e.message,
                    });
                });
        },
        removeDocumentRepository: (documentRepository: DocumentRepositoryConfig) => {
            WorkforceAPIClient.DocumentRepositoryAPI
                .delete(documentRepository.id, { orgId: documentRepository.orgId })
                .then(() => {
                    console.log(`deleteDocumentRepository() deleted documentRepository ${documentRepository.name}`);
                    set({
                        documentRepositories: get().documentRepositories.filter((w) => w.id !== documentRepository.id),
                    });
                })
                .catch((e) => {
                    console.error(e);
                    set({
                        error: e.message,
                    });
                });
        },
        updateDocumentRepository: (documentRepository: DocumentRepositoryConfig) => {
            WorkforceAPIClient.DocumentRepositoryAPI
                .update(documentRepository, documentRepository.id, { orgId: documentRepository.orgId })
                .then((response: DocumentRepositoryConfig | VariableSchemaValidationError[]) => {
                    if (Array.isArray(response)) {
                        const error = response.map((e) => e.message).join("\n");
                        console.error(response);
                        set({
                            error: error,
                        });
                        return;
                    }
                    set({
                        documentRepositories: get().documentRepositories.map((w) => {
                            if (w.id === documentRepository.id) {
                                return documentRepository;
                            }
                            return w;
                        }),
                    });
                })
                .catch((e) => {
                    console.error(e);
                    set({
                        error: e.message,
                    });
                });
        },
        uploadDocument: (documentRepository: DocumentRepositoryConfig, formData: FormData) => {
            WorkforceAPIClient.StorageAPI
                .call(documentRepository.id, formData)
                .then((response: boolean) => {
                    if (!response) {
                        set({
                            error: "Failed to upload document"
                        });
                        return;
                    }
                    get().hydrateDocuments(documentRepository);
                    set({
                        message: "Document uploaded"
                    });

                })
        },
        deleteDocument: (repositoryId: string, documentId: string) => {
            WorkforceAPIClient.StorageAPI
                .delete(repositoryId, documentId)
                .then((response: boolean) => {
                    if (!response) {
                        set({
                            error: "Failed to delete document"
                        });
                        return;
                    }
                    set({
                        documents: get().documents.filter((d) => d.id !== documentId)
                    });
                })
                .catch((e) => {
                    console.error(e);
                    set({
                        error: e.message,
                    });
                });
        },
        hydrateDocuments: (documentRepository: DocumentRepositoryConfig) => {
            WorkforceAPIClient.DocumentRepositoryAPI
                .listDocuments(documentRepository.id, {
                    orgId: documentRepository.orgId,
                })
                .then((response: DocumentData[]) => {
                    set({
                        documents: [...response]
                    });
                })
                .catch((e) => {
                    console.error(e);
                    set({
                        error: e.message,
                    });
                });
        },
        hydrate: (orgId: string) => {
            WorkforceAPIClient.DocumentRepositoryAPI
                .list({
                    orgId,
                })
                .then((response: DocumentRepositoryConfig[]) => {
                    set({
                        documentRepositories: response,
                    });
                })
                .catch((error: any) => {
                    console.error(error);
                    set({
                        error: error.message,
                    });
                });
        },
    })) as StateCreator<DocumentRepositoryState, [], [never, unknown][]>
);