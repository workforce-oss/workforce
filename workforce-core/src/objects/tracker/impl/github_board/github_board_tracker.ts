import { EmitterWebhookEvent } from "@octokit/webhooks";
import { Logger } from "../../../../logging/logger.js";
import { WebhookEvent } from "../../../../manager/webhook_route_manager.js";
import { GithubService } from "../../../../services/github/service.js";
import { VariablesSchema } from "../../../base/variables_schema.js";
import { Tracker } from "../../base.js";
import { TicketCreateRequest, TicketEvent, TicketStatus, TicketUpdateRequest, TrackerConfig } from "../../model.js";
import { GithubBoardTrackerMetadata } from "./github_board_tracker_metadata.js";

export class GithubBoardTracker extends Tracker<TrackerConfig> {
    logger = Logger.getInstance("GithubBoardTracker");

    // Project ItemV2 is really just not ready for prime time yet
    // We will use legacy project items or issues for now
    // TODO: Refactor this to use legacy project items or issues 
    private githubService: GithubService;

    // TODO: Temporary solution for tracking processed tickets
    // Replace with a database or cache
    private processedTickets = new Set<string>();

    private refreshDaemon: NodeJS.Timeout | undefined;

    constructor(config: TrackerConfig, onFailure: (objectId: string, error: string) => void) {
        super(config, onFailure);
        this.githubService = new GithubService(config.variables?.access_token as string | undefined);

        if (config.webhooksEnabled !== false) {
            this.listenForProjectItemCreatedEvents().then(() => {
                this.logger.debug("listenForProjectItemCreatedEvents() listening for project item created events");
            }).catch((err) => {
                this.logger.error("listenForProjectItemCreatedEvents() error listening for project item created events", err);
                onFailure(config.id!, "Error listening for project item created events");
            });
        } else {
            this.logger.debug("constructor() webhooksEnabled=false");

            // Start the refresh daemon
            this.refreshDaemon = setInterval(() => {
                this.refresh().catch((err) => {
                    this.logger.error("refreshDaemon() error refreshing", err);
                });
            }, Math.max(config.pollingInterval ?? 60000, 5000));
        }
    }

    public static defaultConfig(orgId: string): TrackerConfig {
        return GithubBoardTrackerMetadata.defaultConfig(orgId);
    }

    public async refresh(): Promise<void> { /* eslint-disable @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment */
        if (!this.config.variables?.org_name || !this.config.variables?.project_name) {
            this.logger.error("refresh() missing org_name or project_name");
            return;
        }
        await this.githubService.getAllProjectV2Items({
            orgName: this.config.variables.org_name as string,
            projectName: this.config.variables.project_name as string
        }).then((items) => {
            for (const item of items) {
                if (this.processedTickets.has(item.id)) {
                    continue;
                }
                if (!item.fieldValueByName) {
                    this.logger.error(`refresh() item ${item.id} missing field value by name`);
                    continue;
                }
                const status = this.convertColumnToTicketStatus((item.fieldValueByName as Record<string, unknown>).name as string);
                if (status !== "in-progress") {
                    continue;
                }
                const ticketEvent: TicketEvent = {
                    ticketId: item.id,
                    trackerId: this.config.id!,
                    ticketEventId: "",
                    data: {
                        name: item.content?.title ?? "",
                        description: item.content?.body ?? "",
                        status: status,
                    }
                }

                this.processedTickets.add(item.id);
                this.subject.next(ticketEvent);
            }
        }).catch((err) => {
            this.logger.error("refresh() error getting all project items", err);
        });
    }

    public destroy(): Promise<void> {
        this.githubService.destroy(this.config.orgId, this.config.id!).catch((err) => {
            this.logger.error("destroy() error destroying GithubBoardTracker", err);
        });

        if (this.refreshDaemon) {
            clearInterval(this.refreshDaemon);
        }
        return super.destroy();
    }

    public async createTicket(ticketCreateRequest: TicketCreateRequest): Promise<void> {
        if (!this.config.variables?.org_name || !this.config.variables?.project_name) {
            throw new Error("createTicket() missing org_name or project_name");
        }
        await this.githubService.addProjectV2DraftIssue(
            {
                description: ticketCreateRequest.input.description ?? "",
                title: ticketCreateRequest.input.name,
                projectName: this.config.variables.project_name as string,
                orgName: this.config.variables.org_name as string,
            }
        ).then(async (id) => {
            await this.updateTicket({
                trackerId: this.config.id!,
                ticketUpdateId: "",
                ticketId: id,
                data: {
                    name: ticketCreateRequest.input.name,
                    status: "open",
                }
            }).catch((err) => {
                this.logger.error(`createTicket() error updating ticket ${id} in Project ${this.config.variables!.project_name as string}`, err);
            });
        })
            .catch((err) => {
                this.logger.error(`createTicket() error creating ticket ${ticketCreateRequest.input.name} in Project ${this.config.variables!.project_name as string}`, err);
                throw err;
            })
        this.logger.debug(`createTicket() created ticket ${ticketCreateRequest.input.name} in Project ${this.config.variables.project_name as string}`);
    }

    public async updateTicket(ticketUpdateRequest: TicketUpdateRequest): Promise<void> {
        const orgName = this.config.variables?.org_name as string | undefined;
        const projectName = this.config.variables?.project_name as string | undefined;
        if (!orgName || !projectName) {
            throw new Error("updateTicket() missing org_name or project_name");
        }
        const projectId = await this.githubService.getProjectId({ orgName, projectName });
        await this.githubService.updateProjectV2DraftIssueStatus(
            {
                projectId: String(projectId),
                itemId: ticketUpdateRequest.ticketId,
                status: this.convertTicketStatusToColumn(ticketUpdateRequest.data.status)
            }).catch((err) => {
                this.logger.error(`updateTicket() error updating ticket ${ticketUpdateRequest.ticketId} in Project ${projectName}`, err);
            });
    }

    private async listenForProjectItemCreatedEvents(): Promise<void> {
        await this.githubService.addWebhook(this.config.orgId, this.config.id!, {
            eventTypes: ["projects_v2_item"],
            githubOrgName: this.config.variables?.org_name as string | undefined,
        }, (event: EmitterWebhookEvent<"projects_v2_item">) => {
            const nodeId = event.payload.projects_v2_item.node_id!;
            if (event.payload.action !== "created" && event.payload.action !== "edited" && event.payload.action !== "restored") {
                this.logger.debug(`listenForProjectItemCreatedEvents() ignoring project item ${nodeId} with action ${event.payload.action}`);
                return;
            }
            this.githubService.getProjectV2DraftIssueValues({ itemId: nodeId }).then((projectV2Item) => {
                if (!projectV2Item?.fieldValueByName) {
                    this.logger.error(`listenForProjectItemCreatedEvents() error getting project item ${nodeId}`);
                    return;
                }

                if (projectV2Item.project.title !== this.config.variables?.project_name) {
                    this.logger.debug(`listenForProjectItemCreatedEvents() ignoring project item ${nodeId} with project ${projectV2Item.project.title}. Only monitoring ${this.config.variables!.project_name as string}`);
                    return;
                }
                const projectV2Status = (projectV2Item.fieldValueByName as Record<string, unknown>).name as string;
                if (!this.isMonitoredStatus(projectV2Status )) {
                    this.logger.debug(`listenForProjectItemCreatedEvents() ignoring project item ${nodeId} with status ${projectV2Status}. Only monitoring ${this.config.variables.to_do_column as string} status.`);
                    return;
                }
                const status = this.convertColumnToTicketStatus((projectV2Item.fieldValueByName as Record<string, unknown>).name as string || "Todo");
                const ticketEvent: TicketEvent = {
                    ticketId: nodeId,
                    trackerId: this.config.id!,
                    ticketEventId: event.id,
                    data: {
                        name: projectV2Item.content?.title ?? "",
                        description: projectV2Item.content?.body ?? "",
                        status: status,
                    }
                }
                this.logger.debug(`listenForProjectItemCreatedEvents() emitting ticket event trackerId: ${this.config.id!}, ticketId: ${nodeId}, status: ${status}`);
                this.subject.next(ticketEvent);
            }).catch((err) => {
                this.logger.error(`listenForProjectItemCreatedEvents() error getting project item ${nodeId}`, err);
            });
        })
    }

    async webhookHandler(event: WebhookEvent): Promise<void> {
        await this.githubService.webhookHandler(event);
    }

    private isMonitoredStatus(status: string): boolean {
        return status === this.config.variables?.to_do_column;
    }

    private convertTicketStatusToColumn(status: TicketStatus): string { /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
        switch (status) {
            case "open":
                
                return this.config.variables?.to_do_column as string | undefined || "Todo";
            case "in-progress":
                return this.config.variables?.in_progress_column as string | undefined || "In Progress";
            case "completed":
                return this.config.variables?.done_column as string | undefined || "Done";
            default:
                throw new Error(`Unknown ticket status ${status}`);
        }
    }

    private convertColumnToTicketStatus(column: string): TicketStatus {
        switch (column) {
            case this.config.variables?.to_do_column || "Todo":
                return "open";
            case this.config.variables?.in_progress_column || "In Progress":
                return "in-progress";
            case this.config.variables?.done_column || "Done":
                return "completed";
            default:
                throw new Error(`Unknown column ${column}`);
        }
    }


    static variablesSchema(): VariablesSchema {
        return GithubBoardTrackerMetadata.variablesSchema();
    }
}