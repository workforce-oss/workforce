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
    async addTicket(ticket: TicketCreateRequest, projectId?: string, status?: string): Promise<void> {
        if (!projectId) {
            throw new Error("Project ID not set")
        }
        if (!status) {
            throw new Error("Status not set")
        }
        const sectionGid = await this.getSectionGid(projectId, status)
        await this.client.tasks.create({
            workspace: this.workspace,
            name: ticket.input.name,
            projects: [projectId],
            notes: ticket.input.description,
            memberships: [{
                project: projectId,
                section: sectionGid
            }],
        })
    }

    async getSectionGid(projectId: string, sectionName: string): Promise<string> {
        const sections = await this.client.sections.findByProject(projectId, {
            opt_fields: "name"
        })
        const section = sections.find(s => s.name === sectionName)
        if (!section) {
            throw new Error(`Section ${sectionName} not found in project ${projectId}`)
        }
        return section.gid
    }

    async updateTicket(ticket: TicketUpdateRequest, projectId?: string, status?: string): Promise<void> {
        if (!projectId) {
            throw new Error("Project ID not set")
        }
        if (!status) {
            throw new Error("Status not set")
        }
        
        const sectionGid = await this.getSectionGid(projectId, status)
        await this.client.sections.addTask(sectionGid, {
            task: ticket.ticketId,
        })
    }

    async getNewTickets(projectId: string | undefined, statusMapFunc: (status?: string | null) => TicketStatus, lastFetched?: Date): Promise<Ticket[]> {
        if (!projectId) {
            throw new Error("Project ID not set")
        }
        const results = await this.client.tasks.findAll({
            project: projectId,
            modified_since: lastFetched?.toISOString()
        })
        return results.data.map(task => {
            return {
                ticketId: task.gid,
                status: statusMapFunc(task.memberships[0].section?.name),
                data: {
                    name: task.name,
                    description: task.notes,
                }
            } as Ticket
        }).filter(r => r !== undefined);
    }
}