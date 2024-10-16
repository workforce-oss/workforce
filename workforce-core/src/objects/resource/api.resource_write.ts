import express, { RequestHandler, Router } from "express";
import { Logger } from "../../logging/logger.js";
import { ResourceWriteDb } from "./db.resource_write.js";
import { ResourceDb } from "./db.js";
import bodyParser from "body-parser";
import { AuthorizationHelper } from "../../identity/authorization_helper.js";

export function ResourceWriteHandlers(): Record<string, RequestHandler[]> {
	return {
		list: [
            bodyParser.json(),
            AuthorizationHelper.withSpaceRole(["admin", "maintainer", "developer"]),
			async (req: express.Request, res: express.Response, next: express.NextFunction) => {
				try {
                    // get resourceId from query string
                    if (!req.query.resourceId) {
                        res.status(400).send("Missing resourceId");
                        return;
                    }
                    const found = await ResourceWriteDb.findAll({
                        where: {
                            resourceId: req.query.resourceId as string,
                        },
                        include: {
                            model: ResourceDb,
                            where: {
                                orgId: req.query.orgId as string,
                            },
                            required: true,
                        }
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
        ],
    }
}                    

export const ResourceWriteRoutes: Router = express.Router({ mergeParams: true});
ResourceWriteRoutes.get("/", ResourceWriteHandlers().list);