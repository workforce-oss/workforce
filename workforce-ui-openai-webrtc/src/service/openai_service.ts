import { NativeChatSocketAPI } from "workforce-api-client";
import { ConversationItem, ConversationItemType, Session } from "../model/common.js";
import { CreateConversationItem, CreateResponse, UpdateSession } from "../model/client.js";
import { uuidv4 } from "../util/util.js";
import { NativeChannelMessage } from "workforce-core/model";
import { ConversationItemInputAutioTranscriptionCompleted, ResponseDone } from "../model/server.js";
import { NativeChannelToolCall } from "../../../workforce-core/dist/objects/channel/impl/native/native_channel_model.js";

export type OpenAIServiceMetadata = {
    taskExecutionId: string,
    workerId: string,
    userId: string,
    threadId: string
}

export class OpenAIService {
    private api: NativeChatSocketAPI;
    private dc: RTCDataChannel;
    private metadata: OpenAIServiceMetadata;

    constructor(api: NativeChatSocketAPI, dc: RTCDataChannel, metadata: OpenAIServiceMetadata) {
        this.api = api;
        this.dc = dc;
        this.metadata = metadata;

        this.api.subscribe(this.addMessage.bind(this));
    }

    // Server Messages

    handleEvent(event: any) {
        if (event.type === "conversation.item.input_audio.transcript.completed") {
            this.handleUserMessage(event);
            return;
        }

        if (event.type === "response.done") {
            this.handleWorkerMessage(event);
            return;
        }
    }

    handleUserMessage(event: ConversationItemInputAutioTranscriptionCompleted) {
        const message: NativeChannelMessage = {
            messageId: uuidv4(),
            text: event.transcript,
            timestamp: Date.now(),
            taskExecutionId: this.metadata.taskExecutionId,
            senderId: this.metadata.userId,
            threadId: this.metadata.threadId,
        }

        this.api.sendChatMessage(message);
    }

    handleWorkerMessage(event: ResponseDone) {
        const message: NativeChannelMessage = {
            messageId: uuidv4(),
            text: "",
            timestamp: Date.now(),
            taskExecutionId:  this.metadata.taskExecutionId,
            senderId: this.metadata.workerId,
            threadId: this.metadata.threadId
        }

        for (const item of event.response.output) {
            if (item.type === "message" && item.content?.length > 0) {
                message.text = item.content[0].text ?? item.content[0].transcript;
            }
            if (item.type === "function_call") {
                if (!message.toolCalls) {
                    message.toolCalls = []
                }

                const tc: NativeChannelToolCall = {
                    name: item.name,
                    call_id: item.call_id,
                    arguments: JSON.parse(item.arguments),
                    taskExecutionId: this.metadata.taskExecutionId,
                    toolRequestId: uuidv4(),
                    sessionId: this.metadata.threadId,
                    timestamp: Date.now(),
                    toolType: item.name,
                }

                message.toolCalls.push(tc)
            }
        }

        this.api.sendChatMessage(message);
    }


    // Client Messages

    updateSession(session: Session) {
        const event: UpdateSession = {
            event_id: Date.now().toString(),
            type: "session.update",
            session
        }
        this.send(event)
    }

    addMessage(message: NativeChannelMessage) {
        console.log(`webrtc service attemptend to send message...`)
        if (!message.final_part && !message.toolCalls) {
            return;
        }

        if (!message.toolCalls) {
            return;
        }

        const items: ConversationItem[] = [];
        let type: ConversationItemType = "message";
        let hasToolOutputs = false;

        if (message.toolCalls && message.toolCalls.length > 0) {
            type = message.toolCalls.some(tc => tc.result) ? "function_call_output" : "function_call"
            if (type === "function_call_output") {
                hasToolOutputs = true;
            } else {
                return;
            }
            for (const tc of message.toolCalls) {
                const item: ConversationItem = {
                    id: Date.now().toString(),
                    type,
                    call_id: tc.call_id,
                }
                if (type === "function_call_output") {
                    item.output = tc.result
                } else {
                    item.name = tc.name
                    item.arguments = JSON.stringify(tc.arguments)
                }

                items.push(item)
            }
        }

        if (message.text) {
            const item: ConversationItem = {
                id: Date.now().toString(),
                type: "message",
                role: "user",
                content: [{
                    type: "text",
                    text: message.text
                }]                
            }

            items.push(item);
        }

        for (const item of items) {
            const event: CreateConversationItem = {
                event_id: Date.now().toString(),
                item,
                type: "conversation.item.create",
            }
            this.send(event)
        }

        if (hasToolOutputs) {
            this.runInference();
        }
    }

    private runInference() {
        const event: CreateResponse = {
            event_id: Date.now().toString(),
            type: "response.create"
        }

        this.send(event)
    }

    private send(event: any) {
        console.log(`webrtc service sending event ${JSON.stringify(event)}`)
        this.dc.send(JSON.stringify(event))
    }
}