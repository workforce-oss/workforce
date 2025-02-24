import { Logger } from "../../../../logging/logger.js";
import { AsanaService } from "../../../../services/asana/asana_service.js";
import { Tracker } from "../../base.js";
import { TicketCreateRequest, TicketStatus, TicketUpdateRequest } from "../../model.js";
import { AsanaConfig } from "./asana_tracker_config.js";
import { randomUUID } from "crypto";

export class AsanaTracker extends Tracker<AsanaConfig> {
    logger = Logger.getInstance("AsanaTracker");
    pollingDaemon?: NodeJS.Timeout;
    lastChecked: Date = new Date();
    asanaService: AsanaService;
    onFailure: (objectId: string, error: string) => void; 

    public webhookHandler(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    constructor(config: AsanaConfig, onFailure: (objectId: string, error: string) => void) {
        super(config, onFailure);
        if (!this.config.variables?.client_id || !this.config.variables?.client_secret || !this.config.variables?.workspace) {
            throw new Error("Missing required variables: client_id, client_secret, workspace");
        }
        this.asanaService = new AsanaService(this.config.variables.client_id, this.config.variables.client_secret, this.config.variables.workspace);
        this.onFailure = onFailure;
       
        if (!this.config.webhooksEnabled) {
            this.poll();
        }
    }

    public async refresh(): Promise<void> {
        try {
            const tickets = await this.asanaService.getNewTickets(this.config.variables?.project_id, this.mapTicketStatus.bind(this), this.lastChecked);
            this.lastChecked = new Date();
            tickets.forEach(ticket => {
                this.subject.next({
                    data: ticket.data,
                    ticketId: ticket.ticketId,
                    trackerId: this.config.id!,
                    ticketEventId: randomUUID(),
                });
            });
        } catch (e) {
            if (this.pollingDaemon) {
                clearInterval(this.pollingDaemon);
            }
            this.onFailure(this.config.id!, "Error polling Asana");
            this.logger.error("Error polling Asana", e);
        }
    }

    public async createTicket(ticketCreateRequest: TicketCreateRequest): Promise<void> {
        await this.asanaService.addTicket(ticketCreateRequest, this.config.variables?.project_id, this.config.variables?.todo_section);
    }

    public async updateTicket(ticketUpdateRequest: TicketUpdateRequest): Promise<void> {
        await this.asanaService.updateTicket(ticketUpdateRequest, this.config.variables?.project_id, this.config.variables?.in_progress_section);
    }


    public destroy(): Promise<void> {
        if (this.pollingDaemon) {
            clearInterval(this.pollingDaemon);
        }
        return super.destroy();
    }

    private poll(): void {
        if (this.pollingDaemon) {
            clearInterval(this.pollingDaemon);
        }
        this.pollingDaemon = setInterval(() => {
            this.refresh().catch(e => {
                this.logger.error("Error polling Asana", e);
            });
        }, this.config.pollingInterval ?? 60000);
    
    }

    public mapTicketStatus(status?: string | null): TicketStatus {
        if (!status) {
            return "unknown"
        }

        switch (status) {
            case this.config.variables?.todo_status:
                return "ready"
            case this.config.variables?.in_progress_status:
                return "in-progress"
            case this.config.variables?.complete_status:
                return "completed"
            default:
                return "open"
        }
    }

}