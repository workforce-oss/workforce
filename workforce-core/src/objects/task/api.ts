import { Router } from "express";
import { ModelHandlers } from "../base/api.js";

export const TaskRoutes: Router = Router({ mergeParams: true });
const Handlers = ModelHandlers('task');
TaskRoutes.post("/", ...Handlers.create);
TaskRoutes.get("/:id", ...Handlers.read);
TaskRoutes.get("/", ...Handlers.list);
TaskRoutes.put("/:id", ...Handlers.update);
TaskRoutes.delete("/:id", ...Handlers.delete);