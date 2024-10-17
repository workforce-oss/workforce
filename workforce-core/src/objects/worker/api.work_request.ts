import express, { RequestHandler, Router } from "express";
import { Logger } from "../../logging/logger.js";
import { WorkerDb } from "./db.js";
import { WorkRequestDb } from "./db.work_request.js";
import bodyParser from "body-parser";
import { TaskExecutionDb } from "../task/db.task_execution.js";
import { TaskDb } from "../task/db.js";
import { FlowDb } from "../flow/db.js";
import { AuthorizationHelper } from "../../identity/authorization_helper.js";
import { WhereOptions } from "sequelize";

export function WorkRequestHandlers(): Record<string, RequestHandler[]> {
	return {
		list: [
			bodyParser.json(),
			AuthorizationHelper.withSpaceRole(["admin", "maintainer"]),
			async (req: express.Request, res: express.Response) => {
				try {
					if (!req.query.taskExecutionId && !req.query.workerId && !req.query.orgId) {
						res.status(400).send({message: "taskExecutionId, workerId, or orgId required"});
						return;
					}
					const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
					const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
					const where: WhereOptions | undefined = req.query.taskExecutionId
						? { taskExecutionId: req.query.taskExecutionId }
						: req.query.workerId
							? { workerId: req.query.workerId }
							: undefined;
					const found = await WorkRequestDb.findAll({
						include: [
							{
								model: WorkerDb,
								where: {
									orgId: req.query.orgId as string,
								},
								required: true,
							},
							{
								model: TaskExecutionDb,
								include: [
									{
										model: TaskDb,
										where: {
											orgId: req.query.orgId as string,
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
						where: where,
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
					res.status(500).send({message: "Unknown Error listing work requests"});
				}
			},
		],
		delete: [
			bodyParser.json(),
			async (req: express.Request, res: express.Response) => {
				try {
					if (!req.auth?.payload.sub) {
						res.status(401).send("Unauthorized");
						return;
					}

					const found = await WorkRequestDb.findOne({
						where: {
							id: req.params.id,
						},
						include: [
							{
								model: WorkerDb,
								where: {
									orgId: req.query.orgId as string,
								},
								required: true,
							},
						],
					});

					if (!found) {
						res.status(404).send({message: "Not Found"});
						return;
					}

					if (!await AuthorizationHelper.hasOrgRoles(["admin", "maintainer"], req.auth?.payload.sub, found.worker.orgId)) {
						res.status(404).send({message: "Not Found"});
						return;
					}
					await found.destroy();
					res.send({message: "Deleted"});
				} catch (e) {
					Logger.getInstance(`work-request-api`).error(`${req.originalUrl} ${(e as Error).message}`, e);
					res.status(500).send({message: "Unknown Error deleting work request"});
				}
			},
		],
	};
}

export const WorkRequestRoutes: Router = express.Router({ mergeParams: true });
WorkRequestRoutes.get("/", WorkRequestHandlers().list);
WorkRequestRoutes.delete("/:id", WorkRequestHandlers().delete);
