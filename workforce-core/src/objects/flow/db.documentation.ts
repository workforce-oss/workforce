import { CredentialHelper } from "../credential/helper.js";
import { DocumentRepositoryDb } from "../document_repository/db.js";
import { DocumentDb } from "../document_repository/db.document.js";
import { DocumentationConfig } from "../documentation/model.js";
import { Op } from "sequelize";

export async function mapDocumentationNamesToIds(configs: DocumentationConfig[], orgId: string): Promise<void> {
    for (const config of configs) {
        await CredentialHelper.instance.replaceCredentialNameWithId(config, orgId);
        if (config.repository) {
            const foundRepository = await DocumentRepositoryDb.findOne({
                where: {
                    orgId: orgId,
                    name: config.repository,
                    [Op.or]: [
                        {
                            status: {
                                [Op.is]: null
                            },
                        },
                        {
                            status: {
                                [Op.ne]: "deleted"
                            },
                        },
                    ]
                },
                include: {
                    all: true
                }
            });
            if (foundRepository) {
                config.repository = foundRepository.id;
                if (config.documents) {
                    const documents: string[] = [];
                    for (const document of config.documents) {
                        const foundDocument = await DocumentDb.findOne({
                            where: {
                                repositoryId: foundRepository.id,
                                name: document,
                                status: {
                                    [Op.ne]: "deleted"
                                }
                            },
                            include: {
                                all: true
                            }
                        });
                        if (foundDocument) {
                            documents.push(foundDocument.id);
                        }
                    }
                    config.documents = documents;
                }
            }
        }
    }
}

export async function mapDocumentationIdsToNames(configs: DocumentationConfig[], orgId: string): Promise<void> {
    for (const config of configs) {
        await CredentialHelper.instance.replaceCredentialIdWithName(config);
        if (config.repository) {
            const foundRepository = await DocumentRepositoryDb.findOne({
                where: {
                    orgId: orgId,
                    id: config.repository,
                    [Op.or]: [
                        {
                            status: {
                                [Op.is]: null
                            },
                        },
                        {
                            status: {
                                [Op.ne]: "deleted"
                            },
                        },
                    ]
                },
                include: {
                    all: true
                }
            });
            if (foundRepository) {
                config.repository = foundRepository.name;
                if (config.documents) {
                    const documents: string[] = [];
                    for (const document of config.documents) {
                        const foundDocument = await DocumentDb.findOne({
                            where: {
                                repositoryId: foundRepository.id,
                                id: document,
                                status: {
                                    [Op.ne]: "deleted"
                                }
                            },
                            include: {
                                all: true
                            }
                        });
                        if (foundDocument) {
                            documents.push(foundDocument.name);
                        }
                    }
                    config.documents = documents;
                }
            }
        }
    }
}