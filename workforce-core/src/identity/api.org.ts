import express, { RequestHandler, Router } from "express";
import { OrgUserRelationDb } from "./db.org_user.js";
import bodyParser from "body-parser";
import { OrgDb } from "./db.org.js";
import { AuthorizationHelper } from "./authorization_helper.js";

export function OrgHandlers(): Record<string, RequestHandler[]> {
    return {
        create: [
            bodyParser.json(),
            async (req: express.Request, res: express.Response) => {
                if (!req.auth?.payload.sub) {
                    res.status(401).send("Unauthorized");
                    return;
                }

                const body = req.body as { id?: string, name?: string, description?: string } || {};
                if (!body.name) {
                    res.status(400).send("Missing required field: name");
                    return;
                }

                const org = await OrgDb.create({
                    id: body.id,
                    name: body.name,
                    status: "active",
                    description: body.description,
                }).catch(() => {
                    res.status(400).send("Bad Request");
                    return;
                });

                if (!org) {
                    res.status(400).send("Bad Request");
                    return;
                }

                const orgUserRelation = await OrgUserRelationDb.create({
                    orgId: org.id,
                    userId: req.auth.payload.sub,
                    role: "admin",
                }).catch(() => {
                    res.status(400).send("Bad Request");
                    return;
                });

                if (!orgUserRelation) {
                    res.status(400).send("Bad Request");
                    return;
                }

                res.status(201).send(org);
            }
        ],
        delete: [
            AuthorizationHelper.withOrgRole(["admin"]),
            async (req, res) => {
                const org = await OrgDb.findByPk(req.params.id);
                if (!org) {
                    res.status(404).send("Not Found");
                    return;
                }

                await org.destroy();
                res.status(204).send();
            }
        ],
        list: [
            async (req, res) => {
                if (!req.auth) {
                    res.status(401).send("Unauthorized");
                    return;
                }

                const orgRelations = await OrgUserRelationDb.findAll({
                    where: {
                        userId: req.auth.payload.sub
                    }
                }).catch(() => {
                    res.status(500).send("Internal Server Error");
                    return [];
                });

                if (!orgRelations) {
                    res.status(404).send("Not Found");
                    return;
                }

                res.status(200).send(orgRelations.map((orgRelation) => orgRelation.toModel()));
            }
        ],
        read: [
            async (req, res) => {
                if (!req.auth) {
                    res.status(401).send("Unauthorized");
                    return;
                }
                const org = await OrgDb.findByPk(req.params.id).catch(() => {
                    res.status(400).send("Bad Request");
                    return;
                });
                if (!org) {
                    res.status(404).send("Not Found");
                    return;
                }

                const orgRelation = await OrgUserRelationDb.findOne({
                    where: {
                        userId: req.auth.payload.sub,
                        orgId: org.id,
                        role: "admin"
                    }
                }).catch(() => {
                    res.status(400).send("Bad Request");
                    return;
                });

                if (!orgRelation) {
                    res.status(404).send("Not Found");
                    return;
                }

                res.status(200).send(org.toModel());
            }
        ],
    }
}

export const OrgRoutes: Router = Router({ mergeParams: true });
const handlers = OrgHandlers();
OrgRoutes.post("/", handlers.create);
OrgRoutes.get("/:id", handlers.read);
OrgRoutes.get("/", handlers.list);
OrgRoutes.delete("/:id", handlers.delete);
