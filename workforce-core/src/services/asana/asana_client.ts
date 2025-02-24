import { Client, resources } from "asana"


export class AsanaClient {
    client: Client;
    workspace: string;
    constructor(clientId: string, clientSecret: string, workspace: string) {
        this.client = Client.create({
            clientId,
            clientSecret,
        })
        this.workspace = workspace;
    }


    async listProjects(): Promise<resources.ResourceList<resources.Projects.Type>> {
        return await this.client.projects.findAll({
            workspace: this.workspace,
        })
    }
}