import { Router } from "express";
import { ModelHandlers } from "../base/api.js";


export const ToolRoutes = Router({ mergeParams: true });
const Handlers = ModelHandlers('tool');
ToolRoutes.post("/", ...Handlers.create);
ToolRoutes.get("/:id", ...Handlers.read);
ToolRoutes.get("/", ...Handlers.list);
ToolRoutes.put("/:id", ...Handlers.update);
ToolRoutes.delete("/:id", ...Handlers.delete);