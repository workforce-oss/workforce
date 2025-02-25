import { Subject } from "rxjs";
import { RedisSubject } from "./subject/redis_subject.js";

export class SubjectFactory {
    public static readonly CHANNEL_REQUEST: string = "channel.request";
    public static readonly CHANNEL_MESSAGE: string = "channel.message";

    public static readonly DOCUMENT_REPOSITORY_SEARCH_REQUEST: string = "document-repository.search.request";
    public static readonly DOCUMENT_REPOSITORY_SEARCH_RESPONSE: string = "document-repository.search.response";
    public static readonly DOCUMENT_REPOSITORY_DOCUMENT: string = "document-repository.document";

    public static readonly RESOURCE_WRITE: string = "resource.write";
    public static readonly RESOURCE_VERSION: string = "resource.version";

    public static readonly TASK_EXECUTION_REQUEST: string = "task.execution.request";
    public static readonly TASK_EXECUTION_RESPONSE: string = "task.execution.response";

    public static readonly WORK_REQUEST: string = "worker.request";
    public static readonly WORK_RESPONSE: string = "worker.response";
    public static readonly REMOVE_TASK_EXECUTION: string = "task.execution.remove";



    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static subjects: Map<string, Subject<any>> = new Map<string, Subject<any>>();

    static completeAll() {
        this.subjects.forEach((subject) => {
            subject.complete();
        });
    }

    static async createSubject<T>(args: SubjectArgs): Promise<Subject<T>> {
        if (args.mode === "in-memory") {
            return this.inMemorySubject<T>(args);
        } else if (args.mode === "google-pub-sub") {
            return await this.pubSubSubject<T>(args);
        } else if (args.mode === "redis") {
            return await this.redisSubject<T>(args);
        } else {
            throw new Error(`BrokerManager.getSubject() mode ${args.mode} is not supported`);
        }
    }

    private static inMemorySubject<T>(args: SubjectArgs): Subject<T> {
        if (this.subjects.has(args.channel)) {
            return this.subjects.get(args.channel) as Subject<T>;
        }
        const subject = new Subject<T>();
        this.subjects.set(args.channel, subject);
        subject.subscribe({
            complete: () => {
                this.subjects.delete(args.channel);
            }
        })
        return subject;
    }

    //TODO: Implement Google Pub-Sub mode
    private static pubSubSubject<T>(args: SubjectArgs): Promise<Subject<T>> {
        if (this.subjects.has(args.channel)) {
            return Promise.resolve(this.subjects.get(args.channel) as Subject<T>);
        }
        const subject = new Subject<T>();
        this.subjects.set(args.channel, subject);
        subject.subscribe({
            complete: () => {
                this.subjects.delete(args.channel);
            }
        })
        return Promise.resolve(subject);
    }

    private static async redisSubject<T>(args: SubjectArgs): Promise<Subject<T>> {
        if (this.subjects.has(args.channel)) {
            return this.subjects.get(args.channel) as Subject<T>;
        }
        const redisSubject = await RedisSubject.for<T>(args.channel);
        this.subjects.set(args.channel, redisSubject);
        return redisSubject;
    }
}

export interface SubjectArgs {
    mode: BrokerMode,
    channel: string,
}

export type BrokerMode = "in-memory" | "google-pub-sub" | "redis" | "kafka";