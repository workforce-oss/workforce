import express, { RequestHandler, Router } from "express";
import { Logger } from "../../logging/logger.js";
import { ResourceDb } from "./db.js";
import { ResourceVersionDb } from "./db.resource_version.js";
import bodyParser from "body-parser";
import { AuthorizationHelper } from "../../identity/authorization_helper.js";

export function ResourceVersionHandlers(): Record<string, RequestHandler[]> {
	return {
		list: [
			bodyParser.json(),
			AuthorizationHelper.withSpaceRole(["admin", "maintainer"]),
			async (req: express.Request, res: express.Response, next: express.NextFunction) => {
				try {
					// get resourceId from query string
                    if (!req.query.resourceId) {
                        res.status(400).send("Missing resourceId");
                        return;
                    }
					const found = await ResourceVersionDb.findAll({
						include: [
                            {
                                model: ResourceDb,
                                where: {
                                    orgId: req.query.orgId as string,
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
		],
	};
}

export const ResourceVersionRoutes = Router({ mergeParams: true});
ResourceVersionRoutes.get("/", ResourceVersionHandlers().list);
