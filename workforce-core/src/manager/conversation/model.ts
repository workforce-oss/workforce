import { Subject } from "rxjs";

export interface Conversation {
    taskExecutionId: string;
    name: string;
    description: string;
    customers: string[];
    workers: string[];
    messages: ConversationMessage[];
    subject: Subject<ConversationMessage>;
    interrupt: Subject<boolean>;
    release: Subject<boolean>;
}

export interface ConversationMessage {
    senderId: string;
    messageId: string;
    message: string;
    taskExecutionId: string;
}