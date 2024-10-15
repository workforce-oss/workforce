import { Logger } from "../../../logging/logger.js";
import { ChannelConfigFactory } from "../../channel/factory/config_factory.js";
import { ChannelConfig, ChannelType, channelTypes } from "../../channel/model.js";
import { ChannelUserCredentialConfigFactory } from "../../channel_user_credential/factory/config_factory.js";
import {
	ChannelUserCredential,
	ChannelUserCredentialType,
	channelUserCredentialTypes,
} from "../../channel_user_credential/model.js";
import { CredentialConfig } from "../../credential/model.js";
import { DocumentRepositoryConfigFactory } from "../../document_repository/factory/config_factory.js";
import { DocumentRepositoryConfig, DocumentRepositoryType, documentRepositoryTypes } from "../../document_repository/model.js";
import { DocumentationConfigFactory } from "../../documentation/factory/config_factory.js";
import { DocumentationConfig, DocumentationType, documentationTypes } from "../../documentation/model.js";
import { ResourceConfigFactory } from "../../resource/factory/config_factory.js";
import { ResourceConfig, ResourceType, resourceTypes } from "../../resource/model.js";
import { TaskConfigFactory } from "../../task/factory/config_factory.js";
import { TaskConfig, TaskType, taskTypes } from "../../task/model.js";
import { ToolConfigFactory } from "../../tool/factory/config_factory.js";
import { ToolConfig, ToolType, toolTypes } from "../../tool/model.js";
import { TrackerConfigFactory } from "../../tracker/factory/config_factory.js";
import { TrackerConfig, TrackerType, trackerTypes } from "../../tracker/model.js";
import { WorkerConfigFactory } from "../../worker/factory/config_factory.js";
import { WorkerConfig, WorkerType, workerTypes } from "../../worker/model.js";
import { BaseConfig } from "../model.js";
import { VariablesSchema } from "../variables_schema.js";
import { VariableSchemaElement } from "../variables_schema_model.js";


export class VariablesSchemaFactory {
	private static logger: Logger = Logger.getInstance("VariablesSchemaFactory");
	static for<T extends BaseConfig>(model: T): VariablesSchema {
		switch (model.type) {
			case "credential": {
				const schema = this.getCredentialVariablesSchema(model as CredentialConfig);
				this.logger.debug(`Credential variables schema: ${schema.toJsonString()}`);
				return schema;
			}
			case "channel_user_credential":
				return ChannelUserCredentialConfigFactory.variablesSchemaFor(
					model as ChannelUserCredential
				).onlySensitive();
			case "documentation":
				return DocumentationConfigFactory.variablesSchemaFor(model as DocumentationConfig).withoutSensitive();
			case "channel":
				return ChannelConfigFactory.variablesSchemaFor(model as ChannelConfig).withoutSensitive();
			case "document_repository":
				return DocumentRepositoryConfigFactory.variablesSchemaFor(model as DocumentRepositoryConfig).withoutSensitive();
			case "resource":
				return ResourceConfigFactory.variablesSchemaFor(model as ResourceConfig).withoutSensitive();
			case "task":
				return TaskConfigFactory.variablesSchemaFor(model as TaskConfig).withoutSensitive();
			case "tool":
				return ToolConfigFactory.variablesSchemaFor(model as ToolConfig).withoutSensitive();
			case "tracker":
				return TrackerConfigFactory.variablesSchemaFor(model as TrackerConfig).withoutSensitive();
			case "worker":
				return WorkerConfigFactory.variablesSchemaFor(model as WorkerConfig).withoutSensitive();
			default:
				return new VariablesSchema(new Map<string, VariableSchemaElement>(), model.type, model.subtype);
		}
	}

	private static getCredentialVariablesSchema<T extends BaseConfig>(model: T): VariablesSchema {
		if (channelUserCredentialTypes.includes(model.subtype as ChannelUserCredentialType)) {
			return ChannelUserCredentialConfigFactory.variablesSchemaFor(
				model as ChannelUserCredential
			).onlySensitive();
		} else if (channelTypes.includes(model.subtype as ChannelType)) {
			return ChannelConfigFactory.variablesSchemaFor(model as ChannelConfig).onlySensitive();
		} else if (documentationTypes.includes(model.subtype as DocumentationType)) {
			return DocumentationConfigFactory.variablesSchemaFor(model as DocumentationConfig).onlySensitive();
		} else if (documentRepositoryTypes.includes(model.subtype as DocumentRepositoryType)) {
			return DocumentRepositoryConfigFactory.variablesSchemaFor(model as DocumentRepositoryConfig).onlySensitive();
		} else if (resourceTypes.includes(model.subtype as ResourceType)) {
			return ResourceConfigFactory.variablesSchemaFor(model as ResourceConfig).onlySensitive();
		} else if (taskTypes.includes(model.subtype as TaskType)) {
			return TaskConfigFactory.variablesSchemaFor(model as TaskConfig).onlySensitive();
		} else if (toolTypes.includes(model.subtype as ToolType)) {
			return ToolConfigFactory.variablesSchemaFor(model as ToolConfig).onlySensitive();
		} else if (trackerTypes.includes(model.subtype as TrackerType)) {
			return TrackerConfigFactory.variablesSchemaFor(model as TrackerConfig).onlySensitive();
		} else if (workerTypes.includes(model.subtype as WorkerType)) {
			return WorkerConfigFactory.variablesSchemaFor(model as WorkerConfig).onlySensitive();
		}
		throw new Error(`VariablesSchemaFactory.getCredentialVariablesSchema() unknown subtype ${model.subtype}`);
	}
}
