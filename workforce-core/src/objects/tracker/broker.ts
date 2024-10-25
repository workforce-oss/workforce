import { Subject, Subscription } from "rxjs";
import { BaseBroker, BrokerConfig } from "../base/broker.js";
import { Ticket, TicketCreateRequest, TicketEvent, TicketUpdateRequest, TrackerConfig } from "./model.js";
import { SubjectFactory } from "../../manager/impl/subject_factory.js";
import { Logger } from "../../logging/logger.js";
import { Tracker } from "./base.js";
import { TicketRequestDb } from "./db.ticket_request.js";
import { randomUUID } from "crypto";
import { jsonStringify } from "../../util/json.js";
import { TicketDb } from "./db.ticket.js";
import { ObjectType } from "../base/factory/types.js";

export class TrackerBroker extends BaseBroker<TrackerConfig, Tracker<TrackerConfig>, object> {
    objectType: ObjectType = "tracker";
    logger = Logger.getInstance("TrackerBroker")

    private createSubject = new Subject<TicketCreateRequest>();
    private updateSubject = new Subject<TicketUpdateRequest>();
    private ticketEventSubject = new Subject<TicketEvent>();
    private trackerTicketEventSubjects = new Map<string, Subject<TicketEvent>>();
    private watches = new Map<string, Subscription>();

    constructor(config: BrokerConfig, createSubject?: Subject<TicketCreateRequest>, ticketEventSubject?: Subject<TicketEvent>) {
        super(config);
        if (createSubject) {
            this.createSubject = createSubject;
        }
        if (ticketEventSubject) {
            this.ticketEventSubject = ticketEventSubject;
        }

        this.createSubject.subscribe({
            next: this.handleCreate.bind(this),
            error: (error: Error) => {
                this.logger.error(`constructor() error handling create error=${error}`);
            }
        });
        this.updateSubject.subscribe({
            next: this.handleUpdate.bind(this),
            error: (error: Error) => {
                this.logger.error(`constructor() error handling update error=${error}`);
            }
        });
        this.ticketEventSubject.subscribe({
            next: this.handleTicketEvent.bind(this),
            error: (error: Error) => {
                this.logger.error(`constructor() error handling ticket event error=${error}`);
            }
        });
    }

    static async create(config: BrokerConfig): Promise<TrackerBroker> {
        const { mode } = config;
        const createSubject = await SubjectFactory.createSubject<TicketCreateRequest>({ channel: "tracker.ticket.create", mode });
        const ticketEventSubject = await SubjectFactory.createSubject<TicketEvent>({ channel: "tracker.ticket.event", mode });
        return new TrackerBroker(config, createSubject, ticketEventSubject);
    }

    async register(tracker: Tracker<TrackerConfig>): Promise<void> {
        await super.register(tracker);
        const subject = new Subject<TicketEvent>();

        if (this.trackerTicketEventSubjects.has(tracker.config.id!)) {
            this.trackerTicketEventSubjects.get(tracker.config.id!)?.unsubscribe();
            this.trackerTicketEventSubjects.delete(tracker.config.id!);
        }
        this.trackerTicketEventSubjects.set(tracker.config.id!, subject);
        await this.manageWatches(tracker);
    }

    handleCreate(request: TicketCreateRequest): void {
        if (this.objects.has(request.trackerId)) {
            this.logger.debug(`handleCreate() Creating ticket in tracker ${request.trackerId}`);
            TicketRequestDb.create({
                id: randomUUID(),
                trackerId: request.trackerId,
                status: "started",
                timestamp: Date.now(),
                type: "create",
                data: jsonStringify(request),
            }).then((db) => {
                this.objects.get(request.trackerId)?.createTicket(request).then(() => {
                    db.status = "completed";
                    db.save().catch((err) => {
                        this.logger.error(`handleCreate() Error saving create request for tracker ${request.trackerId}`, err);
                    });
                    this.objects.get(request.trackerId)?.refresh().catch((err) => {
                        this.logger.error(`handleCreate() Error refreshing tracker ${request.trackerId}`, err);
                    });
                })
                    .catch((err) => {
                        db.status = "error";
                        db.save().catch((err) => {
                            this.logger.error(`handleCreate() Error saving create request for tracker ${request.trackerId}`, err);
                        });
                        this.logger.error(`handleCreate() Error creating ticket in tracker ${request.trackerId}`, err);
                    })
            }).catch((err) => {
                this.logger.error(`handleCreate() Error saving create request for tracker ${request.trackerId}`, err);
            });
        } else {
            this.logger.error(`handleCreate() Tracker ${request.trackerId} not found`);
        }
    }

    handleUpdate(request: TicketUpdateRequest): void {
        if (this.objects.has(request.trackerId)) {
            this.logger.debug(`handleUpdate() Updating ticket in tracker ${request.trackerId}`);
            TicketRequestDb.create({
                id: randomUUID(),
                trackerId: request.trackerId,
                status: "started",
                timestamp: Date.now(),
                type: "update",
                data: jsonStringify(request),
            }).then((db) => {
                this.objects.get(request.trackerId)?.updateTicket(request).then(() => {
                    db.status = "completed";
                    db.save().catch((err) => {
                        this.logger.error(`handleUpdate() Error saving update request for tracker ${request.trackerId}`, err);
                    });
                    this.objects.get(request.trackerId)?.refresh().catch((err) => {
                        this.logger.error(`handleUpdate() Error refreshing tracker ${request.trackerId}`, err);
                    });
                })
                    .catch((err) => {
                        db.status = "error";
                        db.save().catch((err) => {
                            this.logger.error(`handleUpdate() Error saving update request for tracker ${request.trackerId}`, err);
                        });
                        this.logger.error(`handleUpdate() Error updating ticket in tracker ${request.trackerId}`, err);
                    })
            }).catch((err) => {
                this.logger.error(`handleUpdate() Error saving update request for tracker ${request.trackerId}`, err);
            });
        } else {
            this.logger.error(`handleUpdate() Tracker ${request.trackerId} not found`);
        }
    }

    handleTicketEvent(ticketEvent: TicketEvent): void {
        const tracker = this.objects.get(ticketEvent.trackerId);
        if (tracker) {
            this.logger.debug(`handleTicketEvent() Ticket event in tracker ${ticketEvent.trackerId}`, ticketEvent);
            this.trackerTicketEventSubjects.get(ticketEvent.trackerId)?.next(ticketEvent);
        } else {
            this.logger.error(`handleTicketEvent() Tracker ${ticketEvent.trackerId} not found`);
        }
    }

    async manageWatches(tracker: Tracker<TrackerConfig>): Promise<void> {
        const watch = await tracker.watch((ticketEvent: TicketEvent) => {
            if (ticketEvent.trackerId === tracker.config.id) {
                this.logger.debug(`manageWatches() Ticket event in tracker ${tracker.config.id}`, ticketEvent);
                this.ticketEventSubject.next(ticketEvent);
            }
        });
        this.watches.set(tracker.config.id!, watch);
    }

    async remove(trackerId: string): Promise<void> {
        this.logger.debug(`remove() Removing tracker ${trackerId}`);
        await this.objects.get(trackerId)?.destroy().catch((err) => {
            this.logger.error(`remove() Error removing tracker ${trackerId}`, err);
        });
        this.objects.delete(trackerId);
        this.watches.get(trackerId)?.unsubscribe();
        this.watches.delete(trackerId);
        this.trackerTicketEventSubjects.get(trackerId)?.unsubscribe();
        this.trackerTicketEventSubjects.delete(trackerId);
    }

    async destroy(): Promise<void> {
        await Promise.all(Array.from(this.objects.keys()).map((objectId) => this.remove(objectId)));

        this.createSubject.complete();
        this.updateSubject.complete();
        this.ticketEventSubject.complete();
        this.trackerTicketEventSubjects.forEach((subject) => {
            subject.complete();
        });
        this.watches.forEach((watch) => {
            watch.unsubscribe();
        });

    }

    async getStoredTicket(trackerId: string, ticketId: string): Promise<Ticket> {
        if (!this.objects.has(trackerId)) {
            throw new Error(`Tracker ${trackerId} not found`);
        }
        return TicketDb.findOne({ where: { trackerId, ticketId } }).then((db) => {
            if (db) {
                return db.toModel();
            } else {
                throw new Error(`Ticket ${ticketId} not found in tracker ${trackerId}`);
            }
        });

    }


    create(ticketCreateRequest: TicketCreateRequest): Promise<void> {
        if (!this.objects.has(ticketCreateRequest.trackerId)) {
            throw new Error(`Tracker ${ticketCreateRequest.trackerId} not found`);
        }
        this.createSubject.next(ticketCreateRequest);
        return Promise.resolve();
    }

    update(ticketUpdateRequest: TicketUpdateRequest): Promise<void> {
        if (!this.objects.has(ticketUpdateRequest.trackerId)) {
            throw new Error(`Tracker ${ticketUpdateRequest.trackerId} not found`);
        }
        this.updateSubject.next(ticketUpdateRequest);
        return Promise.resolve();
    }

    subscribe(trackerId: string, callback: (ticketEvent: TicketEvent) => void): Promise<Subscription> {
        const subject = this.trackerTicketEventSubjects.get(trackerId);
        if (subject) {
            return Promise.resolve(subject.subscribe(callback));
        } else {
            throw new Error(`Tracker ${trackerId} not found`);
        }
    }
}