import { Router } from "express";
import { ModelHandlers } from "../base/api.js";


export const DocumentationRoutes = Router({ mergeParams: true });
const Handlers = ModelHandlers('documentation');
DocumentationRoutes.post("/", ...Handlers.create);
DocumentationRoutes.get("/:id", ...Handlers.read);
DocumentationRoutes.get("/", ...Handlers.list);
DocumentationRoutes.put("/:id", ...Handlers.update);
DocumentationRoutes.delete("/:id", ...Handlers.delete);