import express, { RequestHandler, Router } from "express";
import { Logger } from "../../logging/logger.js";
import { ChannelDb } from "./db.js";
import { ChannelMessageDb } from "./db.message.js";
import { jsonStringify } from "../../util/json.js";
import bodyParser from "body-parser";
import { AuthorizationHelper } from "../../identity/authorization_helper.js";

export function ChannelMessageHandlers(): Record<string, RequestHandler[]> {
	return {
		list: [
			bodyParser.json(),
			AuthorizationHelper.withSpaceRole(["admin", "maintainer"]),
			async (req: express.Request, res: express.Response, next: express.NextFunction) => {
				try {
                    // get the taskExecutionId from the query string
                    if (!req.query.taskExecutionId) {
						Logger.getInstance("channel-message-api").error(`${req.originalUrl} Missing taskExecutionId`);
                        res.status(400).send(jsonStringify({error: "Missing taskExecutionId"}));
                        return;
                    }
                    // make sure the tax execution matches and that the channel Id belongs to the org
					const found = await ChannelMessageDb.findAll({
						include: [
							{
								model: ChannelDb,
								where: {
									orgId: req.query.orgId as string,
								},
                                required: true,
							},
						],
                        where: {
                            taskExecutionId: req.query.taskExecutionId as string,
                        }
					})
					const models = [];
					for (const f of found) {
						models.push(f.toModel());
					}
					res.status(200).send(models);
				} catch (e) {
					Logger.getInstance("channel-message-api").error(`${req.originalUrl} ${(e as Error).message}`, e);
					next(e);
				}
			},
		],
	};
}

export const ChannelMessageRoutes: Router = Router({mergeParams: true});
ChannelMessageRoutes.get("/", ChannelMessageHandlers().list);

