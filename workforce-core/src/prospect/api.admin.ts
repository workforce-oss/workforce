import { Router } from "express";
import express from "express";
import { ProspectDb } from "./db.js";
import { Logger } from "../logging/logger.js";
import { Prospect } from "./model.js";

function validateAdmin(req: express.Request, res: express.Response, next: express.NextFunction): void {
    if (req.auth?.payload.orgId !== "internal" && req.auth?.payload.role !== "admin") {
        res.status(403).send("Forbidden");
        return;
    }
    next();
}

export const AdminProspectRoutes = Router({ mergeParams: true });
AdminProspectRoutes.get("/",
    validateAdmin,
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const firstName = req.query.firstName;
        const lastName = req.query.lastName;
        const email = req.query.email;
        const status = req.query.status;
        const company = req.query.company;
        const count = (req.query.count ?? 10) as number;
        const offset = (req.query.offset ?? 0) as number;

        if (count > 100) {
            res.status(400).send("Count must be less than or equal to 100");
            return;
        }

        let where = {};
        if (firstName) {
            where = { ...where, firstName };
        }
        if (lastName) {
            where = { ...where, lastName };
        }
        if (email) {
            where = { ...where, email };
        }
        if (status) {
            where = { ...where, status };
        }
        if (company) {
            where = { ...where, company };
        }

        ProspectDb.findAll({
            where: where,
            limit: count,
            offset: offset,
        }).then((prospects) => {
            res.status(200).send(prospects.map((prospect) => prospect.toModel()));
        }).catch((e) => {
            Logger.getInstance("prospect-admin-api").error(`list() Error getting prospects: ${e}`);
            next(e);
        });
    });
AdminProspectRoutes.get("/:id",
    validateAdmin,
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
        ProspectDb.findByPk(req.params.id).then((prospect) => {
            if (!prospect) {
                res.status(404).send("get() Prospect not found");
                return;
            }
            res.status(200).send(prospect.toModel());
        }).catch((e) => {
            Logger.getInstance("prospect-admin-api").error(`get() Error getting prospect: ${e}`);
            next(e);
        });
    });
AdminProspectRoutes.put("/:id",
    validateAdmin,
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
        ProspectDb.findByPk(req.params.id).then((prospect) => {
            if (!prospect) {
                res.status(404).send("put() Prospect not found");
                return;
            }
            prospect.update(req.body as Prospect).then(() => {
                res.status(200).send(prospect.toModel());
            }).catch((e) => {
                Logger.getInstance("prospect-admin-api").error(`put() Error updating prospect: ${e}`);
                next(e);
            });
        }).catch((e) => {
            Logger.getInstance("prospect-admin-api").error(`put() Error finding prospect: ${e}`);
            next(e);
        });
    });
AdminProspectRoutes.patch("/:id",
    validateAdmin,
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
        ProspectDb.findByPk(req.params.id).then((prospect) => {
            if (!prospect) {
                res.status(404).send("patch() Prospect not found");
                return;
            }
            prospect.update({
                ...prospect.toModel(),
                ...req.body as Prospect
            }).then(() => {
                res.status(200).send(prospect.toModel());
            }).catch((e) => {
                Logger.getInstance("prospect-admin-api").error(`patch() Error updating prospect: ${e}`);
                next(e);
            });
        }).catch((e) => {
            Logger.getInstance("prospect-admin-api").error(`patch() Error finding prospect: ${e}`);
            next(e);
        });
    });
AdminProspectRoutes.delete("/:id",
    validateAdmin,
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
        ProspectDb.findByPk(req.params.id).then((prospect) => {
            if (!prospect) {
                res.status(404).send("delete() Prospect not found");
                return;
            }
            prospect.destroy().then(() => {
                res.status(204).send();
            }).catch((e) => {
                Logger.getInstance("prospect-admin-api").error(`delete() Error deleting prospect: ${e}`);
                next(e);
            });
        }).catch((e) => {
            Logger.getInstance("prospect-admin-api").error(`delete() Error finding prospect: ${e}`);
            next(e);
        });
    });
