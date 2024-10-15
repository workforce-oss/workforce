import {Router} from 'express';
import {ModelHandlers} from '../base/api.js';

export const TrackerRoutes = Router({mergeParams: true});
const Handlers = ModelHandlers('tracker');
TrackerRoutes.post("/", ...Handlers.create);
TrackerRoutes.get("/:id", ...Handlers.read);
TrackerRoutes.get("/", ...Handlers.list);
TrackerRoutes.put("/:id", ...Handlers.update);
TrackerRoutes.delete("/:id", ...Handlers.delete);