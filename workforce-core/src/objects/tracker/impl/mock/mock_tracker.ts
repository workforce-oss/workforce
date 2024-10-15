import { Logger } from "../../../../logging/logger.js";
import { VariablesSchema } from "../../../base/variables_schema.js";
import { Tracker } from "../../base.js";
import { TicketCreateRequest, TicketData, TicketUpdateRequest, TrackerConfig } from "../../model.js";
import { MockTrackerMetadata } from "./mock_tracker_metadata.js";

export class MockTracker extends Tracker<TrackerConfig> {
    
    logger = Logger.getInstance("MockTracker");
    
    constructor(config: TrackerConfig) {
        super(config, () => undefined);
    }

    public static defaultConfig(orgId: string): TrackerConfig {
        return MockTrackerMetadata.defaultConfig(orgId);
    }

    private data: TicketData = {
        name: "mock-ticket-name",
        status: "ready",
    };

    

    async createTicket(ticketCreateRequest: TicketCreateRequest): Promise<void> {
        this.data = ticketCreateRequest.input;
        return Promise.resolve();
    }

    async updateTicket(ticketUpdateRequest: TicketUpdateRequest): Promise<void> {
        this.data = {
            ...this.data,
            ...ticketUpdateRequest.data,
        }
        this.subject.next({
            trackerId: this.config.id!,
            ticketId: "mock-ticket-id",
            ticketEventId: "mock-ticket-event-id",
            data: this.data,
        });
        return Promise.resolve();
    }

    refresh(): Promise<void> {
        this.subject.next({
            trackerId: this.config.id!,
            ticketId: "mock-ticket-id",
            ticketEventId: "mock-ticket-event-id",
            data: this.data,
        });
        return Promise.resolve();
        
    }

    public webhookHandler(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    static variablesSchema(): VariablesSchema {
        return MockTrackerMetadata.variablesSchema();
    }
}