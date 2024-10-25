import bodyParser from "body-parser";
import express, { Router } from "express";
import { BrokerManager } from "../manager/broker_manager.js";
import {  CrudRouter } from "../objects/base/api.js";
import { OrgUserRelationDb } from "./db.org_user.js";
import { UserDb } from "./db.user.js";
import { Logger } from "../logging/logger.js";

export const UserRouter: Router = CrudRouter({
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
        async (req: express.Request, res: express.Response, next: express.NextFunction) => {
            try {
                if (!req.auth?.payload.sub) {
                    res.status(401).send("Unauthorized");
                    return;
                }
                Logger.getInstance("user-api").debug("Read user", req.auth.payload.sub);
                const userDb = await UserDb.findByPk(req.auth.payload.sub, {
                    include: [
                        {
                            model: OrgUserRelationDb,
                            where: {
                                userId: req.auth.payload.sub,
                            },
                        }
                    ]
                });
                if (!userDb) {
                    res.status(404).send("Not Found");
                    return;
                }

                res.status(200).send(userDb.toModel());
            } catch (error) {
                next(error);
            }
        }
    ],
    list: [],
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
});