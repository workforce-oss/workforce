import { Logger } from "../../../../logging/logger.js";
import { GithubService } from "../../../../services/github/service.js";
import { FunctionDocument, FunctionDocuments } from "../../../../util/openapi.js";
import { snakeify } from "../../../../util/snake.js";
import { TicketData } from "../../../tracker/model.js";
import { Tool } from "../../base.js";
import { ToolRequest, ToolResponse } from "../../model.js";
import { GithubBoardTicketConfig } from "./github_board_ticket_config.js";

export class GithubBoardTicketTool extends Tool<GithubBoardTicketConfig> {
    logger = Logger.getInstance("GithubBoardTicketTool");

    private githubService: GithubService;
    constructor(config: GithubBoardTicketConfig) {
        super(config, () => undefined);
        this.logger.debug(`constructor() config=${JSON.stringify(config, null, 2)}`)
        this.githubService = new GithubService(config.variables?.access_token, true);
    }

    public async execute(request: ToolRequest): Promise<ToolResponse> {
        const ticketCreateRequest = request.toolCall.arguments as unknown as  TicketData;
        try {
            await this.createTicket(ticketCreateRequest);
            return {
                toolId: this.config.id!,
                requestId: request.requestId,
                taskExecutionId: request.taskExecutionId,
                timestamp: Date.now(),
                success: true,
                machine_message: "Ticket created successfully.",
            };
        } catch (err) {
            this.logger.error(`execute() error creating ticket ${ticketCreateRequest.name} in Project ${this.config.variables?.project_name}`, err);
            return {
                toolId: this.config.id!,
                requestId: request.requestId,
                taskExecutionId: request.taskExecutionId,
                timestamp: Date.now(),
                success: false,
                machine_message: "Error creating ticket.",
            };
        }
    }

    private async createTicket(data: TicketData): Promise<void> {
        if (!this.config.variables?.project_name) {
            throw new Error("Project name is required.");
        }

        if (!this.config.variables?.org_name) {
            throw new Error("Org name is required.");
        }
        await this.githubService.addProjectV2DraftIssue(
            {
                description: data.description ?? "",
                title: data.name,
                projectName: this.config.variables.project_name,
                orgName: this.config.variables.org_name

            }
        ).then(async (ticketId: string) => {
            const projectId = await this.githubService.getProjectId({ orgName: this.config.variables!.org_name!, projectName: this.config.variables!.project_name! });

            const columnName = this.config.variables?.column_name;

            await this.githubService.updateProjectV2DraftIssueStatus(
                {
                    projectId: String(projectId),
                    itemId: ticketId,
                    status: columnName ?? "Todo"
                }).catch((err) => {
                    this.logger.error(`updateTicket() error updating ticket ${ticketId} in Project ${this.config.variables!.project_name!}`, err);
                });
        }).catch((err) => {
            this.logger.error(`createTicket() error creating ticket ${data.name} in Project ${this.config.variables!.project_name!}`, err);
            throw err;
        });
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
            summary: "Create a Github Board ticket.",
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