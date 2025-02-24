import { Client } from "asana";
import { Ticket, TicketCreateRequest, TicketStatus, TicketUpdateRequest } from "../../objects/tracker/model.js";

export class AsanaService {
    client: Client;
    workspace: string;
    constructor(clientId: string, clientSecret: string, workspace: string) {
        this.client = Client.create({
            clientId,
            clientSecret,
        })
        this.workspace = workspace;
    }
    async addTicket(ticket: TicketCreateRequest, projectId: string, statusKey: string, status: string): Promise<void> {
        await this.client.tasks.create({
            workspace: this.workspace,
            name: ticket.input.name,
            projects: [projectId],
            notes: ticket.input.description,
            custom_fields: {
                [statusKey]: status
            }
        })
    }

    async updateTicket(ticket: TicketUpdateRequest, statusKey: string, status: string): Promise<void> {
        await this.client.tasks.update(ticket.ticketId, {
            custom_fields: {
                [statusKey]: status,
            }
        })
    }

    async getNewTickets(projectId: string, statusKey: string, statusMapFunc: (status?: string | null) => TicketStatus, lastFetched?: Date): Promise<Ticket[]> {
        const results = await this.client.tasks.findAll({
            project: projectId,
            modified_since: lastFetched?.toISOString()
        })
        return results.data.map(task => {
            const statusField = task.custom_fields.filter(t => t.name == statusKey);
            if (statusField.length < 1) {
                return undefined
            }
            return {
                ticketId: task.gid,
                status: statusMapFunc(statusField[0].display_value),
                data: {
                    name: task.name,
                    description: task.notes,
                }
            } as Ticket
        }).filter(r => r !== undefined);
    }
}