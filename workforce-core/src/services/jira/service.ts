import JiraApi, { IssueObject } from "jira-client";

export class JiraService {
    private client: JiraApi;

    constructor(authData: {
        host: string,
        username: string,
        password: string
    }) {
        this.client = new JiraApi({
            protocol: "https",
            host: authData.host,
            username: authData.username,
            password: authData.password,
            apiVersion: "2",
            strictSSL: true
        });
    }

    async createIssue(project: string, issueType: string, summary: string, description: string): Promise<string> {
        const issue: IssueObject = {
            fields: {
                project: {
                    key: project
                },
                summary,
                description,
                issuetype: {
                    name: issueType
                }
            }
        };
        const createdIssue = await this.client.addNewIssue(issue);
        return createdIssue.key as string;
    }
}