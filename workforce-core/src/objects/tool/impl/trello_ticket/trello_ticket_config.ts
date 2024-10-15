import { ToolConfig } from "../../model.js";

interface TrelloVariables {
    purpose?: string;
    api_key?: string;
    api_token?: string;
    app_secret?: string;
    board_name?: string;
    column_name?: string;
    label?: string;
}

export interface TrelloTicketConfig extends ToolConfig {
    variables?: TrelloVariables & Record<string, unknown>;
}