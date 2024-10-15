import express, { RequestHandler } from "express";
import { GetProjectFileFunctionTextRequest, GetProjectFileRequest, RequestMessageType, ResponseMessageType, SocketMessage } from "lib";
import { Subject } from "rxjs";

export function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
        .replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
}

export async function handleRequest(req: express.Request, res: express.Response, subject: Subject<SocketMessage>, clients: Set<any>, buffer: SocketMessage[], requestType: RequestMessageType, responseType: ResponseMessageType): Promise<any> {

    const correlationId = uuidv4();

    const message: SocketMessage = {
        type: requestType,
        correlationId: correlationId
    };
    if (req.body) {
        message.payload = req.body;
    } else if (req.params.slug) {
        message.payload = {
            slug: req.params.slug
        };
    } 
    if (req.query.location && req.query.functionName) {
        message.payload = {
            ...message.payload,
            fileLocation: req.query.location as string,
            functionName: req.query.functionName as string
        } as GetProjectFileFunctionTextRequest;
    } else if (req.query.location) {
        message.payload = {
            ...message.payload,
            fileLocation: req.query.location as string
        } as GetProjectFileRequest;
    }


    const resultPromise = new Promise((resolve, reject) => {
        const subscription = subject.subscribe((response: SocketMessage) => {
            if (responseType !== "HealthCheckResponse") {
                console.log(`Received response: ${response.type}`);
                console.log(`requestCorrelationId: ${correlationId}`)
                console.log(`responseCorrelationId: ${response.correlationId}`);
                console.log(`raw response: ${JSON.stringify(response, null, 2)}`);
            }
            if (response.type === responseType && response.correlationId === correlationId) {
                if (responseType !== "HealthCheckResponse") {
                    console.log(`Matched response: ${response.type} with correlationId: ${response.correlationId}`);
                }
                subscription.unsubscribe();
                if (response.type !== "HealthCheckResponse") {
                    console.log(`payload: ${response.payload}`)
                }
                resolve(response.payload);
            } else if (response.type === "Error" && response.correlationId === correlationId) {
                console.log(`Matched error response: ${response.type} with correlationId: ${response.correlationId}`);
                subscription.unsubscribe();
                resolve(response.payload);
            }
        });
    });

    if (clients.size === 0) {
        console.log(`No clients connected, buffering message: ${requestType}`);
        buffer.push(message);
    } else {
        subject.next(message);
    }

    if (responseType !== "HealthCheckResponse") {
        console.log(`Waiting for response: ${requestType}`);
    }
    try {
        const result = await resultPromise;
        if (responseType !== "HealthCheckResponse") {
            console.log(`Returning response: ${requestType}`);
        }
        return res.json(result);
    } catch (e) {
        console.error(`Returning error response: ${requestType}`);
        return res.status(200).json({error: e});
    }
}
