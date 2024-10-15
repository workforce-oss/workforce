import { ToolConfig } from '../../model.js';

interface GithubBoardVariables {
    purpose?: string;
    org_name?: string;
    project_name?: string;
    column_name?: string;
    access_token?: string;
}

export interface GithubBoardTicketConfig extends ToolConfig {
    variables?: GithubBoardVariables & Record<string, unknown>;
}