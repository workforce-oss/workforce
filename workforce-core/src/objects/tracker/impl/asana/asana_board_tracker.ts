import { Logger } from "../../../../logging/logger.js";
import { Tracker } from "../../base.js";
import { TicketStatus } from "../../model.js";
import { AsanaConfig } from "./asana_tracker_config.js";

export class AsanaTracker extends Tracker<AsanaConfig> {
    logger = Logger.getInstance("AsanaTracker");
    pollingDaemon?: NodeJS.Timeout;
    lastChecked: Date = new Date()

    public webhookHandler(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    constructor(config: AsanaConfig, onFailure: (objectId: string, error: string) => void) {
        super(config, onFailure);
    }

    public mapTicketStatus(status?: string | null): TicketStatus {
        if (!status) {
            return "unknown"
        }

        switch (status) {
            case this.config.variables?.todo_status:
                return "ready"
            case this.config.variables?.in_progress_status:
                return "in-progress"
            case this.config.variables?.complete_status:
                return "completed"
            default:
                return "open"
        }
    }

}