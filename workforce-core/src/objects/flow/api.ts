import bodyParser from "body-parser";
import express, { RequestHandler, Router } from "express";
import { WhereOptions } from "sequelize";
import { Logger } from "../../logging/logger.js";
import { reviver } from "../../util/json.js";
import { CrudHandlers } from "../base/api.js";
import { BaseModelAttributes, FlowDb } from "./db.js";
import { FlowConfig } from "./model.js";
import { validateFlowSchema } from "./validation.js";
import { DocumentationDb } from "../documentation/db.js";
import { DocumentRelationDb } from "../documentation/db.document_relation.js";
import { AuthorizationHelper } from "../../identity/authorization_helper.js";

export function FlowHandlers(): CrudHandlers {
    return {
        create: [bodyParser.json({
            reviver: reviver,
        }), 
        AuthorizationHelper.withSpaceRole(["admin", "maintainer", "developer"]),
        validateFlow, async (req: express.Request, res: express.Response) => {
            try {
                const model = req.body as FlowConfig;

                if (!model.orgId) {
                    res.status(400).send([{ message: "Bad Request" }]);
                    return;
                }

                // Handle updates to existing models
                if (model.id) {
                    const found = await FlowDb.findOne({
                        where: {
                            id: model.id,
                            orgId: model.orgId,
                        },
                        include: [{
                            all: true,
                        }, {
                            model: DocumentationDb,
                            include: [DocumentRelationDb]
                        }]
                    });
                    if (found) {
                        Logger.getInstance("flow-api").info(`post() Updating existing model ${model.id}`);
                        await found.loadModel(model);
                        await found.save();
                        const updated = await FlowDb.findByPk(model.id, { include: { all: true } });
                        res.status(201).send(await updated!.toModel({ replaceIdsWithNames: true }));
                        return;
                    }
                }

                const where: WhereOptions<BaseModelAttributes> = {
                    orgId: model.orgId,
                    name: model.name,
                }
                const db = await FlowDb.findOne({
                    where: where,
                    include: {
                        all: true,
                    }
                }) ?? new FlowDb(model);

                await db.loadModel(model);
                await db.save();
                const updated = await FlowDb.findByPk(db.id, { include: { all: true } });
                const updatedModel = await updated!.toModel({ replaceIdsWithNames: true });
                res.status(201).send(updatedModel);
            } catch (e) {
                Logger.getInstance("flow-api").error(`${req.originalUrl} ${(e as Error).message}`, e)
                res.status(500).send({ message: "Unknown Error creating flow" });
            }
        }],
        read: [bodyParser.json({
            reviver: reviver,
        }),
        // AuthorizationHelper.withSpaceRole(["admin", "maintainer", "developer"]),
        async (req: express.Request, res: express.Response) => {
            try {
                if (!req.auth?.payload.sub) {
                    res.status(401).send("Unauthorized");
                    return;
                }

                const found = await FlowDb.findOne({
                    where: {
                        id: req.params.id,
                    },
                    include: [{ all: true }] 
                });
                if (!found) {
                    res.status(404).send({ message: "Not Found" });
                    return;
                }

                // validate relations
                if (found.spaceId) {
                    if (!await AuthorizationHelper.hasSpaceRoles(["admin", "maintainer", "developer"], req.auth?.payload.sub, found.spaceId)) {
                        res.status(404).send({ message: "Not Found" });
                        return;
                    }
                } else {
                    if (!await AuthorizationHelper.hasOrgRoles(["admin", "maintainer", "developer"], req.auth?.payload.sub, found.orgId)) {
                        res.status(404).send({ message: "Not Found" });
                        return;
                    }
                }


                const model = await found.toModel({ replaceIdsWithNames: true });
                res.send(model);
            } catch (e) {
                Logger.getInstance("flow-api").error(`${req.originalUrl} ${(e as Error).message}`, e)
                res.status(500).send({ message: "Unknown Error reading flow" });
            }
        }],
        list: [bodyParser.json({
            reviver: reviver,
        }),
        AuthorizationHelper.withSpaceRole(["admin", "maintainer", "developer"]),
        async (req: express.Request, res: express.Response) => {
            try {
                const found = await FlowDb.findAll({
                    where: req.query.name ? { name: req.query.name as string, orgId: req.query.orgId as string } : { orgId: req.query.orgId as string }
                })
                // page through models sequentially
                const models: FlowConfig[] = [];
                for (const f of found) {
                    const model = await f.toModel();
                    models.push(model);
                }
                res.send(models);
            } catch (e) {
                Logger.getInstance("flow-api").error(`${req.originalUrl} ${(e as Error).message}`, e)
                res.status(500).send({ message: "Unknown Error listing flows" });
            }
        }],
        update: [bodyParser.json({
            reviver: reviver,
        }),
        AuthorizationHelper.withSpaceRole(["admin", "maintainer", "developer"]),
        validateFlow,
        async (req: express.Request, res: express.Response) => {
            try {
                const model = req.body as FlowConfig;
                if (!model.orgId) {
                    res.status(400).send([{ message: "Bad Request" }]);
                    return;
                }
                const db = await FlowDb.findOne({
                    where: {
                        id: req.params.id,
                        orgId: model.orgId,
                    },
                    include: [{
                        all: true,
                    }, {
                        model: DocumentationDb,
                        include: [DocumentRelationDb]
                    }]
                }) ?? new FlowDb(model);
                
                await db.loadModel(model);
                await db.save();
                const updated = await FlowDb.findByPk(db.id, { include: { all: true } });
                res.send(await updated!.toModel({ replaceIdsWithNames: true }));
            } catch (e) {
                Logger.getInstance("flow-api").error(`${req.originalUrl} ${(e as Error).message}`, e)
                res.status(500).send({ message: "Unknown Error updating flow" });
            }
        }],
        delete: [bodyParser.json({
            reviver: reviver,
        }),
        async (req: express.Request, res: express.Response) => {
            try {
                if (!req.auth?.payload.sub) {
                    res.status(401).send("Unauthorized");
                    return;
                }
                const found = await FlowDb.findOne({
                    where: {
                        id: req.params.id,
                    },
                });
                if (!found) {
                    res.status(404).send({ message: "Not Found" });
                    return;
                }

                // validate relations
                if (found.spaceId) {
                    if (!await AuthorizationHelper.hasSpaceRoles(["admin", "maintainer", "developer"], req.auth?.payload.sub, found.spaceId)) {
                        res.status(404).send({ message: "Not Found" });
                        return;
                    }
                } else {
                    if (!await AuthorizationHelper.hasOrgRoles(["admin", "maintainer", "developer"], req.auth?.payload.sub, found.orgId)) {
                        res.status(404).send({ message: "Not Found" });
                        return;
                    }
                }

                await found.destroy();
                res.send({ message: "Deleted" });
            } catch (e) {
                Logger.getInstance("flow-api").error(`${req.originalUrl} ${(e as Error).message}`, e)
                res.status(500).send({ message: "Unknown Error deleting flow" });
            }
        }]
    }
}

export const validateFlow: RequestHandler = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const flow = req.body as FlowConfig;
        const errors = validateFlowSchema(flow);
        Logger.getInstance("flow-api").debug(`validateFlow() ${JSON.stringify(errors, null, 2)}`);
        if (errors.length > 0) {
            res.status(400).send(JSON.stringify(errors, null, 2));
            return;
        }
    } catch (e) {
        Logger.getInstance("flow-api").error(`${req.originalUrl} ${(e as Error).message}`, e)
        res.status(400).send([{ message: "Bad Request" }]);
        return;
    }
    next();
}

export const FlowRoutes: Router = express.Router({ mergeParams: true });
const Handlers = FlowHandlers();
FlowRoutes.post("/", ...Handlers.create);
FlowRoutes.get("/:id", ...Handlers.read);
FlowRoutes.get("/", ...Handlers.list);
FlowRoutes.put("/:id", ...Handlers.update);
FlowRoutes.delete("/:id", ...Handlers.delete);