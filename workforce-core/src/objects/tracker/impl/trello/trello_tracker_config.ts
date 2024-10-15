import { TrackerConfig } from "../../model.js";

interface TrelloVariables {
    purpose?: string;
    api_key?: string;
    api_token?: string;
    app_secret?: string;
    board_name?: string;
    column_name?: string;
    to_do_column?: string;
    in_progress_column?: string;
    done_column?: string;
    label?: string;
    board_id?: string;
}

export interface TrelloTrackerConfig extends TrackerConfig {
    variables?: TrelloVariables & Record<string, unknown>;
}