import { ChannelConfigFactory } from "../../channel/factory/config_factory.js";
import { ChannelType, channelTypes } from "../../channel/model.js";
import { ChannelUserCredentialConfigFactory } from "../../channel_user_credential/factory/config_factory.js";
import { ChannelUserCredentialType, channelUserCredentialTypes } from "../../channel_user_credential/model.js";
import { CredentialConfigFactory } from "../../credential/factory/config_factory.js";
import { DocumentRepositoryConfigFactory } from "../../document_repository/factory/config_factory.js";
import { DocumentRepositoryType, documentRepositoryTypes } from "../../document_repository/model.js";
import { DocumentationConfigFactory } from "../../documentation/factory/config_factory.js";
import { DocumentationType, documentationTypes } from "../../documentation/model.js";
import { ResourceConfigFactory } from "../../resource/factory/config_factory.js";
import { ResourceType, resourceTypes } from "../../resource/model.js";
import { TaskConfigFactory } from "../../task/factory/config_factory.js";
import { TaskType, taskTypes } from "../../task/model.js";
import { ToolConfigFactory } from "../../tool/factory/config_factory.js";
import { ToolType, toolTypes } from "../../tool/model.js";
import { TrackerConfigFactory } from "../../tracker/factory/config_factory.js";
import { TrackerType, trackerTypes } from "../../tracker/model.js";
import { WorkerConfigFactory } from "../../worker/factory/config_factory.js";
import { WorkerType, workerTypes } from "../../worker/model.js";
import { BaseConfig } from "../model.js";
import { ObjectSubtype, ObjectType } from "./types.js";

export class ConfigFactory {
    static defaultConfigFor<TConfig extends BaseConfig>(orgId: string, type: ObjectType, subtype: ObjectSubtype): TConfig {
        switch (type) {
            case "channel":
                return ChannelConfigFactory.defaultConfigFor(orgId, subtype as ChannelType) as unknown as TConfig;
            case "channel_user_credential":
                return ChannelUserCredentialConfigFactory.defaultConfigFor(orgId, subtype as ChannelUserCredentialType) as unknown as TConfig;
            case "credential":
                return CredentialConfigFactory.defaultConfigFor(orgId, subtype) as unknown as TConfig;
            case "documentation":
                return DocumentationConfigFactory.defaultConfigFor(orgId, subtype as DocumentationType) as unknown as TConfig;
            case "document_repository":
                return DocumentRepositoryConfigFactory.defaultConfigFor(orgId, subtype as DocumentRepositoryType) as unknown as TConfig;
            case "resource":
                return ResourceConfigFactory.defaultConfigFor(orgId, subtype as ResourceType) as unknown as TConfig;
            case "task":
                return TaskConfigFactory.defaultConfigFor(orgId, subtype as TaskType) as unknown as TConfig;
            case "tool":
                return ToolConfigFactory.defaultConfigFor(orgId, subtype as ToolType) as unknown as TConfig;
            case "tracker":
                return TrackerConfigFactory.defaultConfigFor(orgId, subtype as TrackerType) as unknown as TConfig;
            case "worker":
                return WorkerConfigFactory.defaultConfigFor(orgId, subtype as WorkerType) as unknown as TConfig;
            default:
                throw new Error(`ObjectFactory.defaultConfigFor() unknown object type ${type as string}`);
        }
    }

    static getTypeForSubtype(subtype: ObjectSubtype): ObjectType {
        if (channelTypes.includes(subtype as ChannelType)) {
            return "channel";
        }
        if (channelUserCredentialTypes.includes(subtype as ChannelUserCredentialType)) {
            return "channel_user_credential";
        }
        if (documentationTypes.includes(subtype as DocumentationType)) {
            return "documentation";
        }
        if (documentRepositoryTypes.includes(subtype as DocumentRepositoryType)) {
            return "document_repository";
        }
        if (resourceTypes.includes(subtype as ResourceType)) {
            return "resource";
        }
        if (taskTypes.includes(subtype as TaskType)) {
            return "task";
        }
        if (toolTypes.includes(subtype as ToolType)) {
            return "tool";
        }
        if (trackerTypes.includes(subtype as TrackerType)) {
            return "tracker";
        }
        if (workerTypes.includes(subtype as WorkerType)) {
            return "worker";
        }
        throw new Error(`ObjectFactory.getTypeForSubtype() unknown object subtype ${subtype}`);
    }

    static getSubtypesForType(type: ObjectType): ObjectSubtype[] {
        switch (type) {
            case "channel":
                return channelTypes as unknown as ObjectSubtype[];
            case "channel_user_credential":
                return channelUserCredentialTypes as unknown as ObjectSubtype[];
            case "documentation":
                return documentationTypes as unknown as ObjectSubtype[];
            case "document_repository":
                return documentRepositoryTypes as unknown as ObjectSubtype[];
            case "resource":
                return resourceTypes as unknown as ObjectSubtype[];
            case "task":
                return taskTypes as unknown as ObjectSubtype[];
            case "tool":
                return toolTypes as unknown as ObjectSubtype[];
            case "tracker":
                return trackerTypes as unknown as ObjectSubtype[];
            case "worker":
                return workerTypes as unknown as ObjectSubtype[];
            default:
                throw new Error(`ObjectFactory.getSubtypesForType() unknown object type ${type}`);
        }
    }

}