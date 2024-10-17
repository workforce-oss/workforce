import bodyParser from "body-parser";
import express, { RequestHandler, Router } from "express";
import { Logger } from "../../logging/logger.js";
import { TaskDb } from "../task/db.js";
import { TaskExecutionDb } from "../task/db.task_execution.js";
import { WorkerChatMessageDb } from "./db.worker_chat_message.js";
import { WorkerChatSessionDb } from "./db.worker_chat_session.js";
import { TaskExecutionUserDb } from "../task/db.task_execution_users.js";
import { AuthorizationHelper } from "../../identity/authorization_helper.js";

export function WorkerChatSessionHandlers(): Record<string, RequestHandler[]> {
    return {
        list: [
            bodyParser.json(),
            AuthorizationHelper.withSpaceRole(["admin", "maintainer", "developer"]),
            async (req: express.Request, res: express.Response) => {
                try {
                    if (!req.query.taskExecutionId) {
                        res.status(400).send({message: "taskExecutionId required"});
                        return;
                    }
                    const taskExecution = await TaskExecutionDb.findOne({
                        where: {
                            id: req.query.taskExecutionId as string,
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
                                model: TaskExecutionUserDb
                            }
                        ],
                    });
                    if (!taskExecution) {
                        res.status(404).send({message: `Task Execution ${req.query.taskExecutionId as string} not found`});
                        return;
                    }
                    const found = await WorkerChatSessionDb.findOne({
                        where: {
                            taskExecutionId: req.query.taskExecutionId as string,
                        },
                        include: [
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
                    res.status(500).send({message: "Unknown Error listing worker chat sessions"});
                }
            },
        ],
    }
}

export const WorkerChatSessionRoutes: Router = express.Router({mergeParams: true});
WorkerChatSessionRoutes.get("/", WorkerChatSessionHandlers().list);
