import { Router, Request, Response, NextFunction } from "express";
import { OrgUserRelationDb } from "./db.org_user.js";
import bodyParser from "body-parser";
import { OrgDb } from "./db.org.js";
import { AuthorizationHelper } from "./authorization_helper.js";
import { CrudRouter } from "../objects/base/api.js";

export const OrgRouter: Router = CrudRouter({
    create: [
        bodyParser.json(),
        async (req: Request, res: Response) => {
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
        AuthorizationHelper.withOrgRole(["admin"]),
        async (req, res) => {
            const orgId = req.params.id;

            const org = await OrgDb.findByPk(orgId).catch(() => {
                res.status(400).send("Bad Request");
                return;
            });

            if (!org) {
                res.status(404).send("Not Found");
                return;
            }

            res.status(200).send(org.toModel());
        }
    ],
    update: []
}, [
    (router: Router) => {
        router.post("/:orgId/org-users", [
            bodyParser.json(),
            AuthorizationHelper.withOrgRole(["admin"]),
            async (req: Request, res: Response, next: NextFunction) => {
                const orgId = req.params.orgId;
                const body = req.body as { userId?: string, role?: string } || {};
                try {
                    if (!body.userId || !body.role) {
                        res.status(400).send("Missing required fields");
                        return;
                    }

                    const user = await OrgUserRelationDb.findOrCreate({
                        where: {
                            orgId,
                            userId: body.userId,
                            role: body.role,
                        },
                        defaults: {
                            orgId,
                            userId: body.userId,
                            role: body.role,
                        }
                    });
                    res.status(201).send(user);
                } catch (error) {
                    next(error);
                }
            }
        ]);
    },
    (router: Router) => {
        router.get("/:orgId/org-users", [
            AuthorizationHelper.withOrgRole(["admin"]),
            async (req: Request, res: Response, next: NextFunction) => {
                try {
                    const orgRelation = await OrgUserRelationDb.findAll({
                        where: {
                            orgId: req.params.orgId
                        }
                    }).catch(() => {
                        res.status(500).send("Internal Server Error");
                        return null;
                    });
                    if (!orgRelation) {
                        res.status(404).send("Not Found");
                        return;
                    }
                    res.status(200).send(orgRelation.map((orgRelation) => orgRelation.toModel()));
                } catch (error) {
                    next(error);
                }
            }
        ]);
    },
    (router: Router) => {
        router.delete("/:orgId/org-users/:id", [
            AuthorizationHelper.withOrgRole(["admin"]),
            async (req: Request, res: Response, next: NextFunction) => {
                try {
                    const orgRelation = await OrgUserRelationDb.findOne({
                        where: {
                            id: req.params.id,
                            orgId: req.params.orgId,
                        }
                    }).catch(() => {
                        res.status(500).send("Internal Server Error");
                        return null;
                    });
                    if (!orgRelation) {
                        res.status(404).send("Not Found");
                        return;
                    }
                    await orgRelation.destroy();
                    res.status(204).send();
                } catch (error) {
                    next(error);
                }
            }
        ]);
    }
]);