import bodyParser from "body-parser";
import express from "express";
import { EncryptionService } from "../crypto/encryption_service.js";
import { WorkforceClient } from "../identity/model.js";
import { Logger } from "../logging/logger.js";
import { CrudHandlers } from "../objects/base/api.js";
import { reviver } from "../util/json.js";
import { SecretDb } from "./db.js";
import { SecretData } from "./model.js";

export function SecretHandlers(): CrudHandlers {
    return {
        create: [bodyParser.json({
            reviver: reviver,
        }), async (req: express.Request, res: express.Response, next: express.NextFunction) => {
            try {
                const model = req.body as SecretData;

                const db = new SecretDb(model);
                db.loadModel(model);
                await db.save();
                const updated = await SecretDb.findByPk(db.id);
                if (!updated) {
                    Logger.getInstance(`secret-api`).error(`Failed to create secret`);
                    throw new Error("Failed to create secret");
                }
                res.status(201).send(updated.toModel());
            } catch (e) {
                Logger.getInstance(`secret-api`).error(`${req.originalUrl} ${(e as Error).message}`, e)
                next(e);
            }
        }],
        read: [bodyParser.json({
            reviver: reviver,
        }), async (req: express.Request, res: express.Response, next: express.NextFunction) => {
            try {
                const clientName = req.auth!.payload.client_id as WorkforceClient;
                const found = await SecretDb.findByPk(req.params.id);
                if (!found) {
                    res.status(404).send("Not Found");
                    return;
                }
                const model = found.toModel();
                const decryptedData = EncryptionService.getInstance().decrypt(model.data);
                const reencryptedData = EncryptionService.getInstance().encrypt(decryptedData, clientName);
                model.data = reencryptedData;
                res.send(model);
            } catch (e) {
                Logger.getInstance(`secret-api`).error(`${req.originalUrl} ${(e as Error).message}`, e)
                next(e);
            }
        }],
        list: [bodyParser.json({
            reviver: reviver,
        }), async (req: express.Request, res: express.Response, next: express.NextFunction) => {
            try {
                const clientName = req.auth!.payload.client_id as WorkforceClient;
                const found = await SecretDb.findAll({
                    where: {
                        orgId: req.auth!.payload.orgId as string,
                    }
                });
                res.send(found.map(f => {
                    const model = f.toModel();
                    const decryptedData = EncryptionService.getInstance().decrypt(model.data);
                    const reencryptedData = EncryptionService.getInstance().encrypt(decryptedData, clientName);
                    model.data = reencryptedData;
                    return model;
                }));
            } catch (e) {
                Logger.getInstance(`secret-api`).error(`${req.originalUrl} ${(e as Error).message}`, e)
                next(e);
            }
        }],
        update: [bodyParser.json({
            reviver: reviver,
        }), async (req: express.Request, res: express.Response, next: express.NextFunction) => {
            try {
                const model = req.body as SecretData;
                const db = await SecretDb.findByPk(req.params.id)
                if (!db) {
                    Logger.getInstance(`secret-api`).warn(`update() Secret ${req.params.id} not found`);
                    const newDb = new SecretDb(model);
                    newDb.loadModel(model);
                    newDb.id = req.params.id;
                    newDb.setDataValue("id", req.params.id);

                    await newDb.save();
                    res.status(201).send(newDb.toModel());
                    return;
                }
                db.loadModel(model);
                await db.save();
                const updated = await SecretDb.findByPk(db.id);
                res.send(updated!.toModel());
            } catch (e) {
                Logger.getInstance(`secret-api`).error(`${req.originalUrl} ${(e as Error).message}`, e)
                next(e);
            }
        }],
        delete: [bodyParser.json({
            reviver: reviver,
        }), async (req: express.Request, res: express.Response, next: express.NextFunction) => {
            try {
                const found = await SecretDb.findByPk(req.params.id);
                if (!found) {
                    res.status(404).send("Not Found");
                    return;
                }
                await found.destroy();
                res.status(204).send();
            } catch (e) {
                Logger.getInstance(`secret-api`).error(`${req.originalUrl} ${(e as Error).message}`, e)
                next(e);
            }
        }]
    }
}

export const SecretRoutes = express.Router({ mergeParams: true });
const Handlers = SecretHandlers();
SecretRoutes.post("/", ...Handlers.create);
SecretRoutes.get("/:id", ...Handlers.read);
SecretRoutes.get("/", ...Handlers.list);
SecretRoutes.put("/:id", ...Handlers.update);
SecretRoutes.delete("/:id", ...Handlers.delete);
