import { Router, Request, Response } from "express";
import { ModelRouter } from "../base/api.js";
import bodyParser from "body-parser";
import { AuthorizationHelper } from "../../identity/authorization_helper.js";
import { WorkRequestDb } from "./db.work_request.js";
import { WorkerDb } from "./db.js";
import { Logger } from "../../logging/logger.js";
import { TaskExecutionDb } from "../task/db.task_execution.js";
import { TaskDb } from "../task/db.js";
import { FlowDb } from "../flow/db.js";

export const WorkerRouter: Router = ModelRouter('worker', {
    additionalRoutes: [
        (router: Router) => {
            router.get("/:id/work-requests", [
                bodyParser.json(),
                AuthorizationHelper.withSpaceRole(["admin", "maintainer"]),
                async (req: Request, res: Response) => {
                    try {
                        const orgId = req.params.orgId;

                        const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
                        const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
                       
                        const found = await WorkRequestDb.findAll({
                            include: [
                                {
                                    model: WorkerDb,
                                    where: {
                                        orgId
                                    },
                                    required: true,
                                    attributes: ["id", "name"],
                                },
                                {
                                    model: TaskExecutionDb,
                                    include: [
                                        {
                                            model: TaskDb,
                                            where: {
                                                orgId
                                            },
                                            attributes: ["id", "name", "description"],
                                            include: [{
                                                model: FlowDb,
                                                attributes: ["id", "name", "description"],
    
                                            }]
                                        },
                                    ],
                                    attributes: ["id", "status", "timestamp", "inputs"],
                                }
                            ],
                            where: {
                                workerId: req.params.id,
                            },
                            limit: limit,
                            offset: offset,
                        });

                        const models = [];
                        for (const f of found) {
                            models.push(f.toModel());
                        }
                        res.send(models);
                    } catch (e) {
                        Logger.getInstance("work-request-api").error(`${req.originalUrl} ${(e as Error).message}`, e);
                        res.status(500).send({ message: "Unknown Error listing work requests" });
                    }
                },
            ]);
        }
    ]
});