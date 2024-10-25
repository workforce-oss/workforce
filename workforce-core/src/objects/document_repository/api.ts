import { Router } from "express";
import { ModelRouter } from "../base/api.js";
import bodyParser from "body-parser";
import express from "express";
import { DocumentDb } from "./db.document.js";
import { DocumentRepositoryDb } from "./db.js";
import { Logger } from "../../logging/logger.js";
import { AuthorizationHelper } from "../../identity/authorization_helper.js";
import { Op } from "sequelize";


export const DocumentRepositoryRouter: Router = ModelRouter("document_repository", {
    additionalRoutes: [
        (router: Router) => {
            router.get("/:id/documents", [
                bodyParser.json(),
                AuthorizationHelper.withOrgRole(["admin", "maintainer", "developer"]),
                async (req: express.Request, res: express.Response) => {
                    try {
                        const orgId = req.params.orgId;
                        const repositoryId = req.params.id;
                        const documentRepository = await DocumentRepositoryDb.findOne({
                            where: {
                                id: repositoryId,
                                orgId: orgId,
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
                            }
                        });
                        if (!documentRepository) {
                            res.status(404).send({ message: "Not Found" });
                            return;
                        }
                        const documents = await DocumentDb.findAll({
                            where: {
                                repositoryId: repositoryId,
                                status: {
                                    [Op.ne]: "deleted"
                                },
                            }
                        });
                        res.status(200).send(documents.map((doc) => doc.toModel()));
                    } catch (e) {
                        Logger.getInstance("document_repository-api").error(`Error getting documents: `, e);
                        res.status(500).send({ message: "Unknown Error getting documents" });
                    }
                }
            ]);
        }
    ]
});