import { TrackerConfig } from "../../model.js";

interface AsanaVariables {
    api_key?: string;
    status_field?: string
    todo_status?: string
    in_progress_status?: string
    complete_status?: string
}

export interface AsanaConfig extends TrackerConfig {
    variables?: AsanaVariables & Record<string, unknown>;
}


