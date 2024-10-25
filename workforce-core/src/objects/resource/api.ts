import { Router, Request, Response, NextFunction } from "express";
import { ModelRouter } from "../base/api.js";
import bodyParser from "body-parser";
import { AuthorizationHelper } from "../../identity/authorization_helper.js";
import { ResourceVersionDb } from "./db.resource_version.js";
import { ResourceDb } from "./db.js";
import { Logger } from "../../logging/logger.js";
import { ResourceWriteDb } from "./db.resource_write.js";

export const ResourceRouter: Router = ModelRouter('resource', {
    additionalRoutes: [
        (router: Router) => {
            router.get("/:id/resource-versions", [
                bodyParser.json(),
                AuthorizationHelper.withSpaceRole(["admin", "maintainer"]),
                async (req: Request, res: Response, next: NextFunction) => {
                    try {
                        const orgId = req.params.orgId;
                        const resourceId = req.params.resourceId;
                        
                        const found = await ResourceVersionDb.findAll({
                            where: {
                                resourceId,
                            },
                            include: [
                                {
                                    model: ResourceDb,
                                    where: {
                                        orgId,
                                    },
                                    required: true,
                                }
                            ]
                        });
                        const models = [];
                        for (const f of found) {
                            models.push(f.toModel());
                        }
                        res.send(models);
                    } catch (e) {
                        Logger.getInstance("resource-version-api").error(`${req.originalUrl} ${(e as Error).message}`, e);
                        next(e);
                    }
                },
            ]);
        },
        (router: Router) => {
            router.get("/:id/resource-writes", [
                bodyParser.json(),
                AuthorizationHelper.withSpaceRole(["admin", "maintainer", "developer"]),
                async (req: Request, res: Response, next: NextFunction) => {
                    try {
                        const orgId = req.params.orgId;
                        const resourceId = req.params.resourceId;
                        
                        const found = await ResourceWriteDb.findAll({
                            where: {
                                resourceId,
                            },
                            include: [
                                {
                                    model: ResourceDb,
                                    where: {
                                        orgId,
                                    },
                                    required: true,
                                }
                            ]
                        });
                        const models = [];
                        for (const f of found) {
                            models.push(f.toModel());
                        }
                        res.send(models);
                    } catch (e) {
                        Logger.getInstance("resource-write-api").error(`${req.originalUrl} ${(e as Error).message}`, e);
                        next(e);
                    }
                }
            ]);
        }
    ]
});