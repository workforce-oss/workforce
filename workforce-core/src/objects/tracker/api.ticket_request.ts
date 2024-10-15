import express, { RequestHandler } from "express";
import { Logger } from "../../logging/logger.js";
import { TrackerDb } from "./db.js";
import { TicketRequestDb } from "./db.ticket_request.js";
import bodyParser from "body-parser";
import { AuthorizationHelper } from "../../identity/authorization_helper.js";

export function TicketRequestHandlers(): Record<string, RequestHandler[]> {
    return {
        list: [
            bodyParser.json(),
            AuthorizationHelper.withSpaceRole(["admin", "maintainer", "developer"]),
            async (req: express.Request, res: express.Response, next: express.NextFunction) => {
                try {
                    // get trackerId from query string
                    if (!req.query.trackerId) {
                        res.status(400).send("Missing trackerId");
                        return;
                    }
                    const found = await TicketRequestDb.findAll({
                        include: [
                            {
                                model: TrackerDb,
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
                    Logger.getInstance("ticket-request-api").error(`${req.originalUrl} ${(e as Error).message}`, e);
                    next(e);
                }
            },
        ],
    };
}

export const TicketRequestRoutes = express.Router({ mergeParams: true});
TicketRequestRoutes.get("/", TicketRequestHandlers().list);