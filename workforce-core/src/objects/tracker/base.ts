import { Logger } from "../../logging/logger.js";
import { WebhookEvent, WebhookRouteManager } from "../../manager/webhook_route_manager.js";
import { FunctionParameters } from "../../util/openapi.js";
import { BaseObject } from "../base/base.js";
import { TrackerConfig, TicketEvent, TicketCreateRequest, TicketUpdateRequest } from "./model.js";
import { Subject, Subscription } from "rxjs";

export abstract class Tracker<TConfig extends TrackerConfig> extends BaseObject<TConfig> {
    subject = new Subject<TicketEvent>();
    logger = Logger.getInstance("Tracker");

    constructor(config: TConfig, onFailure: (objectId: string, error: string) => void) {
        super(config, onFailure);
        if (config.webhooksEnabled) {
            this.registerWebhookHandler(config.orgId, config.id!).then(() => {
                this.logger.debug(`registerWebhookHandler() orgId=${config.orgId} id=${config.id}`);
            }).catch((err) => {
                this.logger.error(`registerWebhookHandler() orgId=${config.orgId} id=${config.id} err=${err}`);
                onFailure(config.id!, "Error registering webhook handler");
            });
        } else {
            this.logger.debug(`constructor() type=${config.type} webhooksEnabled=false`)
        }
    }

    public destroy(): Promise<void> {
        this.subject.complete();
        return Promise.resolve();
    }


    createTicket(ticketCreateRequest: TicketCreateRequest): Promise<void>;


    createTicket(): Promise<void> {
        throw new Error("Tracker.createTicket() not implemented");
    }

    updateTicket(ticketUpdateRequest: TicketUpdateRequest): Promise<void>;

    updateTicket(): Promise<void> {
        throw new Error("Tracker.updateTicket() not implemented");
    }

    refresh(): Promise<void> {
        throw new Error("Tracker.refresh() not implemented");
    }

    watch(callback: (ticketEvent: TicketEvent) => void): Promise<Subscription> {
        return Promise.resolve(this.subject.subscribe({
            next: callback,
            error: (err) => {
                this.logger.error(`watch() error=${err}`);
            }
        }))
    }

    public abstract webhookHandler(event: WebhookEvent): Promise<void>;
    public async registerWebhookHandler(orgId: string, resourceId: string) {
        const routeManager = await WebhookRouteManager.getInstance();
        routeManager.addRoute({
            path: `/${orgId}/${resourceId}`,
            orgId,
            objectId: resourceId,
        });
        routeManager.subscribeToWebhookEvents(orgId, resourceId, `/${orgId}/${resourceId}`, (event) => {
            this.webhookHandler(event).catch((err) => {
                this.logger.error(`webhookHandler() error=${err}`);
            });
        });
    }

    public schema(): Promise<Record<string, FunctionParameters>> {
        return Promise.resolve({
            "tickets": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string",
                            "description": "The name of the ticket"
                        },
                        "description": {
                            "type": "string",
                            "description": "The description of the ticket"
                        },
                    },
                    "required": ["name"],
                },
            },
        });
    }

    public topLevelObjectKey(): string {
        return "tickets";
    }

    public async validateObject(objectArray: unknown): Promise<boolean> {
        const schema = await this.schema();
        const itemSchema = schema.tickets.items;

        // check if objectArray is an array
        if (!Array.isArray(objectArray)) {
            return false;
        }

        // check if each item in objectArray is an object
        for (const item of objectArray) {
            if (typeof item !== "object") {
                return false;
            }
        }

        // check if each item in objectArray has the required properties
        if (itemSchema?.required && itemSchema.required.length === 0) {
            for (const item of objectArray) {
                for (const key of itemSchema.required) {
                    if (!(key in item)) {
                        return false;
                    }
                }
            }
        }

        return true;

    }
}