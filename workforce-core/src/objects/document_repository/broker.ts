import { Subject, Subscription } from "rxjs";
import { Logger } from "../../logging/logger.js";
import { BaseBroker, BrokerConfig } from "../base/broker.js";
import { DocumentRepository } from "./base.js";
import { DocumentData, DocumentRepositoryConfig, SearchRequest, SearchResponse } from "./model.js";
import { SubjectFactory } from "../../manager/impl/subject_factory.js";
import { DocumentDb } from "./db.document.js";
import { DocumentRepositoryDb } from "./db.js";

export class DocumentRepositoryBroker extends BaseBroker<DocumentRepositoryConfig, DocumentRepository, object> {
    logger = Logger.getInstance("DocumentRepositoryBroker");

    private searchResponseSubjects = new Map<string, Subject<SearchResponse>>();

    private documentSubject = new Subject<DocumentData>();
    private searchRequestSubject = new Subject<SearchRequest>();
    private searchResponseSubject = new Subject<SearchResponse>();
    private deletionDaemon: NodeJS.Timeout | undefined;

    constructor(config: BrokerConfig, searchRequestSubject?: Subject<SearchRequest>, searchResponseSubject?: Subject<SearchResponse>, documentSubject?: Subject<DocumentData>) {
        super(config);

        if (searchRequestSubject) {
            this.searchRequestSubject = searchRequestSubject;
        }

        if (searchResponseSubject) {
            this.searchResponseSubject = searchResponseSubject;
        }

        if (documentSubject) {
            this.documentSubject = documentSubject;
        }

        this.searchRequestSubject.subscribe({
            next: this.handleSearchRequest.bind(this),
            error: (error: Error) => {
                this.logger.error(`constructor() error handling search request error=${error}`);
            }
        });
        this.searchResponseSubject.subscribe({
            next: this.handleSearchResponse.bind(this),
            error: (error: Error) => {
                this.logger.error(`constructor() error handling search response error=${error}`);
            }
        });
        this.documentSubject.subscribe({
            next: (data) => {
                const handler = this.handleDocumentData.bind(this);
                handler(data).catch((error) => {
                    this.logger.error(`constructor() error handling document data error=${error}`);
                });
            },
            error: (error: Error) => {
                this.logger.error(`constructor() error handling document data error=${error}`);
            }
        });

        const deletionDaemon = () => {
            DocumentRepositoryDb.findAll({
                where: {
                    status: "deleted"
                }
            }).then((repositoryDbs) => {
                Promise.all(repositoryDbs.map(async repositoryDb => {
                    const object = this.objects.get(repositoryDb.id);
                    if (object) {
                        await object.deleteThis();
                    }
                })).then(() => {
                    DocumentDb.findAll({
                        where: {
                            status: "deleted"
                        }
                    }).then((documents) => {
                        Promise.all(documents.map(async document => {
                            const object = this.objects.get(document.repositoryId);
                            if (object) {
                                await object.deleteDocument(document.id);
                            }
                        }))             
                        .catch((error) => {
                            this.logger.error(`deletionDaemon() deleteDocument Error =${error}`);
                        });
                    }).catch((error) => {
                        this.logger.error(`deletionDaemon() findAllDeletedDocuments error=${error}`);
                    });
                }).catch((error) => {
                    this.logger.error(`deletionDaemon() deleteThisRepository error=${error}`);
                });
            }).catch((error) => {
                this.logger.error(`deletionDaemon() findAllDeletedRepositories error=${error}`);
            });
        }
        this.deletionDaemon = setInterval(deletionDaemon, 1000 * 60);
    }

    static async create(config: BrokerConfig): Promise<DocumentRepositoryBroker> {
        const { mode } = config;
        const searchRequestSubject = await SubjectFactory.createSubject<SearchRequest>({ channel: "document-repository.search.request", mode });
        const searchResponseSubject = await SubjectFactory.createSubject<SearchResponse>({ channel: "document-repository.search.response", mode });
        const documentSubject = await SubjectFactory.createSubject<DocumentData>({ channel: "document-repository.document", mode });
        return new DocumentRepositoryBroker(config, searchRequestSubject, searchResponseSubject, documentSubject);
    }

    async register(documentRepository: DocumentRepository): Promise<void> {
        await super.register(documentRepository);

        const searchResponseSubject = new Subject<SearchResponse>();

        if (this.searchResponseSubjects.has(documentRepository.config.id!)) {
            this.searchResponseSubjects.get(documentRepository.config.id!)?.unsubscribe();
            this.searchResponseSubjects.delete(documentRepository.config.id!);
        }
        this.searchResponseSubjects.set(documentRepository.config.id!, searchResponseSubject);
    }

    private handleSearchRequest(request: SearchRequest): void {
        const documentRepository = this.objects.get(request.repositoryId);
        if (documentRepository) {
            this.logger.debug(`handleSearchRequest() ${JSON.stringify(request, null, 2)}`);
            documentRepository.search(request.query, request.documentIds, request.retrievalScope, request.desiredTokens, request.maxTokens, request.tokenFillStrategy).then((result) => {
                this.logger.debug(`handleSearchRequest() Search in repository ${request.repositoryId} result=${result.result}`);
                this.searchResponseSubject.next({
                    repositoryId: request.repositoryId,
                    requestId: request.requestId,
                    result: result.result,
                    distance: result.distance
                });
            }).catch((error: Error) => {
                this.logger.error(`handleSearchRequest() Error searching in repository ${request.repositoryId} error=${error}`);
                this.searchResponseSubject.next({
                    repositoryId: request.repositoryId,
                    requestId: request.requestId,
                    result: "Error executing search",
                    distance: 1.0
                });
            });
        }
    }

    private handleSearchResponse(response: SearchResponse): void {
        const subject = this.searchResponseSubjects.get(response.repositoryId);
        if (subject) {
            subject.next(response);
        }
    }

    private async handleDocumentData(documentData: DocumentData): Promise<void> {
        const documentRepository = this.objects.get(documentData.repositoryId);
        if (documentRepository && documentData.status === "uploaded") {
            this.logger.debug(`handleDocumentData() Indexing document ${documentData.id}`);
            let documentDb = await DocumentDb.findByPk(documentData.id);
            if (!documentDb) {
                this.logger.debug(`handleDocumentData() Document not in db, adding ${documentData.id}`);
                documentDb = await DocumentDb.create(documentData);
            } else if (documentDb.status === "indexed") {
                this.logger.debug(`handleDocumentData() Document ${documentData.id} already indexed`);
                return;
            }
            try {
                await documentRepository.indexDocument(documentData)
                documentDb.status = "indexed";
                await documentDb.save();
                this.logger.debug(`handleDocumentData() Document ${documentData.id} indexed`);
            } catch (error) {
                this.logger.error(`handleDocumentData() Document ${documentData.id} indexing error=`, error);
            }
        } else if (documentRepository && documentData.status === "deleted") {
            this.logger.debug(`handleDocumentData() Removing document ${documentData.id}`);
            const documentDb = await DocumentDb.findByPk(documentData.id);
            if (documentDb) {
                const deleted = await documentRepository.deleteDocument(documentData.id).catch((error) => {
                    this.logger.error(`handleDocumentData() Error deleting document ${documentData.id} error=${error}`);
                    return false;
                });
                this.logger.debug(`handleDocumentData() Document ${documentData.id} deleted=${deleted}`);
            }
        }
    }

    public async search(request: SearchRequest): Promise<SearchResponse> {
        const responseSubject = this.searchResponseSubjects.get(request.repositoryId);
        if (responseSubject) {
            return new Promise((resolve) => {
                const subscription = responseSubject.subscribe((response) => {
                    if (response.requestId !== request.requestId) {
                        return;
                    }
                    resolve(response);
                    subscription.unsubscribe();
                });
                this.searchRequestSubject.next(request);
            });
        } else {
            throw new Error("No response subject found");
        }
    }

    public async remove(objectId: string): Promise<void> {
        this.logger.debug(`remove() documentRepositoryId=${objectId}`);
        await this.objects.get(objectId)?.destroy().catch((error: Error) => {
            this.logger.error(`remove() documentRepositoryId=${objectId} error=${error.message}`);
        });
        this.searchResponseSubjects.get(objectId)?.unsubscribe();
        this.searchResponseSubjects.delete(objectId);
        this.objects.delete(objectId);
    }

    public async destroy(): Promise<void> {
        if (this.deletionDaemon) {
            clearInterval(this.deletionDaemon);
        }
        await Promise.all(Array.from(this.objects.keys()).map((objectId) => this.remove(objectId)));

        this.searchRequestSubject.complete();
        this.searchResponseSubject.complete();
        this.documentSubject.complete();
    }

    public subscribe(objectId: string, callback: (e: object) => Promise<void>): Promise<Subscription> {
        return Promise.resolve(this.documentSubject.subscribe(data => {
            if (data.repositoryId === objectId) {
                callback(data).catch((error) => {
                    this.logger.error(`subscribe() error=${error}`);
                });
            }
        }));
    }
}