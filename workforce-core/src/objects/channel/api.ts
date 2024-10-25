import { Router, Request, Response, NextFunction } from "express";
import { ModelRouter } from "../base/api.js";
import bodyParser from "body-parser";
import { AuthorizationHelper } from "../../identity/authorization_helper.js";
import { Logger } from "../../logging/logger.js";
import { ChannelMessageDb } from "./db.message.js";
import { ChannelDb } from "./db.js";
import { ChannelSessionDb } from "./db.session.js";

export const ChannelRouter: Router = ModelRouter('channel', {
    additionalRoutes: [
        (router: Router) => {
            router.get("/:id/sessions", [
                bodyParser.json(),
                AuthorizationHelper.withSpaceRole(["admin", "maintainer"]),
                async (req: Request, res: Response, next: NextFunction) => {
                    try {
                        const orgId = req.params.orgId;
                        const channelId = req.params.id;

                        const found = await ChannelSessionDb.findAll({
                            include: [
                                {
                                    model: ChannelDb,
                                    where: {
                                        orgId
                                    },
                                    required: true,
                                },
                            ],
                            where: {
                                channelId,
                            }
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
            ]);
        },
        (router: Router) => {
            router.get("/:id/messages", [
                bodyParser.json(),
                AuthorizationHelper.withSpaceRole(["admin", "maintainer"]),
                async (req: Request, res: Response, next: NextFunction) => {
                    try {
                        const orgId = req.params.orgId;
                        const channelId = req.params.id;

                        const found = await ChannelMessageDb.findAll({
                            include: [
                                {
                                    model: ChannelDb,
                                    where: {
                                        id: channelId,
                                        orgId,
                                    },
                                    required: true,
                                },
                            ],
                            where: {
                                channelId,
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
            ]);
        }
    ]
});