import {Router, Request, Response, NextFunction} from 'express';
import { ModelRouter} from '../base/api.js';
import bodyParser from 'body-parser';
import { AuthorizationHelper } from '../../identity/authorization_helper.js';
import { TicketRequestDb } from './db.ticket_request.js';
import { TrackerDb } from './db.js';
import { Logger } from '../../logging/logger.js';

export const TrackerRouter: Router = ModelRouter('tracker', {
    additionalRoutes: [
        (router: Router) => {
            router.get("/:id/ticket-requests", [
                bodyParser.json(),
                AuthorizationHelper.withSpaceRole(["admin", "maintainer", "developer"]),
                async (req: Request, res: Response, next: NextFunction) => {
                    try {
                        const orgId = req.params.orgId;
                        const trackerId = req.params.id;

                        const found = await TicketRequestDb.findAll({
                            include: [
                                {
                                    model: TrackerDb,
                                    where: {
                                        orgId
                                    },
                                    required: true,
                                }
                            ],
                            where: {
                                trackerId,
                            }
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
            ]);
        }
    ]
});
