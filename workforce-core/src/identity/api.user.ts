import bodyParser from "body-parser";
import express, { Router } from "express";
import { BrokerManager } from "../manager/broker_manager.js";
import { CrudHandlers } from "../objects/base/api.js";
import { AuthorizationHelper } from "./authorization_helper.js";
import { OrgUserRelationDb } from "./db.org_user.js";

export function UserHandlers(): CrudHandlers {
    return {
        create: [
            bodyParser.json(),
            async (req: express.Request, res: express.Response, next: express.NextFunction) => {
                try {
                    const body = req.body as { email?: string, firstName?: string, lastName?: string, username?: string, password?: string } || {};  

                    if (!body.email || !body.firstName || !body.lastName || !body.username || !body.password) {
                        res.status(400).send("Missing required fields");
                        return;
                    }


                    const user = await BrokerManager.identityBroker.createUser({
                        email: body.email,
                        firstName: body.firstName,
                        lastName: body.lastName,
                        username: body.username,
                        password: body.password,
                    });
                    res.status(201).send(user);
                } catch (error) {
                    next(error);
                }
            }
        ],
        read: [
            AuthorizationHelper.withOrgRole(["admin"]),
            async (req: express.Request, res: express.Response, next: express.NextFunction) => {
                try {
                    const relations = await OrgUserRelationDb.findAll({
                        where: {
                            orgId: req.query.orgId as string,
                            userId: req.params.id
                        }
                    });
                    if (!relations || relations.length === 0) {
                        res.status(404).send("Not Found");
                        return;
                    }
                    res.status(200).send(relations.map((r) => r.toModel()));
                } catch (error) {
                    next(error);
                }
            }
        ],
        list: [
            AuthorizationHelper.withOrgRole(["admin"]),
            async (req: express.Request, res: express.Response, next: express.NextFunction) => {
                try {
                    const users = await OrgUserRelationDb.findAll({
                        where: {
                            orgId: req.query.orgId as string
                        }
                    });
                    res.status(200).send(users.map((u) => u.toModel()));
                } catch (error) {
                    next(error);
                }
            }
        ],
        update: [
            bodyParser.json(),
            async (req: express.Request, res: express.Response, next: express.NextFunction) => {
                try {
                    if (!req.auth?.payload.sub) {
                        res.status(401).send("Unauthorized");
                        return;
                    }

                    const body = req.body as { id?: string, email?: string, firstName?: string, lastName?: string, username?: string, password?: string } || {};

                    if (req.auth?.payload.sub !== req.params.id || req.auth?.payload.sub !== body.id) {
                        res.status(404).send("Not Found");
                        return;
                    }

                    if (!body.email || !body.firstName || !body.lastName || !body.username || !body.password) {
                        res.status(400).send("Missing required fields");
                        return;
                    }

                    const user = await BrokerManager.identityBroker.updateUser({
                        id: body.id,
                        email: body.email,
                        firstName: body.firstName,
                        lastName: body.lastName,
                        username: body.username,
                        password: body.password,
                    });
                    res.status(200).send(user);
                } catch (error) {
                    next(error);
                }
            }
        ],
        delete: [
            async (req: express.Request, res: express.Response, next: express.NextFunction) => {
                try {
                    if (!req.auth?.payload.sub) {
                        res.status(401).send("Unauthorized");
                        return;
                    }
                    if (req.auth?.payload.sub !== req.params.id) {
                        res.status(404).send("Not Found");
                        return;
                    }
                    await BrokerManager.identityBroker.deleteUser(req.params.id);
                    res.status(204).send();
                } catch (error) {
                    next(error);
                }
            }
        ]
    };
}

export const UserRoutes: Router = Router({ mergeParams: true });
const Handlers = UserHandlers();
UserRoutes.post("/", ...Handlers.create);
UserRoutes.get("/:id", ...Handlers.read);
UserRoutes.get("/", ...Handlers.list);
UserRoutes.put("/:id", ...Handlers.update);
UserRoutes.delete("/:id", ...Handlers.delete);