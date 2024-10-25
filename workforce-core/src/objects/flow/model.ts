import { ChannelConfig } from "../channel/model.js";
import { DocumentationConfig } from "../documentation/model.js";
import { ResourceConfig } from "../resource/model.js";
import { TaskConfig } from "../task/model.js";
import { ToolConfig } from "../tool/model.js";
import { TrackerConfig } from "../tracker/model.js";

export interface FlowConfig {
    id?: string;
    name: string;
    description: string;
    orgId: string;
    status: "active" | "inactive";

    channels?: ChannelConfig[];
    documentation?: DocumentationConfig[];
    resources?: ResourceConfig[];
    tasks?: TaskConfig[];
    tools?: ToolConfig[];
    trackers?: TrackerConfig[];
}

export const flowObjectTypes = ["channel", "documentation", "resource", "task", "tool", "tracker"];