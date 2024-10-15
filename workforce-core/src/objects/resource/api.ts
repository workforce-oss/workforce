import { Router } from "express";
import { ModelHandlers } from "../base/api.js";

export const ResourceRoutes = Router({ mergeParams: true });
export const ResourceHandlers = ModelHandlers('resource');
ResourceRoutes.post("/", ...ResourceHandlers.create);
ResourceRoutes.get("/:id", ...ResourceHandlers.read);
ResourceRoutes.get("/", ...ResourceHandlers.list);
ResourceRoutes.put("/:id", ...ResourceHandlers.update);
ResourceRoutes.delete("/:id", ...ResourceHandlers.delete);