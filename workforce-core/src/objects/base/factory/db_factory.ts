import { ChannelDb } from "../../channel/db.js";
import { ChannelConfig } from "../../channel/model.js";
import { CredentialDb } from "../../credential/db.js";
import { CredentialConfig } from "../../credential/model.js";
import { DocumentRepositoryDb } from "../../document_repository/db.js";
import { DocumentRepositoryConfig } from "../../document_repository/model.js";
import { DocumentationDb } from "../../documentation/db.js";
import { DocumentationConfig } from "../../documentation/model.js";
import { ResourceDb } from "../../resource/db.js";
import { ResourceConfig } from "../../resource/model.js";
import { TaskDb } from "../../task/db.js";
import { TaskConfig } from "../../task/model.js";
import { ToolDb } from "../../tool/db.js";
import { ToolConfig } from "../../tool/model.js";
import { TrackerDb } from "../../tracker/db.js";
import { TrackerConfig } from "../../tracker/model.js";
import { WorkerDb } from "../../worker/db.js";
import { WorkerConfig } from "../../worker/model.js";
import { BaseModel } from "../db.js";
import { ObjectType } from "./types.js";

export class DbFactory {
    static createDb<T extends BaseModel>(type: ObjectType, model: unknown): T {
        if (type === 'channel') {
            return new ChannelDb().loadModel(model as ChannelConfig) as unknown as T;
        } else if (type === 'credential') {
            return new CredentialDb().loadModel(model as CredentialConfig) as unknown as T;
        } else if (type === 'documentation') {
            return new DocumentationDb().loadModel(model as DocumentationConfig) as unknown as T;
        } else if (type === 'document_repository') {
            return new DocumentRepositoryDb().loadModel(model as DocumentRepositoryConfig) as unknown as T;
        } else if (type === 'resource') {
            return new ResourceDb().loadModel(model as ResourceConfig) as unknown as T;
        } else if (type === 'task') {
            return new TaskDb().loadModel(model as TaskConfig) as unknown as T;
        } else if (type === 'tool') {
            return new ToolDb().loadModel(model as ToolConfig) as unknown as T;
        } else if (type === 'tracker') {
            return new TrackerDb().loadModel(model as TrackerConfig) as unknown as T;
        } else if (type === 'worker') {
            return new WorkerDb(model as WorkerConfig).loadModel(model as WorkerConfig) as unknown as T;
        } else {
            throw new Error(`Unknown object type: ${type}`);
        }
    }

    static getType(type: ObjectType): typeof BaseModel {
        if (type === 'channel') {
            return ChannelDb;
        } else if (type === 'credential') {
            return CredentialDb;
        } else if (type === 'documentation') {
            return DocumentationDb;
        } else if (type === 'document_repository') {
            return DocumentRepositoryDb;
        } else if (type === 'resource') {
            return ResourceDb;
        } else if (type === 'task') {
            return TaskDb;
        } else if (type === 'tool') {
            return ToolDb;
        } else if (type === 'tracker') {
            return TrackerDb;
        } else if (type === 'worker') {
            return WorkerDb;
        } else {
            throw new Error(`Unknown object type: ${type}`);
        }
    }
}