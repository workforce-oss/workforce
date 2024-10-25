import bodyParser from "body-parser";
import { Router, Request, Response } from "express";
import { reviver } from "../../util/json.js";
import {  CrudRouter } from "../base/api.js";
import { SkillDb } from "./db.skill.js";
import { AuthorizationHelper } from "../../identity/authorization_helper.js";
import { Logger } from "../../logging/logger.js";
import { Skill } from "./model.js";

export const SkillRouter: Router = CrudRouter({
    create: [
        bodyParser.json({
            reviver: reviver,
        }),
        AuthorizationHelper.withSpaceRole(["admin", "maintainer", "developer"]),
        async (req: Request, res: Response) => {
            const orgId = req.params.orgId;
            const { name } = req.body as { name: string };
            try {
                const found = await SkillDb.findOne({
                    where: {
                        orgId: orgId,
                        name: name,
                    },
                });
                if (found) {
                    res.status(200).send(found.toModel());
                } else {

                    const model = req.body as Skill;
                    model.orgId = orgId;
                    const db = await SkillDb.create(model);
                    await db.save();
                    const result = db.toModel();
                    res.status(201).send(result);
                }
            } catch (e) {
                Logger.getInstance("skill-api").error(`Error creating skill: `, e);
                res.status(500).send({ message: "Unknown Error creating skill" });
            }
        }
    ],
    read: [
        AuthorizationHelper.withSpaceRole(["admin", "maintainer", "developer"]),
        async (req: Request, res: Response) => {
            const orgId = req.params.orgId;

            try {
                const db = await SkillDb.findOne({
                    where: {
                        id: req.params.id,
                        orgId
                    },
                });
                if (!db) {
                    res.status(404).send({ message: `Skill ${req.params.id} not found` });
                    return;
                }

                const result = db.toModel();
                res.status(200).send(result);
            } catch (e) {
                Logger.getInstance("skill-api").error(`Error reading skill: `, e);
                res.status(500).send({ message: "Unknown Error reading skill" });
            }
        }
    ],
    list: [
        AuthorizationHelper.withSpaceRole(["admin", "maintainer", "developer"]),
        async (req: Request, res: Response) => {
            try {
                const orgId = req.params.orgId;
                const db = await SkillDb.findAll({
                    where: {
                        orgId
                    },
                });
                const result = db.map((db) => db.toModel());
                res.status(200).send(result);
            } catch (e) {
                Logger.getInstance("skill-api").error(`Error listing skills: `, e);
                res.status(500).send({ message: "Unknown Error listing skills" });
            }
        }
    ],
    update: [
        bodyParser.json({
            reviver: reviver,
        }),
        AuthorizationHelper.withSpaceRole(["admin", "maintainer", "developer"]),
        async (req: Request, res: Response) => {
            const orgId = req.params.orgId;
            try {
                const db = await SkillDb.findOne({
                    where: {
                        id: req.params.id,
                        orgId,
                    },
                });
                if (!db) {
                    res.status(404).send({ message: `Skill ${req.params.id} not found` });
                    return;
                }
                const model = req.body as Skill;
                model.orgId = orgId;
                
                db.loadModel(model);
                await db.save();
                const result = db.toModel();
                res.status(200).send(result);
            } catch (e) {
                Logger.getInstance("skill-api").error(`Error updating skill: `, e);
                res.status(500).send({ message: "Unknown Error updating skill" });
            }
        }
    ],
    delete: [
        AuthorizationHelper.withSpaceRole(["admin", "maintainer", "developer"]),
        async (req: Request, res: Response) => {
            try {
                const orgId = req.params.orgId;
                const db = await SkillDb.findOne({
                    where: {
                        id: req.params.id,
                        orgId,
                    },
                });
                if (!db) {
                    res.status(404).send({ message: `Skill ${req.params.id} not found` });
                    return;
                }

                await db.destroy();
                res.status(204).send({ message: "Deleted" });
            } catch (e) {
                Logger.getInstance("skill-api").error(`Error deleting skill: `, e);
                res.status(500).send({ message: "Unknown Error deleting skill" });
            }
        }
    ]
});