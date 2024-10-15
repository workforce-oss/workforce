import { Router } from "express";
import { ModelHandlers } from "../base/api.js";

export const ChannelRoutes = Router({ mergeParams: true });
const Handlers = ModelHandlers('channel');
ChannelRoutes.post("/", ...Handlers.create);
ChannelRoutes.get("/:id", ...Handlers.read);
ChannelRoutes.get("/", ...Handlers.list);
ChannelRoutes.put("/:id", ...Handlers.update);
ChannelRoutes.delete("/:id", ...Handlers.delete);