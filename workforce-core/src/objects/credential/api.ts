import bodyParser from "body-parser";
import express, { Router } from "express";
import { Logger } from "../../logging/logger.js";
import { reviver } from "../../util/json.js";
import { CrudRouter, validateVariablesSchema } from "../base/api.js";
import { CredentialDb } from "./db.js";
import { CredentialHelper } from "./helper.js";
import { CredentialConfig } from "./model.js";
import { AuthorizationHelper } from "../../identity/authorization_helper.js";

export const CredentialRouter: Router = CrudRouter({
    create: [bodyParser.json({
        reviver: reviver
    }),
    AuthorizationHelper.withOrgRole(["admin", "maintainer"]),
        validateVariablesSchema("credential"),
    async (req: express.Request, res: express.Response) => {
        try {
            const orgId = req.params.orgId;
            const body = req.body as CredentialConfig;
            body.orgId = orgId;

            const found = await CredentialDb.findOne({
                where: {
                    orgId,
                    name: body.name,
                }
            });

            let model = body;
            if (found) {
                model.secretId = found.secretId;
            }
            model = await CredentialHelper.instance.storeSecrets(model);
            const db = found ?? new CredentialDb();
            db.loadModel(model);
            await db.save();
            Logger.getInstance("credential-api").info(`${req.originalUrl} Created ${db.type} ${db.id}`)
            res.status(201).send(db.toModel(true));
        } catch (e) {
            Logger.getInstance("credential-api").error(`${req.originalUrl} ${(e as Error).message}`, e)
            res.status(500).send({ message: "Unknown Error creating credential" });
        }
    }],
    read: [bodyParser.json({
        reviver: reviver
    }),
    AuthorizationHelper.withSpaceRole(["admin", "maintainer"]),
    async (req: express.Request, res: express.Response) => {
        try {
            const orgId = req.params.orgId;

            const found = await CredentialDb.findOne({
                where: {
                    id: req.params.id,
                    orgId,
                }
            });

            if (!found) {
                res.status(404).send({ message: "Not Found" });
                return;
            }

            const merged = await CredentialHelper.instance.mergeCredential(found.toModel(), "credential");
            res.send(merged);
        } catch (e) {
            Logger.getInstance("credential-api").error(`${req.originalUrl} ${(e as Error).message}`, e)
            res.status(500).send({ message: "Unknown Error reading credential" });
        }
    }],
    list: [bodyParser.json({
        reviver: reviver
    }),
    AuthorizationHelper.withOrgRole(["admin", "maintainer"]),
    async (req: express.Request, res: express.Response) => {
        try {
            const orgId = req.params.orgId;
            const found = await CredentialDb.findAll({
                where: {
                    orgId
                },
                include: {
                    all: true,
                }
            })
            const merged: CredentialConfig[] = [];
            for (const f of found) {
                // merged.push(await CredentialHelper.instance.mergeCredential(f.toModel()));
                const model = f.toModel();
                merged.push(model)
            }
            res.send(merged);
        } catch (e) {
            Logger.getInstance("credential-api").error(`${req.originalUrl} ${(e as Error).message}`, e)
            res.status(500).send([]);
        }
    }],
    update: [bodyParser.json({
        reviver: reviver
    }),
    AuthorizationHelper.withOrgRole(["admin", "maintainer"]),
        validateVariablesSchema("credential"),
    async (req: express.Request, res: express.Response) => {
        try {
            const orgId = req.params.orgId;
            const body = req.body as CredentialConfig;
            body.orgId = orgId;

            const found = await CredentialDb.findOne({
                where: {
                    id: req.params.id,
                    orgId,
                }
            });
            if (!found) {
                res.status(404).send({ message: "Not Found" });
                return;
            }
            let model = body;
            model.secretId = found.secretId;
            model = await CredentialHelper.instance.storeSecrets(model);

            found.loadModel(model);
            await found.save();
            const merged = await CredentialHelper.instance.mergeCredential(found.toModel(), "credential");
            res.send(merged);
        } catch (e) {
            Logger.getInstance("credential-api").error(`${req.originalUrl} ${(e as Error).message}`, e)
            res.status(500).send({ message: "Unknown Error updating credential" });
        }
    }],
    delete: [bodyParser.json({
        reviver: reviver
    }),
    AuthorizationHelper.withOrgRole(["admin", "maintainer"]),
    async (req: express.Request, res: express.Response) => {
        try {
            const orgId = req.params.orgId;
            const found = await CredentialDb.findOne({
                where: {
                    id: req.params.id,
                    orgId,
                }
            });
            if (!found) {
                res.status(404).send({ message: "Not Found" });
                return;
            }

            await found.destroy();
            res.send({ message: "Deleted" });
        } catch (e) {
            Logger.getInstance("credential-api").error(`${req.originalUrl} ${(e as Error).message}`, e)
            res.status(500).send({ message: "Unknown Error deleting credential" });
        }
    }]
});
