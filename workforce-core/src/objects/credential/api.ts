import bodyParser from "body-parser";
import express, { Router } from "express";
import { Logger } from "../../logging/logger.js";
import { reviver } from "../../util/json.js";
import { CrudHandlers, validateVariablesSchema } from "../base/api.js";
import { CredentialDb } from "./db.js";
import { CredentialHelper } from "./helper.js";
import { CredentialConfig } from "./model.js";
import { AuthorizationHelper } from "../../identity/authorization_helper.js";

export function CredentialHandlers(): CrudHandlers {
    return {
        create: [bodyParser.json({
            reviver: reviver
        }),
        AuthorizationHelper.withOrgRole(["admin", "maintainer"]), 
        validateVariablesSchema, 
        async (req: express.Request, res: express.Response) => {
            try {
                const body = req.body as CredentialConfig;

                if (!body.orgId) {
                    res.status(400).send({message: "orgId is required"});
                    return;
                }

                const found = await CredentialDb.findOne({
                    where: {
                        orgId: body.orgId,
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
                res.status(500).send({message: "Unknown Error creating credential"});
            }
        }],
        read: [bodyParser.json({
            reviver: reviver
        }), 
        async (req: express.Request, res: express.Response) => {
            try {
                if (!req.auth?.payload.sub) {
                    res.status(401).send("Unauthorized");
                    return;
                }

                const found = await CredentialDb.findOne({
                    where: {
                        id: req.params.id,
                    }
                });
                
                if (!found) {
                    res.status(404).send({message: "Not Found"});
                    return;
                }

                // validate relations
                if (found.spaceId) {
                    if (!await AuthorizationHelper.hasSpaceRoles(["admin", "maintainer"], req.auth?.payload.sub, found.spaceId)) {
                        res.status(404).send({message: "Not Found"});
                        return;
                    }
                } else {
                    if (!await AuthorizationHelper.hasOrgRoles(["admin", "maintainer"], req.auth?.payload.sub, found.orgId)) {
                        res.status(404).send({message: "Not Found"});
                        return;
                    }
                }

                const merged = await CredentialHelper.instance.mergeCredential(found.toModel());
                res.send(merged);
            } catch (e) {
                Logger.getInstance("credential-api").error(`${req.originalUrl} ${(e as Error).message}`, e)
                res.status(500).send({message: "Unknown Error reading credential"});
            }
        }],
        list: [bodyParser.json({
            reviver: reviver
        }), 
        AuthorizationHelper.withOrgRole(["admin", "maintainer"]),  
        async (req: express.Request, res: express.Response) => {
            try {
                const found = await CredentialDb.findAll({
                    where: {
                        orgId: req.query.orgId as string,
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
        validateVariablesSchema,
        async (req: express.Request, res: express.Response) => {
            try {

                const body = req.body as CredentialConfig;

                const found = await CredentialDb.findOne({
                    where: {
                        id: req.params.id,
                        orgId: body.orgId,
                    }
                });
                if (!found) {
                    res.status(404).send({message: "Not Found"});
                    return;
                }
                let model = body;
                model.secretId = found.secretId;
                model = await CredentialHelper.instance.storeSecrets(model);

                found.loadModel(model);
                await found.save();
                const merged = await CredentialHelper.instance.mergeCredential(found.toModel());
                res.send(merged);
            } catch (e) {
                Logger.getInstance("credential-api").error(`${req.originalUrl} ${(e as Error).message}`, e)
                res.status(500).send({message: "Unknown Error updating credential"});
            }
        }],
        delete: [bodyParser.json({
            reviver: reviver
        }),         
        async (req: express.Request, res: express.Response) => {
            try {
                if (!req.auth?.payload.sub) {
                    res.status(401).send("Unauthorized");
                    return;
                }

                const found = await CredentialDb.findOne({
                    where: {
                        id: req.params.id,
                    }
                });
                if (!found) {
                    res.status(404).send({message: "Not Found"});
                    return;
                }
                
                // validate relations
                if (found.spaceId) {
                    if (!await AuthorizationHelper.hasSpaceRoles(["admin", "maintainer"], req.auth?.payload.sub, found.spaceId)) {
                        res.status(404).send({message: "Not Found"});
                        return;
                    }
                } else {
                    if (!await AuthorizationHelper.hasOrgRoles(["admin", "maintainer"], req.auth?.payload.sub, found.orgId)) {
                        res.status(404).send({message: "Not Found"});
                        return;
                    }
                }
                await found.destroy();
                res.send({message: "Deleted"});
            } catch (e) {
                Logger.getInstance("credential-api").error(`${req.originalUrl} ${(e as Error).message}`, e)
                res.status(500).send({message: "Unknown Error deleting credential"});
            }
        }]
    }
}


export const CredentialRoutes: Router = Router({ mergeParams: true });
const Handlers = CredentialHandlers();
CredentialRoutes.post("/", ...Handlers.create);
CredentialRoutes.get("/:id", ...Handlers.read);
CredentialRoutes.get("/", ...Handlers.list);
CredentialRoutes.put("/:id", ...Handlers.update);
CredentialRoutes.delete("/:id", ...Handlers.delete);