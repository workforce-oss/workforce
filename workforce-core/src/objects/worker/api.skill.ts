import bodyParser from "body-parser";
import express from "express";
import { reviver } from "../../util/json.js";
import { CrudHandlers } from "../base/api.js";
import { SkillDb } from "./db.skill.js";
import { AuthorizationHelper } from "../../identity/authorization_helper.js";
import { Logger } from "../../logging/logger.js";

export function SkillHandlers(): CrudHandlers {
    return {
        create: [
            bodyParser.json({
                reviver: reviver,
            }),
            AuthorizationHelper.withSpaceRole(["admin", "maintainer", "developer"]),
            async (req: express.Request, res: express.Response) => {
                const { orgId, name } = req.body as { orgId: string, name: string };
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
                        const model = req.body as never;
                        const db = await SkillDb.create(model);
                        await db.save();
                        const result = db.toModel();
                        res.status(201).send(result);
                    }
                } catch (e) {
                    Logger.getInstance("skill-api").error(`Error creating skill: `, e);
                    res.status(500).send({message: "Unknown Error creating skill"});
                }
            }
        ],
        read: [
            async (req: express.Request, res: express.Response) => {
                if (!req.auth?.payload.sub) {
                    res.status(401).send("Unauthorized");
                    return;
                }

                try {
                    const db = await SkillDb.findOne({
                        where: {
                            id: req.params.id,
                        },
                    });
                    if (!db) {
                        res.status(404).send({message: `Skill ${req.params.id} not found`});
                        return;
                    }


                    // validate relations
                    if (!await AuthorizationHelper.hasOrgRoles(["admin", "maintainer", "developer"], req.auth?.payload.sub, db.orgId)) {
                        res.status(404).send({message: "Not Found"});
                        return;
                    }

                    const result = db.toModel();
                    res.status(200).send(result);
                } catch (e) {
                    Logger.getInstance("skill-api").error(`Error reading skill: `, e);
                    res.status(500).send({message: "Unknown Error reading skill"});
                }
            }
        ],
        list: [
            AuthorizationHelper.withSpaceRole(["admin", "maintainer", "developer"]),
            async (req: express.Request, res: express.Response) => {
                try {
                    const db = await SkillDb.findAll({
                        where: {
                            orgId: req.query.orgId as string,
                        },
                    });
                    const result = db.map((db) => db.toModel());
                    res.status(200).send(result);
                } catch (e) {
                    Logger.getInstance("skill-api").error(`Error listing skills: `, e);
                    res.status(500).send({message: "Unknown Error listing skills"});
                }
            }
        ],
        update: [
            bodyParser.json({
                reviver: reviver,
            }),
            AuthorizationHelper.withSpaceRole(["admin", "maintainer", "developer"]),
            async (req: express.Request, res: express.Response) => {
                const { orgId } = req.body as { orgId: string };
                try {
                    const db = await SkillDb.findOne({
                        where: {
                            id: req.params.id,
                            orgId: orgId,
                        },
                    });
                    if (!db) {
                        res.status(404).send({message: `Skill ${req.params.id} not found`});
                        return;
                    }
                    const model = req.body as never;
                    db.loadModel(model);
                    await db.save();
                    const result = db.toModel();
                    res.status(200).send(result);
                } catch (e) {
                    Logger.getInstance("skill-api").error(`Error updating skill: `, e);
                    res.status(500).send({message: "Unknown Error updating skill"});
                }
            }
        ],
        delete: [
            // AuthorizationHelper.withSpaceRole(["admin", "maintainer", "developer"]),
            async (req: express.Request, res: express.Response) => {
                try {
                    if (!req.auth?.payload.sub) {
                        res.status(401).send("Unauthorized");
                        return;
                    }
                    const db = await SkillDb.findOne({
                        where: {
                            id: req.params.id,
                        },
                    });
                    if (!db) {
                        res.status(404).send({message:`Skill ${req.params.id} not found`});
                        return;
                    }

                    // validate relations
                    if (!await AuthorizationHelper.hasOrgRoles(["admin", "maintainer", "developer"], req.auth?.payload.sub, db.orgId)) {
                        res.status(404).send({message: "Not Found"});
                        return;
                    }
                    
                    await db.destroy();
                    res.status(204).send({message: "Deleted"});
                } catch (e) {
                    Logger.getInstance("skill-api").error(`Error deleting skill: `, e);
                    res.status(500).send({message: "Unknown Error deleting skill"});
                }
            }
        ]
    }
}

export const SkillRoutes = express.Router({ mergeParams: true });
const Handlers = SkillHandlers();
SkillRoutes.post("/", ...Handlers.create);
SkillRoutes.get("/:id", ...Handlers.read);
SkillRoutes.get("/", ...Handlers.list);
SkillRoutes.put("/:id", ...Handlers.update);
SkillRoutes.delete("/:id", ...Handlers.delete);