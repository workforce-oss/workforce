import { channelTypes } from "../../channel/model.js";
import { channelUserCredentialTypes } from "../../channel_user_credential/model.js";
import { documentRepositoryTypes } from "../../document_repository/model.js";
import { documentationTypes } from "../../documentation/model.js";
import { resourceTypes } from "../../resource/model.js";
import { taskTypes } from "../../task/model.js";
import { toolTypes } from "../../tool/model.js";
import { trackerTypes } from "../../tracker/model.js";
import { workerTypes } from "../../worker/model.js";

export const objectTypes = [
    "channel",
    "channel_user_credential",
    "credential",
    "documentation",
    "document_repository",
    "resource",
    "task",
    "tool",
    "tracker",
    "worker",
] as const;

export type ObjectType = typeof objectTypes[number];

export const objectSubtypes = [
    ...channelTypes,
    ...channelUserCredentialTypes,
    ...documentationTypes,
    ...documentRepositoryTypes,
    ...resourceTypes,
    ...taskTypes,
    ...toolTypes,
    ...trackerTypes,
    ...workerTypes,
    
] as const;
export type ObjectSubtype = typeof objectSubtypes[number];