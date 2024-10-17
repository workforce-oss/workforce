import { Router } from "express";
import { ModelHandlers } from "../base/api.js";
import bodyParser from "body-parser";
import express from "express";
import { DocumentDb } from "./db.document.js";
import { DocumentRepositoryDb } from "./db.js";
import { Logger } from "../../logging/logger.js";
import { AuthorizationHelper } from "../../identity/authorization_helper.js";
import { Op } from "sequelize";

export const DocumentRepositoryRoutes: Router = Router({ mergeParams: true });
const Handlers = ModelHandlers('document_repository');
DocumentRepositoryRoutes.post("/", ...Handlers.create);
DocumentRepositoryRoutes.get("/:id", ...Handlers.read);
DocumentRepositoryRoutes.get("/", ...Handlers.list);
DocumentRepositoryRoutes.put("/:id", ...Handlers.update);
DocumentRepositoryRoutes.delete("/:id", [
    bodyParser.json(),
    async (req: express.Request, res: express.Response) => {
        try {
            if (!req.auth?.payload.sub) {
                res.status(401).send("Unauthorized");
                return;
            }

            const repositoryId = req.params.id;
            const documentRepository = await DocumentRepositoryDb.findOne({
                where: {
                    id: repositoryId,
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

            // validate relations
            if (documentRepository.spaceId) {
                if (!await AuthorizationHelper.hasSpaceRoles(["admin", "maintainer"], req.auth?.payload.sub, documentRepository.spaceId)) {
                    res.status(404).send({ message: "Not Found" });
                    return;
                }
            } else {
                if (!await AuthorizationHelper.hasOrgRoles(["admin", "maintainer"], req.auth?.payload.sub, documentRepository.orgId)) {
                    res.status(404).send({ message: "Not Found" });
                    return;
                }
            }

            documentRepository.status = "deleted";
            await documentRepository.save();
            res.status(204).send({ message: "Deleted" });
        } catch (e) {
            Logger.getInstance("document_repository-api").error(`Error deleting document repository: `, e);
            res.status(500).send({ message: "Unknown Error deleting document repository" });
        }
    }
]);
DocumentRepositoryRoutes.get("/:id/documents", [
    bodyParser.json(),
    async (req: express.Request, res: express.Response) => {
        try {
            if (!req.auth?.payload.sub) {
                res.status(401).send("Unauthorized");
                return;
            }
            
            const repositoryId = req.params.id;
            const documentRepository = await DocumentRepositoryDb.findOne({
                where: {
                    id: repositoryId,
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
                res.status(404).send({message: "Not Found"});
                return;
            }

            // validate relations
            if (documentRepository.spaceId) {
                if (!await AuthorizationHelper.hasSpaceRoles(["admin", "maintainer", "developer"], req.auth?.payload.sub, documentRepository.spaceId)) {
                    res.status(404).send({message: "Not Found"});
                    return;
                }
            } else {
                if (!await AuthorizationHelper.hasOrgRoles(["admin", "maintainer", "developer"], req.auth?.payload.sub, documentRepository.orgId)) {
                    res.status(404).send({message: "Not Found"});
                    return;
                }
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
            res.status(500).send({message: "Unknown Error getting documents"});
        }
    }
])