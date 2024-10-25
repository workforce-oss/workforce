import { Tool } from "../base.js";
import { CodingTool } from "../impl/coding/coding_tool.js";
import { ExcalidrawTool } from "../impl/excalidraw/excalidraw_tool.js";
import { GithubBoardTicketTool } from "../impl/github_board_ticket/github_board_ticket.js";
import { GoogleDriveTool } from "../impl/google_drive/google_drive_tool.js";
import { GoogleSlidesTool } from "../impl/google_slides/google_slides_tool.js";
import { MessageChannelTool } from "../impl/message_channel/message_channel.js";
import { MockTool } from "../impl/mock/mock_tool.js";
import { OpenAPITool } from "../impl/openapi/openapi_tool.js";
import { OpenAPIChannelTool } from "../impl/openapi_channel/openapi_channel_tool.js";
import { TemplateTool } from "../impl/template/template_tool.js";
import { TrelloTicketTool } from "../impl/trello_ticket/trello_ticket_tool.js";
import { WebServiceTool } from "../impl/webservice/web_service_tool.js";
import { ToolConfig } from "../model.js";

export class ToolFactory {
  static create(config: ToolConfig, onFailure: (objectId: string, error: string) => void): Tool<ToolConfig> {
    switch (config.type) {
      case "mock-tool":
        return new MockTool(config, onFailure);
      case "web-service-tool":
        return new WebServiceTool(config, onFailure);
      case "template-tool":
        return new TemplateTool(config, onFailure);
      case "openapi-tool":
        return new OpenAPITool(config, onFailure);
      case "openapi-channel-tool":
        return new OpenAPIChannelTool(config, onFailure);
      case "excalidraw-tool":
        return new ExcalidrawTool(config, onFailure);
      case "coding-tool":
        return new CodingTool(config);
      case "google-drive-tool":
        return new GoogleDriveTool(config, onFailure);
      case "google-slides-tool":
        return new GoogleSlidesTool(config, onFailure);
      case "trello-ticket-tool":
        return new TrelloTicketTool(config, onFailure);
      case "github-board-ticket-tool":
        return new GithubBoardTicketTool(config);
      case "message-channel-tool":
        return new MessageChannelTool(config, onFailure);
      default:
        throw new Error(
          `ToolFactory.create() unknown tool type ${config.type as string}`
        );
    }
  }
}
