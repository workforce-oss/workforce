import { Logger } from "../../../../logging/logger.js";
import { TrelloService } from "../../../../services/trello/trello_service.js";
import { FunctionDocument, FunctionDocuments } from "../../../../util/openapi.js";
import { snakeify } from "../../../../util/snake.js";
import { TicketData } from "../../../tracker/model.js";
import { Tool } from "../../base.js";
import { ToolRequest, ToolResponse } from "../../model.js";
import { TrelloTicketConfig } from "./trello_ticket_config.js";

export class TrelloTicketTool extends Tool<TrelloTicketConfig> {

    logger = Logger.getInstance("TrelloTicketTool");

    private trelloService: TrelloService;
    constructor(config: TrelloTicketConfig, onFailure: (objectId: string, error: string) => void) {
        super(config, onFailure);
        if (!this.config.variables?.api_token || !this.config.variables?.api_key || !this.config.variables?.app_secret) {
            throw new Error("Trello API credentials not configured.");
        }
        this.trelloService = new TrelloService(this.config.variables.api_token, this.config.variables?.api_key, this.config.variables?.app_secret);
    }

    public async execute(request: ToolRequest): Promise<ToolResponse> {
        const ticketCreateRequest = request.toolCall.arguments;
        await this.createTicket(ticketCreateRequest as unknown as TicketData);
        return {
            toolId: this.config.id!,
            requestId: request.requestId,
            taskExecutionId: request.taskExecutionId,
            timestamp: Date.now(),
            success: true,
            machine_message: "Ticket created successfully.",
        };
    }


    private async createTicket(data: TicketData): Promise<void> {
        if (!this.config.variables?.board_name || !this.config.variables?.column_name || !this.config.variables?.label) {
            throw new Error("Trello board name, column name, or label not configured.");
        }
        await this.trelloService.createCard(
            data.name,
            data.description ?? "",
            this.config.variables.board_name,
            this.config.variables.column_name,
            [this.config.variables.label]);
        return;
    }

    initSession(): Promise<void> {
        return Promise.resolve();
    }
    getTaskOutput(): Promise<string | undefined> {
        return Promise.resolve(undefined);
    }
    public destroy(): Promise<void> {
        return Promise.resolve();
    }
    public workCompleteCallback(): Promise<void> {
        return Promise.resolve();
    }
    public schema(): Promise<FunctionDocuments> {
        const document: FunctionDocument = {
            name: `create_${snakeify(this.config.name)}`,
            description: this.config.variables?.purpose,
            summary: "Create a Trello ticket.",
            parameters: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        description: "The name of the ticket.",
                    },
                    description: {
                        type: "string",
                        description: "The description of the ticket.",
                    },
                },
                required: ["name", "description"],
            }
        
        }
        return Promise.resolve({
            "functions": [document]
        });
    }
    public validateObject(): Promise<boolean> {
        return Promise.resolve(true);
    }
}