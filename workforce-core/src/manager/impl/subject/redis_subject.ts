import { Subject, Subscription } from "rxjs";
import { RedisClientType, createClient } from "redis";
import { Logger } from "../../../logging/logger.js";
import { Configuration } from "../../../config/configuration.js";
import { jsonParse } from "../../../util/json.js";
import EventEmitter from "events";

export class RedisSubject<T> extends Subject<T> {
    private logger: Logger = Logger.getInstance("RedisSubject");

    private _subscriber?: RedisClientType & EventEmitter;
    private get subscriber(): RedisClientType & EventEmitter {
        if (!this._subscriber) {
            throw new Error("Subscriber not initialized");
        }
        return this._subscriber;
    }
    
    private _publisher?: RedisClientType & EventEmitter;
    private get publisher(): RedisClientType & EventEmitter {
        if (!this._publisher) {
            throw new Error("Publisher not initialized");
        }
        return this._publisher;
    }

    private client?: RedisClientType & EventEmitter;

    
    private channel: string;

    private _base: Subject<T>;

    constructor(channel: string) {
        super();
        this._base = new Subject<T>();
        this.channel = channel;
    }

    static async for<T>(channel: string): Promise<RedisSubject<T>> {
        Logger.getInstance(`RedisSubject`).info(`Creating RedisSubject for ${channel}`)
        const subject = new RedisSubject<T>(channel);
        const redisClient = subject.createRedisClient();
        subject.client = redisClient;
        subject.attachDefaultHandlers(redisClient);
        subject._subscriber = redisClient.duplicate() as RedisClientType & EventEmitter;
        subject.attachDefaultHandlers(subject.subscriber);
        subject._publisher = redisClient.duplicate() as RedisClientType & EventEmitter;
        subject.attachDefaultHandlers(subject.publisher);
        
        await subject.subscriber.connect();
        await subject.publisher.connect();
        await subject.connect();
        return subject;
    }

    private async connect() {
        await this.subscriber.subscribe(this.channel, (message) => {
            // this.logger.trace(`Received from ${this.channel}`)
            try {
                const jsonMessage = jsonParse<T>(message);
                if (jsonMessage) {
                    this._base.next(jsonMessage);
                }
            } catch (error) {
                this.logger.error(`Error parsing message from ${this.channel}: `, error)
            }
        });
    }

    public complete() {
        this.subscriber.quit().then(() => {
            this.logger.debug(`Subscriber Disconnected from ${this.channel}`)
        }).catch((error) => {
            this.logger.error(`Subscriber Error disconnecting from ${this.channel}: ${error}`)
        });
        this.publisher.quit().then(() => {
            this.logger.debug(`Publisher Disconnected from ${this.channel}`)
        }).catch((error) => {
            this.logger.error(`Publisher Error disconnecting from ${this.channel}: ${error}`)
        });
        this.client?.quit().then(() => {
            this.logger.debug(`Client Disconnected from ${this.channel}`)
        }).catch((error) => {
            this.logger.error(`Client Error disconnecting from ${this.channel}: ${error}`)
        });
        this._base.complete();
    }

    private attachDefaultHandlers(client: RedisClientType & EventEmitter) {
        client.on("connect", () => {
            this.logger.debug(`Connected to ${this.channel}`)
        });
        client.on("ready", () => {
            this.logger.debug(`Ready from ${this.channel}`)
        });
        client.on("reconnecting", () => {
            this.logger.debug(`Reconnecting from ${this.channel}`)
        });

        client.on("error", (error) => {
            this.logger.error(`Error from ${this.channel}: ${error}`)
        });
        client.on("end", () => {
            this.logger.debug(`End from ${this.channel}`)
        });
    }

    public subscribe(callback: (value: T) => void): Subscription {
        try {
            return this._base.subscribe(callback);
        } catch (error) {
            this.logger.error(`Error subscribing to ${this.channel}: `, error)
            throw error;
        }
    }

    public next(value: T): void {
        this.logger.debug(`Publishing to ${this.channel}`)
        this.publisher.publish(this.channel, JSON.stringify(value)).then(() => {
            this.logger.debug(`Published to ${this.channel}`)
        }).catch((error) => {
            this.logger.error(`Error publishing to ${this.channel}: ${error}`)
        });
    }

    private createRedisClient(): RedisClientType & EventEmitter {
        return createClient({
            url: Configuration.BrokerUri,
            username: Configuration.BrokerUsername,
            password: Configuration.BrokerPassword,            
        }) as RedisClientType & EventEmitter;
    }
}