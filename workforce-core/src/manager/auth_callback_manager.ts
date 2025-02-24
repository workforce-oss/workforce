import bodyParser from "body-parser";
import { Application, RequestHandler } from "express";
import expressWs from "express-ws";
import { IncomingHttpHeaders } from "http";
import { Subject } from "rxjs";
import { Configuration } from "../config/configuration.js";
import { Logger } from "../logging/logger.js";
import { BrokerMode, SubjectFactory } from "./impl/subject_factory.js";

export class AuthCallBackManager {
    private static _instance: AuthCallBackManager;
    private app?: expressWs.WithWebsocketMethod & Application;
    private hookRegistrationEventSubject?: Subject<AuthHookRegistrationEvent>;
    private hookCallbackEventSubject?: Subject<AuthHookCallbackEvent>;

    private httpHandlers = new Map<string, RequestHandler>();
    private hookCallbacks = new Map<string, (event: AuthHookCallbackEvent) => void>();
    private logger: Logger = Logger.getInstance("AuthCallBackManager");

    private static readonly AUTH_CALLBACK_PATH = "/auth/callback";

    public static getCallBackUrl(): string {
        return `${Configuration.BaseUrl}${AuthCallBackManager.AUTH_CALLBACK_PATH}`;
    }

    public static async getInstance(): Promise<AuthCallBackManager> {
        if (!AuthCallBackManager._instance) {
            const instance = new AuthCallBackManager();
            instance.hookRegistrationEventSubject = await SubjectFactory.createSubject<AuthHookRegistrationEvent>({
                channel: "auth.hook.registration",
                mode: (Configuration.BrokerMode as BrokerMode) || "in-memory"
            });
            instance.hookCallbackEventSubject = await SubjectFactory.createSubject<AuthHookCallbackEvent>({
                channel: "auth.hook.callback",
                mode: (Configuration.BrokerMode as BrokerMode) || "in-memory"
            });
            instance.hookCallbackEventSubject.subscribe({
                next: (event) => {
                    instance.handleHookCallbackEvent(event);
                },
                error: (error: Error) => {
                    instance.logger.error(`Error handling hook callback event: ${error.message}`);
                }
            });
            AuthCallBackManager._instance = instance;
        }
        return AuthCallBackManager._instance;
    }

    public manage(app: expressWs.WithWebsocketMethod & Application): void {
        if (this.app && this.app === app) {
            this.logger.debug("Already managing app");
            return;
        }

        this.app = app;

        app.use(AuthCallBackManager.AUTH_CALLBACK_PATH, bodyParser.json(), (req, res, next) => {
            const state = req.query.state as string;
            const handler = this.httpHandlers.get(state);
            if (handler) {
                handler(req, res, next);
            } else {
                this.logger.error(`No handler registered for path: ${AuthCallBackManager.AUTH_CALLBACK_PATH} state: ${state}`);
                next();
            }
        });
        this.logger.debug(`manage() registered ${AuthCallBackManager.AUTH_CALLBACK_PATH}`);

        this.hookRegistrationEventSubject?.subscribe({
            next: (event) => {
            if (event.type === "add") {
                this.addHook(event.hook);
            } else if (event.type === "remove") {
                this.removeHook(event.hook);
            }},
            error: (error: Error) => {
                this.logger.error(`Error handling hook registration event: ${error.message}`);
            }
        });
    }

    private handleHookCallbackEvent(event: AuthHookCallbackEvent): void {
        const callback = this.hookCallbacks.get(`${event.orgId}/${event.objectId}/${event.state}`);
        if (callback) {
            callback(event);
            this.hookCallbacks.delete(`${event.orgId}/${event.objectId}/${event.state}`);
        } else {
            this.logger.error(`No callback registered for event: ${JSON.stringify(event)}`);
        }
    }

    public subscribeToCallbackEvents(orgId: string, objectId: string, state: string, callback: (event: AuthHookCallbackEvent) => void): void {
        this.hookCallbacks.set(`${orgId}/${objectId}/${state}`, callback);
    }

    public registerHook(hook: AuthHook): void {
        this.hookRegistrationEventSubject?.next({
            type: "add",
            hook
        });
    }

    public unregisterHook(hook: AuthHook): void {
        this.hookRegistrationEventSubject?.next({
            type: "remove",
            hook
        });
    }

    public addHook(hook: AuthHook): void{
        this.logger.debug(`addHook() hook=${JSON.stringify(hook)}`);
        this.httpHandlers.set(hook.state, (req, res) => {
            this.hookCallbackEventSubject?.next({
                orgId: hook.orgId,
                objectId: hook.objectId,
                state: hook.state,
                queryParamaters: req.query,
                body: req.body as unknown,
                headers: req.headers
            });
            this.logger.debug(`addHook() hook=${JSON.stringify(hook)} query=${JSON.stringify(req.query)} body=${JSON.stringify(req.body)}`);
            this.removeHook(hook);
            res.send(`
                <html>
                <head>
                    <title>Auth Callback</title>
                    <script>
                    try {
                        window.close();
                    } catch (error) {
                        console.error(error);
                    }
                    try {
                        var bc = new BroadcastChannel('auth');
                        bc.postMessage({ type: 'callback'});
                    } catch (error) {
                        console.error(error);
                    }
                    
                    try {
                        const opener = window.opener;
                        const openerOrigin = opener.location.origin;
                        window.opener.postMessage('auth', openerOrigin);
                    } catch (error) {
                        console.error(error);
                    }
                    </script>
                </head>
                <body>
                    <h1>You may now close this window.</h1>
                </body>
                </html>
                `);
        });
    }

    public removeHook(hook: AuthHook): void {
        this.logger.debug(`removeHook() hook=${JSON.stringify(hook)}`);
        this.httpHandlers.delete(hook.state);
    }
}


export interface AuthHookRegistrationEvent {
    type: "add" | "remove";
    hook: AuthHook;
}

export interface AuthHook {
    orgId: string;
    objectId: string;
    state: string;
}

export interface AuthHookCallbackEvent {
    orgId: string;
    objectId: string;
    state: string;
    queryParamaters?: unknown;
    body?: unknown;
    headers: IncomingHttpHeaders;
}