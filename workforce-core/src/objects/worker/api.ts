import { Router } from "express";
import { ModelHandlers } from "../base/api.js";

export const WorkerRoutes: Router = Router({ mergeParams: true });
const Handlers = ModelHandlers('worker');
WorkerRoutes.post("/", ...Handlers.create);
WorkerRoutes.get("/:id", ...Handlers.read);
WorkerRoutes.get("/", ...Handlers.list);
WorkerRoutes.put("/:id", ...Handlers.update);
WorkerRoutes.delete("/:id", ...Handlers.delete);