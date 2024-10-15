import { WebsocketRequestHandler, } from "express-ws";
import { SocketMessage, requestMessageTypes } from "lib";
import { Subject } from "rxjs";

export function getWebhookSocketHandler(subject: Subject<SocketMessage>, clients: Set<any>, buffer: SocketMessage[]): WebsocketRequestHandler {
    const handler: WebsocketRequestHandler = async (ws, req) => {
        clients.add(ws);
        console.debug(
            `getWebhookSocketHandler() Received websocket event`
        );
        const pingInterval = setInterval(() => {
            ws.ping();
        }, 10000);

        ws.on("open", () => {
            if (buffer.length > 0) {
                buffer.reverse();
                while (buffer.length > 0) {
                    const message = buffer.pop();
                    ws.send(JSON.stringify(message), (err) => {
                        if (err) {
                            console.error(
                                `getWebhookSocketHandler() Error sending message: ${err}`
                            );
                        }
                    });
                }
            }
        });

        ws.on("message", (msg: string) => {
            // check if message contains HealthCheck, not just is HealthCheck
            if (!msg.includes("HealthCheck")) {
                console.debug(
                    `getWebhookSocketHandler() Received message: ${msg}`
                );
            }
            

            const message = JSON.parse(msg) as SocketMessage | { token: string };
            if ((message as { token: string }).token) {
                console.debug(
                    `getWebhookSocketHandler() Received token message`
                );
                return;
            }
            subject.next(message as SocketMessage);
        });
        const subscription =  subject.subscribe((message) => {
            if(!message.type.includes("HealthCheck")) {
                console.debug("getWebhookSocketHandler() Sending message: ", message);
            }
            for (const requestType of requestMessageTypes) {
                if (message.type === requestType) {
                    if (!message.type.includes("HealthCheck")) {
                        console.debug("requestType Matched: ", message.type);
                    }
                    ws.send(JSON.stringify(message), (err) => {
                        if (err) {
                            console.error(
                                `getWebhookSocketHandler() Error sending message: ${err}`
                            );
                        }
                    });
                }
            }
        });
        ws.on("close", () => {
            clients.delete(ws);
            console.debug(
                `getWebhookSocketHandler() Websocket closed`
            );
            subscription.unsubscribe();
            clearInterval(pingInterval);
        });

    };

    console.debug(
        `getWebhookSocketHandler() Created websocket handler`
    );

    return handler;
}
