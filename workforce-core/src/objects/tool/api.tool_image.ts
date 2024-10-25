import bodyParser from "body-parser";
import express, { RequestHandler, Router } from "express";
import { Logger } from "../../logging/logger.js";
import { ToolDb } from "./db.js";
import { ToolStateDb } from "./db.state.js";

// Add security middleware when using this endpoint
export function ToolImageHandlers(): Record<string, RequestHandler[]> {
    return {
        get: [
            bodyParser.json(),
            async (req: express.Request, res: express.Response, next: express.NextFunction) => {
                try {
                    // get toolId from query string
                    if (!req.query.toolId) {
                        res.status(400).send("Missing toolId query parameter");
                        return;
                    }
                    if(!req.query.taskExecutionId) {
                        res.status(400).send("Missing taskExecutionId query parameter");
                        return;
                    }
                    const found = await ToolStateDb.findAll({
                        include: [
                            {
                                model: ToolDb,
                                // where: {
                                //     orgId: req.auth!.payload.orgId as string,
                                // },
                                required: true,
                            },
                        ],
                        where: {
                            toolId: req.query.toolId as string,
                            taskExecutionId: req.query.taskExecutionId as string,
                        },
                        order: [["createdAt", "DESC"]],
                    });
                    if (found.length === 0) {
                        res.status(404).send("Not found");
                        return;
                    }
                    const base64Image = found[0].machineImage;
                    if (!base64Image) {
                        res.status(404).send("Not found");
                        return;
                    }
                    // this is a base64 encoded png image
                    // the prefix is already removed
                    // we need to send it back as a png
                    const image = Buffer.from(base64Image, "base64");
                    res.setHeader("Content-Type", "image/png");
                    res.send(image);               
                } catch (e) {
                    Logger.getInstance("tool-image-api").error(`${req.originalUrl} ${(e as Error).message}`, e);
                    next(e);
                }
            },
        ],
    };
}

export const ToolImageRouter: Router = express.Router({ mergeParams: true });
ToolImageRouter.get("/", ToolImageHandlers().get);