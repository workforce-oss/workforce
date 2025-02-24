import { TrackerConfig } from "../../model.js";

interface AsanaVariables {
    client_id?: string
    client_secret?: string
    workspace?: string
    project_id?: string
    todo_section?: string
    in_progress_section?: string
    complete_section?: string
}

export interface AsanaConfig extends TrackerConfig {
    variables?: AsanaVariables & Record<string, unknown>;
}


