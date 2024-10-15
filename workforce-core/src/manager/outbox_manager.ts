import { Subject, Subscription } from "rxjs";
import { OutboxEvent } from "../objects/base/outbox.js";
import { BrokerMode, SubjectFactory } from "./impl/subject_factory.js";
import { Logger } from "../logging/logger.js";
import { Configuration } from "../config/configuration.js";

export class OutboxManager {
    private static _instance?: OutboxManager;
    private _outboxSubject?: Subject<OutboxEvent>;
    private logger = Logger.getInstance("OutboxManager")

    public get subject(): Subject<OutboxEvent> {
        if (!this._outboxSubject) {
            throw new Error("Outbox subject not initialized");
        }
        return this._outboxSubject;
    }

    public static async instance(): Promise<OutboxManager> {
        if (!this._instance) {
            this._instance = await OutboxManager.create();
        }
        return this._instance;
    }

    private static async create(): Promise<OutboxManager> {
        const manager = new OutboxManager();
        const brokerMode = (Configuration.BrokerMode || "in-memory") as BrokerMode;
        manager._outboxSubject = await SubjectFactory.createSubject<OutboxEvent>({ channel: "outbox", mode: brokerMode });
        return manager;
    }

    public next(event: OutboxEvent): void {
        this.subject.next(event);
    }

    public subscribe(callback: (value: OutboxEvent) => void): Subscription {
        this.logger.info("subscribe() Subscribing to outbox");
        this.subject.subscribe({
            next: (value) => {
                this.logger.debug(`subscribe() Received outbox event ${JSON.stringify(value)}`);
            },
            error: (error: Error) => {
                this.logger.error(`subscribe() Error in outbox event: ${error.message}`);
            }
        });
        return this.subject.subscribe({
            next: callback,
            error: (error: Error) => {
                this.logger.error(`subscribe() Error in outbox event: ${error.message}`);
            }
        });
    }
}

