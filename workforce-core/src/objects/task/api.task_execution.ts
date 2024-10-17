import express, { RequestHandler, Router } from "express";
import { Logger } from "../../logging/logger.js";
import { TaskDb } from "./db.js";
import { TaskExecutionDb } from "./db.task_execution.js";
import bodyParser from "body-parser";
import { TaskExecutionUserDb } from "./db.task_execution_users.js";
import { AuthorizationHelper } from "../../identity/authorization_helper.js";
import { WebhookRouteManager } from "../../manager/webhook_route_manager.js";
import { BrokerManager } from "../../manager/broker_manager.js";

export function TaskExecutionHandlers(): Record<string, RequestHandler[]> {
    return {
        list: [
            bodyParser.json(),
            AuthorizationHelper.withSpaceRole(["admin", "maintainer", "developer"]),
            async (req: express.Request, res: express.Response, next: express.NextFunction) => {
                try {
                    if (req.query.taskId && req.query.userId) {
                        const found = await TaskExecutionDb.findAll({
                            where: {
                                taskId: req.query.taskId as string,
                            },
                            include: [
                                {
                                    model: TaskDb,
                                    where: {
                                        orgId: req.query.orgId as string,
                                    },
                                    required: true,
                                },
                                {
                                    model: TaskExecutionUserDb,
                                    where: {
                                        userId: req.query.userId as string,
                                    },
                                    required: true,
                                }
                            ],
                        });
                        const models = [];
                        for (const f of found) {
                            models.push(f.toModel());
                        }
                        res.send(models);
                        return;
                    } else if (req.query.taskId) {
                        const found = await TaskExecutionDb.findAll({
                            where: {
                                taskId: req.query.taskId as string,
                            },
                            include: [
                                {
                                    model: TaskDb,
                                    where: {
                                        orgId: req.query.orgId as string,
                                    },
                                    required: true,
                                },
                                {
                                    model: TaskExecutionUserDb,
                                }
                            ],
                        });
                        const models = [];
                        for (const f of found) {
                            models.push(f.toModel());
                        }
                        res.send(models);
                        return;
                    } else if (req.query.userId) {
                        const found = await TaskExecutionDb.findAll({
                            include: [
                                {
                                    model: TaskDb,
                                    where: {
                                        orgId: req.query.orgId as string,
                                    },
                                    required: true,
                                },
                                {
                                    model: TaskExecutionUserDb,
                                    where: {
                                        userId: req.query.userId as string,
                                    },
                                    required: true,
                                }
                            ],
                        });
                        const models = [];
                        for (const f of found) {
                            models.push(f.toModel());
                        }
                        res.send(models);
                        return;
                    } else {
                        const found = await TaskExecutionDb.findAll({
                            include: [
                                {
                                    model: TaskDb,
                                    where: {
                                        orgId: req.query.orgId as string,
                                    },
                                    required: true,
                                },
                                {
                                    model: TaskExecutionUserDb,
                                }
                            ],
                            // where: {
                            //     taskId: req.query.taskId as string,
                            // },
                        });
                        const models = [];
                        for (const f of found) {
                            models.push(f.toModel());
                        }
                        res.send(models);
                    }
                } catch (e) {
                    Logger.getInstance("task-execution-api").error(`${req.originalUrl} ${(e as Error).message}`, e);
                    next(e);
                }
            },
        ],
        delete: [
            bodyParser.json(),
            async (req: express.Request, res: express.Response, next: express.NextFunction) => {
                try {
                    if (!req.auth?.payload.sub) {
                        res.status(401).send("Unauthorized");
                        return;
                    }

                    const found = await TaskExecutionDb.findOne({
                        where: {
                            id: req.params.id,
                        }
                    });
                    if (!found) {
                        res.status(404).send({
                            id: req.params.id,
                            deleted: false,
                            error: "Not found",
                        });
                        return;
                    }

                    // validate relations
                    if (!await AuthorizationHelper.hasOrgRoles(["admin", "maintainer"], req.auth?.payload.sub, found.orgId)) {
                        res.status(404).send("Not Found");
                        return;
                    }

                    await BrokerManager.workerBroker.removeTaskExecution(found.id);

                    await found.destroy();
                    const routeManager = await WebhookRouteManager.getInstance();
                    routeManager.removeRoutesByTaskExecutionId(found.orgId, found.id);
                    res.send({
                        id: req.params.id,
                        deleted: true,
                    });
                } catch (e) {
                    Logger.getInstance("task-execution-api").error(`${req.originalUrl} ${(e as Error).message}`, e);
                    next(e);
                }
            },
        ],
    };
}

export const TaskExecutionRoutes: Router = Router({ mergeParams: true });
TaskExecutionRoutes.get("/", TaskExecutionHandlers().list);
TaskExecutionRoutes.delete("/:id", TaskExecutionHandlers().delete);