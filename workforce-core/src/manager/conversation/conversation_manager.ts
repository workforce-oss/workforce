import { Subscription } from "rxjs";
import { Conversation, ConversationMessage } from "./model.js";

export class ConversationManager {
    //TODO: Replace with Redis Map
    static conversations = new Map<string, Conversation>();

    static setConversation(conversation: Conversation) {
        this.conversations.set(conversation.taskExecutionId, conversation);
    }

    static getConversation(taskExecutionId: string): Conversation {
        const conversation = this.conversations.get(taskExecutionId);
        if (!conversation) {
            throw new Error(`Conversation for task execution ${taskExecutionId} not found`);
        }
        return conversation;
    }

    static join(taskExecutionId: string, workerId: string) {
        const conversation = this.getConversation(taskExecutionId);
        if (!conversation) {
            throw new Error(`Conversation for task execution ${taskExecutionId} not found`);
        }
        conversation.workers.push(workerId);
    }

    static leave(taskExecutionId: string, workerId: string) {
        const conversation = this.getConversation(taskExecutionId);
        if (!conversation) {
            return;
        }
        conversation.workers = conversation.workers.filter((w) => w !== workerId);
    }

    static listen(taskExecutionId: string, callback: (message: ConversationMessage) => void): Subscription {
        const conversation = this.getConversation(taskExecutionId);
        if (!conversation) {
            throw new Error(`Conversation for task execution ${taskExecutionId} not found`);
        }
        return conversation.subject.subscribe(callback);
    }

    static listenForInterrupt(taskExecutionId: string, callback: (interrupt: boolean) => void): Subscription {
        const conversation = this.getConversation(taskExecutionId);
        if (!conversation) {
            throw new Error(`Conversation for task execution ${taskExecutionId} not found`);
        }
        return conversation.interrupt.subscribe(callback);
    }

    static listenForRelease(taskExecutionId: string, callback: (release: boolean) => void): Subscription {
        const conversation = this.getConversation(taskExecutionId);
        if (!conversation) {
            throw new Error(`Conversation for task execution ${taskExecutionId} not found`);
        }
        return conversation.release.subscribe(callback);
    }

    static sendMessage(message: ConversationMessage) {
        const conversation = this.getConversation(message.taskExecutionId);
        if (!conversation) {
            throw new Error(`Conversation for task execution ${message.taskExecutionId} not found`);
        }
        conversation.messages.push(message);
        conversation.subject.next(message);
    }

    static interrupt(taskExecutionId: string) {
        const conversation = this.getConversation(taskExecutionId);
        if (!conversation) {
            throw new Error(`Conversation for task execution ${taskExecutionId} not found`);
        }
        conversation.interrupt.next(true);
    }

    static release(taskExecutionId: string) {
        const conversation = this.getConversation(taskExecutionId);
        if (!conversation) {
            return;
        }
        conversation.release.next(true);
        setTimeout(() => {
            this.conversations.delete(taskExecutionId);
        }, 30000);
    }

    
}