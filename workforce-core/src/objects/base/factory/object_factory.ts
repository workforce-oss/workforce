import { ChannelFactory } from "../../channel/factory/factory.js";
import { ChannelConfig } from "../../channel/model.js";
import { DocumentRepositoryFactory } from "../../document_repository/factory/factory.js";
import { DocumentRepositoryConfig } from "../../document_repository/model.js";
import { DocumentationFactory } from "../../documentation/factory/factory.js";
import { DocumentationConfig } from "../../documentation/model.js";
import { ResourceFactory } from "../../resource/factory/factory.js";
import { ResourceConfig } from "../../resource/model.js";
import { TaskFactory } from "../../task/factory/factory.js";
import { TaskConfig } from "../../task/model.js";
import { ToolFactory } from "../../tool/factory/factory.js";
import { ToolConfig } from "../../tool/model.js";
import { TrackerFactory } from "../../tracker/factory/factory.js";
import { TrackerConfig } from "../../tracker/model.js";
import { WorkerFactory } from "../../worker/factory/factory.js";
import { WorkerConfig } from "../../worker/model.js";
import { BaseObject } from "../base.js";
import { BaseConfig } from "../model.js";

export class ObjectFactory {
    static create<TConfig extends BaseConfig, T extends BaseObject<TConfig>>(config: TConfig, onFailure: (objectId: string, error: string) => void): T {
        switch (config.type) {
            case "channel":
                return ChannelFactory.create(config as ChannelConfig, onFailure) as unknown as T;
            case "documentation":
                return DocumentationFactory.create(config as DocumentationConfig, onFailure) as unknown as T;
            case "document_repository":
                return DocumentRepositoryFactory.create(config as DocumentRepositoryConfig, onFailure) as unknown as T;
            case "resource":
                return ResourceFactory.create(config as ResourceConfig, onFailure) as unknown as T;
            case "task":
                return TaskFactory.create(config as TaskConfig, onFailure) as unknown as T;
            case "tool":
                return ToolFactory.create(config as ToolConfig, onFailure) as unknown as T;
            case "tracker":
                return TrackerFactory.create(config as TrackerConfig, onFailure) as unknown as T;
            case "worker":
                return WorkerFactory.create(config as WorkerConfig) as unknown as T;
            default:
                throw new Error(`ObjectFactory.create() unknown object type ${config.type}`);
        }
    }


}