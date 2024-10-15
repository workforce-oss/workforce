import express, { RequestHandler, Router } from "express";
import { ChannelSessionDb } from "./db.session.js";
import { Logger } from "../../logging/logger.js";
import { ChannelDb } from "./db.js";
import bodyParser from "body-parser";
import { AuthorizationHelper } from "../../identity/authorization_helper.js";

export function ChannelSessionHandlers(): Record<string, RequestHandler[]> {
	return {
		list: [
			bodyParser.json(),
			AuthorizationHelper.withSpaceRole(["admin", "maintainer"]),
			async (req: express.Request, res: express.Response, next: express.NextFunction) => {
				try {
					// Channelsession has channelId which is a foreign key to ChannelDb
					// We want to get all the channel sessions where the channel.orgId matches the orgId in the JWT
					const found = await ChannelSessionDb.findAll({
						include: [
							{
								model: ChannelDb,
								where: {
									orgId: req.query.orgId as string,
								},
                                required: true,
							},
						],
					});
					const models = [];
					for (const f of found) {
						models.push(f.toModel());
					}
					res.send(models);
				} catch (e) {
					Logger.getInstance("channel-session-api").error(`${req.originalUrl} ${(e as Error).message}`, e);
					next(e);
				}
			},
		],
	};
}

export const ChannelSessionRoutes = Router({ mergeParams: true });
ChannelSessionRoutes.get("/", ChannelSessionHandlers().list);
