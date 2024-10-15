import bodyParser from "body-parser";
import express from "express";
import { Router } from "express";
import { ProspectDb } from "./db.js";
import { Logger } from "../logging/logger.js";
import { CustomMetrics } from "../metrics/api.js";
import { Prospect } from "./model.js";

export const PublicProspectRoutes = Router({ mergeParams: true });
PublicProspectRoutes.post("/", bodyParser.json(),
    (req: express.Request, res: express.Response) => {
        ProspectDb.create(req.body as Prospect).then((prospect) => {
            if (!prospect) {
                res.status(400).send("Invalid Request");
                return;
            }
            CustomMetrics.getInstance().incrementProspectSignups();
            res.status(200).send(prospect.toModel());
        }).catch((e: Error) => {
            Logger.getInstance("prospect-api").error(`Error creating prospect: ${e}`);
            if (e.name === "SequelizeValidationError") {
                res.status(400).send("Invalid Request");
            } else {
                res.status(500).send("Internal Server Error");
            }
        });
    }
);