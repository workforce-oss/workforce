import { Subject } from "rxjs";
import { Configuration, SubjectFactory } from "workforce-core";
import { DocumentData } from "workforce-core/model";

export class MessagingService {
    private static _instance: MessagingService;
    private documentSubject?: Subject<DocumentData>;

    private constructor() {}

    public static async getInstance(): Promise<MessagingService> {
        const mode = Configuration.BrokerMode || "in-memory";
        if (!MessagingService._instance) {
            const instance = new MessagingService();
            instance.documentSubject = await SubjectFactory.createSubject<DocumentData>({
                mode: mode as any,
                channel: "document-repository.document"
            });
            MessagingService._instance = instance;
        }

        return MessagingService._instance;
    }

    public sendEvent(data: DocumentData): void {
        console.log(`Sending event: ${JSON.stringify(data)}`);
        this.documentSubject?.next(data);
    }
}