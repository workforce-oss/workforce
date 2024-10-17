import express, { RequestHandler, Router } from "express";
import bodyParser from "body-parser";
import { OrgUserRelationDb } from "./db.org_user.js";
import { AuthorizationHelper } from "./authorization_helper.js";

export function OrgUserHandlers(): Record<string, RequestHandler[]> {
    return {
        create: [
            bodyParser.json(),
            AuthorizationHelper.withOrgRole(["admin"]),
            async (req: express.Request, res: express.Response, next: express.NextFunction) => {
                const body = req.body as { orgId?: string, userId?: string, role?: string } || {};
                try {
                    if (!body.orgId || !body.userId || !body.role) {
                        res.status(400).send("Missing required fields");
                        return;
                    }

                    const user = await OrgUserRelationDb.findOrCreate({
                        where: {
                            orgId: body.orgId,
                            userId: body.userId,
                            role: body.role,
                        },
                        defaults: {
                            orgId: body.orgId,
                            userId: body.userId,
                            role: body.role,
                        }
                    });
                    res.status(201).send(user);
                } catch (error) {
                    next(error);
                }
            }
        ],
        list: [
            async (req, res) => {
                if (!req.auth?.payload.sub) {
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

                res.status(200).send(orgRelations.map((orgRelation) => orgRelation.toModel()));
            }
        ],
        read: [
            AuthorizationHelper.withOrgRole(["admin"]),
            async (req: express.Request, res: express.Response, next: express.NextFunction) => {
                try {
                    const orgRelation = await OrgUserRelationDb.findByPk(req.params.id).catch(() => {
                        res.status(500).send("Internal Server Error");
                        return null;
                    });
                    if (!orgRelation) {
                        res.status(404).send("Not Found");
                        return;
                    }
                    res.status(200).send(orgRelation.toModel());
                } catch (error) {
                    next(error);
                }
            }
        ],
    }
}

export const OrgUserRoutes: Router = Router({ mergeParams: true });
const handlers = OrgUserHandlers();
OrgUserRoutes.post("/", handlers.create);
OrgUserRoutes.get("/", handlers.list);
OrgUserRoutes.get("/:id", handlers.read);
