import express, { RequestHandler } from "express";
import { Logger } from "../../logging/logger.js";
import { ToolDb } from "./db.js";
import { ToolRequestDb } from "./db.tool_request.js";
import bodyParser from "body-parser";
import { AuthorizationHelper } from "../../identity/authorization_helper.js";

export function ToolRequestHandlers(): Record<string, RequestHandler[]> {
	return {
		list: [
			bodyParser.json(),
			AuthorizationHelper.withSpaceRole(["admin", "maintainer", "developer"]),
			async (req: express.Request, res: express.Response, next: express.NextFunction) => {
				try {
					// get taskExecutionId from query string
					if (!req.query.taskExecutionId) {
						res.status(400).send("Missing taskExecutionId query parameter");
						return;
					}
					const found = await ToolRequestDb.findAll({
						include: [
							{
								model: ToolDb,
								where: {
									orgId: req.query.orgId as string,
								},
								required: true,
							},
						],
                        where: {
                            taskExecutionId: req.query.taskExecutionId as string,
                        },
					});
					const models = [];
					for (const f of found) {
						models.push(f.toModel());
					}
					res.send(models);
				} catch (e) {
					Logger.getInstance("tool-request-api").error(`${req.originalUrl} ${(e as Error).message}`, e);
					next(e);
				}
			},
		],
	};
}

export const ToolRequestRoutes = express.Router({ mergeParams: true });
ToolRequestRoutes.get("/", ToolRequestHandlers().list);
