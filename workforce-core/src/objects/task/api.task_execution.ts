import { Router, Request, Response, NextFunction } from "express";
import { Logger } from "../../logging/logger.js";
import { TaskDb } from "./db.js";
import { TaskExecutionDb } from "./db.task_execution.js";
import bodyParser from "body-parser";
import { TaskExecutionUserDb } from "./db.task_execution_users.js";
import { AuthorizationHelper } from "../../identity/authorization_helper.js";
import { WebhookRouteManager } from "../../manager/webhook_route_manager.js";
import { BrokerManager } from "../../manager/broker_manager.js";
import { ChannelMessageDb } from "../channel/db.message.js";
import { ChannelDb } from "../channel/db.js";
import { ToolRequestDb } from "../tool/db.tool_request.js";
import { ToolDb } from "../tool/db.js";
import { WorkRequestDb } from "../worker/db.work_request.js";
import { FlowDb } from "../flow/db.js";
import { WorkerDb } from "../worker/db.js";
import { WorkerChatSessionDb } from "../worker/db.worker_chat_session.js";
import { WorkerChatMessageDb } from "../worker/db.worker_chat_message.js";

export const TaskExecutionRouter: Router = (() => {
    const router = Router({ mergeParams: true });
    router.get("/", [
        bodyParser.json(),
        AuthorizationHelper.withSpaceRole(["admin", "maintainer", "developer"]),
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const orgId = req.params.orgId;
                if (req.query.taskId && req.query.userId) {
                    const found = await TaskExecutionDb.findAll({
                        where: {
                            taskId: req.query.taskId as string,
                        },
                        include: [
                            {
                                model: TaskDb,
                                where: {
                                    orgId
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
                                    orgId
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
                                    orgId
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
                                    orgId
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
                }
            } catch (e) {
                Logger.getInstance("task-execution-api").error(`${req.originalUrl} ${(e as Error).message}`, e);
                next(e);
            }
        },
    ]);


    router.delete("/:id", [
        bodyParser.json(),
        AuthorizationHelper.withOrgRole(["admin", "maintainer"]),
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const orgId = req.params.orgId;

                const found = await TaskExecutionDb.findOne({
                    where: {
                        id: req.params.id,
                        orgId
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

                try {
                    await BrokerManager.workerBroker.removeTaskExecution(found.id).catch((e: Error) => {
                        Logger.getInstance("task-execution-api").warn("task execution not removed from worker", e)
                    })
                } catch (e) {
                    Logger.getInstance("task-execution-api").warn("error removing task execution", e)
                }

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
    ]);

    router.get("/:id/channel-message", [
        bodyParser.json(),
        AuthorizationHelper.withSpaceRole(["admin", "maintainer"]),
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const orgId = req.params.orgId;
                const taskExecutionId = req.params.id;

                const found = await ChannelMessageDb.findAll({
                    include: [
                        {
                            model: ChannelDb,
                            where: {
                                orgId,
                            },
                            required: true,
                        },
                    ],
                    where: {
                        taskExecutionId
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

    router.get("/:id/tool-requests", [
        bodyParser.json(),
        AuthorizationHelper.withSpaceRole(["admin", "maintainer", "developer"]),
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const orgId = req.params.orgId;
                const taskExecutionId = req.params.id;

                const found = await ToolRequestDb.findAll({
                    include: [
                        {
                            model: ToolDb,
                            where: {
                                orgId,
                            },
                            required: true,
                        },
                    ],
                    where: {
                        taskExecutionId
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
    ]);
    router.get("/:id/work-requests", [
        bodyParser.json(),
        AuthorizationHelper.withSpaceRole(["admin", "maintainer"]),
        async (req: Request, res: Response) => {
            try {
                const orgId = req.params.orgId;
                const taskExecutionId = req.params.id;

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
                        taskExecutionId,
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
    router.get("/:id/worker-chat-session", [
        bodyParser.json(),
        AuthorizationHelper.withSpaceRole(["admin", "maintainer", "developer"]),
        async (req: Request, res: Response) => {
            try {
                const orgId = req.params.orgId
                const taskExecutionId = req.params.id;

                const found = await WorkerChatSessionDb.findOne({
                    where: {
                        taskExecutionId
                    },
                    include: [
                        {
                            model: TaskExecutionDb,
                            where: {
                                id: taskExecutionId,
                            },
                            include: [{
                                model: TaskDb,
                                where: {
                                    orgId,
                                },
                                required: true,
                            }],
                            required: true,
                        },
                        {
                            model: WorkerChatMessageDb,
                        },
                    ],

                });
                if (!found) {
                    res.status(404).send([]);
                    return;
                }
                res.send([found.toModel()]);
            } catch (e) {
                Logger.getInstance("worker-chat-session-api").error(`${req.originalUrl} ${(e as Error).message}`, e);
                res.status(500).send({ message: "Unknown Error listing worker chat sessions" });
            }
        },
    ]);

    return router;
})();