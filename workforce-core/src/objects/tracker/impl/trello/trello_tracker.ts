import { Configuration } from "../../../../config/configuration.js";
import { Logger } from "../../../../logging/logger.js";
import { WebhookEvent } from "../../../../manager/webhook_route_manager.js";
import { VariablesSchema } from "../../../base/variables_schema.js";
import { Tracker } from "../../base.js";
import { TicketCreateRequest, TicketStatus, TicketUpdateRequest, TrackerConfig } from "../../model.js";
import { TrelloActionType, TrelloEvent } from "../../../../services/trello/trello_model.js";
import { TrelloService } from "../../../../services/trello/trello_service.js";
import { TrelloTrackerMetadata } from "./trello_tracker_metadata.js";
import { TrelloTrackerConfig } from "./trello_tracker_config.js";

export class TrelloTracker extends Tracker<TrelloTrackerConfig> {
    logger = Logger.getInstance("TrelloTracker");
    private handledEvents = new Set<TrelloActionType>([
        "createCard",
        "updateCard",
        // "deleteCard",
        // "addAttachmentToCard",
        "addLabelToCard",
        // "addMemberToCard",
        // "commentCard",
    ])

    private trelloService: TrelloService;
    constructor(config: TrelloTrackerConfig, onFailure: (objectId: string, error: string) => void) {
        super(config, onFailure);
        
        if (!this.config.variables?.api_token || !this.config.variables?.api_key || !this.config.variables?.app_secret || !this.config.variables?.board_name || !this.config.variables?.board_id || !this.config.variables?.label) {
            throw new Error("Missing required variables: api_token, api_key, app_secret, board_name, board_id, label");
        }

        this.trelloService = new TrelloService(this.config.variables.api_token, this.config.variables?.api_key, this.config.variables?.app_secret);
        this.trelloService.addWebhook(this.config.variables?.board_name, `${Configuration.BaseUrl}/${this.config.orgId}/${this.config.id}`, this.config.id!)
        .then(() => {
            this.logger.debug(`addWebhook() orgId=${this.config.orgId} id=${this.config.id}`);
        }).catch((err) => {
            this.logger.error(`addWebhook() orgId=${this.config.orgId} id=${this.config.id} err=${err}`);
            onFailure(config.id!, "Error adding webhook");
        });
    }

    public static defaultConfig(orgId: string): TrackerConfig {
        return TrelloTrackerMetadata.defaultConfig(orgId);
    }

    async createTicket(ticketCreateRequest: TicketCreateRequest): Promise<void> {
        await this.trelloService.createCard(
            ticketCreateRequest.input.name,
            ticketCreateRequest.input.description ?? "",
            this.config.variables!.board_id!,
            this.config.variables!.to_do_column ?? "To Do",
            [this.config.variables!.label!]);
        return;
    }

    async refresh(): Promise<void> {
        // Nothing to do here since we are using webhooks
    }

    public async destroy(): Promise<void> {
        await this.trelloService.destroy()
    }

    async updateTicket(ticketUpdateRequest: TicketUpdateRequest): Promise<void> {
        const status = this.ticketStatusToTrackerStatus(ticketUpdateRequest.data.status);
        await this.trelloService.updateCard(
            ticketUpdateRequest.ticketId,
            ticketUpdateRequest.data.name,
            ticketUpdateRequest.data.description ?? "",
            this.config.variables!.board_name!,
            status,
            [this.config.variables!.label!])
    }

    private ticketStatusToTrackerStatus(ticketStatus: TicketStatus): string {/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
        switch (ticketStatus) {
            case "ready":
                
                return this.config.variables?.to_do_column || "To Do";
            case "in-progress":
                return this.config.variables?.in_progress_column || "In Progress";
            case "completed":
                return this.config.variables?.done_column || "Done";
            default:
                return "";
        }
    }

    public async webhookHandler(event: WebhookEvent): Promise<void> {
        const valid = this.trelloService.verifyTrelloWebhook(event, this.config.id!);
        if (!valid) {
            this.logger.warn(`Invalid webhook event received for tracker ${this.config.name} with id ${this.config.id}`);
            return;
        }
        const trelloEvent = event.body as TrelloEvent;
        if (!this.handledEvents.has(trelloEvent.action.type)) {
            this.logger.warn(`Unhandled event type ${trelloEvent.action.type} received for tracker ${this.config.name} with id ${this.config.id}`);
            return;
        }
        const ticketId = trelloEvent.action.data.card?.id;
        if (!ticketId) {
            this.logger.warn(`No ticket id found in event for tracker ${this.config.name} with id ${this.config.id}`);
            return;
        }
        const currentTicket = await this.trelloService.getCard(this.config.variables!.board_name!, ticketId);
        if (!currentTicket) {
            this.logger.warn(`Unable to find ticket with id ${ticketId} for tracker ${this.config.name} with id ${this.config.id}`);
            return;
        }
        const hasLabel = await this.trelloService.cardHasLabel(this.config.variables!.board_name!, this.config.variables!.label!, currentTicket);
        if (!hasLabel) {
            this.logger.debug(`Ticket with id ${ticketId} for tracker ${this.config.name} with id ${this.config.id} does not have the label ${this.config.variables?.label}`);
            return;
        }
        const inTodoColumn = await this.trelloService.cardInColumn(this.config.variables!.board_name!, this.config.variables!.to_do_column!, currentTicket);
        if (!inTodoColumn) {
            this.logger.debug(`Ticket with id ${ticketId} for tracker ${this.config.name} with id ${this.config.id} is not in the to do column`);
            return;
        }

        this.subject.next({
            trackerId: this.config.id!,
            ticketId: ticketId,
            ticketEventId: trelloEvent.action.id,
            data: {
                status: "ready",
                name: currentTicket.name,
                description: currentTicket.desc,
                url: currentTicket.url,
            }
        });
    }

    static variablesSchema(): VariablesSchema {
        return TrelloTrackerMetadata.variablesSchema();
    }
}