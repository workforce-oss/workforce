import { VariablesSchema } from "../../base/variables_schema.js";
import { CodingToolMetadata } from "../impl/coding/coding_tool_metadata.js";
import { ExcalidrawToolMetadata } from "../impl/excalidraw/excalidraw_tool_metdata.js";
import { GithubBoardTicketMetadata } from "../impl/github_board_ticket/github_board_ticket_metadata.js";
import { GoogleDriveToolMetadata } from "../impl/google_drive/google_drive_tool_metadata.js";
import { GoogleSlidesToolMetadata } from "../impl/google_slides/google_slides_tool_metadata.js";
import { MessageChannelToolMetadata } from "../impl/message_channel/message_channel_metadata.js";
import { MockToolMetadata } from "../impl/mock/mock_tool_metadata.js";
import { OpenAPIToolMetadata } from "../impl/openapi/openapi_tool_metadata.js";
import { OpenAPIChannelToolMetadata } from "../impl/openapi_channel/openapi_channel_tool_metadata.js";
import { TemplateToolMetadata } from "../impl/template/template_tool_metadata.js";
import { TrelloTicketToolMetadata } from "../impl/trello_ticket/trello_ticket_tool_metadata.js";
import { WebServiceToolMetadata } from "../impl/webservice/web_service_tool_metadata.js";
import { ToolConfig } from "../model.js";

export class ToolConfigFactory {
    static variablesSchemaFor(config: ToolConfig): VariablesSchema {
        switch (config.subtype) {
            case "mock":
                return MockToolMetadata.variablesSchema();
            case "web-service-tool":
                return WebServiceToolMetadata.variablesSchema();
            case "template-tool":
                return TemplateToolMetadata.variablesSchema();
            case "openapi-tool":
                return OpenAPIToolMetadata.variablesSchema();
            case "openapi-channel-tool":
                return OpenAPIChannelToolMetadata.variablesSchema();
            case "excalidraw-tool":
                return ExcalidrawToolMetadata.variablesSchema();
            case "google-drive-tool":
                return GoogleDriveToolMetadata.variablesSchema();
            case "google-slides-tool":
                return GoogleSlidesToolMetadata.variablesSchema();
            case "coding-tool":
                return CodingToolMetadata.variablesSchema();
            case "trello-ticket-tool":
                return TrelloTicketToolMetadata.variablesSchema();
            case "github-board-ticket-tool":
                return GithubBoardTicketMetadata.variablesSchema();
            case "message-channel-tool":
                return MessageChannelToolMetadata.variablesSchema();
            default:
                throw new Error(`ToolFactory.variablesSchemaFor() unknown tool type ${config.subtype as string}`);
        }
    }

    static defaultConfigFor(orgId: string, subtype: string): ToolConfig {
        switch (subtype) {
            case "mock":
                return MockToolMetadata.defaultConfig(orgId);
            case "web-service-tool":
                return WebServiceToolMetadata.defaultConfig(orgId);
            case "template-tool":
                return TemplateToolMetadata.defaultConfig(orgId);
            case "openapi-tool":
                return OpenAPIToolMetadata.defaultConfig(orgId);
            case "openapi-channel-tool":
                return OpenAPIChannelToolMetadata.defaultConfig(orgId);
            case "excalidraw-tool":
                return ExcalidrawToolMetadata.defaultConfig(orgId);
            case "google-drive-tool":
                return GoogleDriveToolMetadata.defaultConfig(orgId);
            case "google-slides-tool":
                return GoogleSlidesToolMetadata.defaultConfig(orgId);
            case "coding-tool":
                return CodingToolMetadata.defaultConfig(orgId);
            case "trello-ticket-tool":
                return TrelloTicketToolMetadata.defaultConfig(orgId);
            case "github-board-ticket-tool":
                return GithubBoardTicketMetadata.defaultConfig(orgId);
            case "message-channel-tool":
                return MessageChannelToolMetadata.defaultConfig(orgId);
            default:
                throw new Error(`ToolFactory.defaultConfigFor() unknown tool type ${subtype}`);
        }
    }
}