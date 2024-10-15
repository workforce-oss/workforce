import { RequestHandler } from "express";
import { ModelCtor } from "sequelize-typescript";
import { Logger, WorkforceClient } from "workforce-core";
import expressWs, { WebsocketRequestHandler } from 'express-ws';
import { AuthOptions } from "express-oauth2-jwt-bearer";
import { WorkforceComponent } from "./model.js";

export abstract class BaseComponent {
    logger: Logger;
    componentName: WorkforceComponent;
    constructor(componentName: WorkforceComponent) {
        this.componentName = componentName;
        this.logger = Logger.getInstance(componentName);
    }

    abstract init(app: expressWs.Application, additionalWsRoutes?: Record<string, WebsocketRequestHandler>): Promise<void>;

    abstract dbModels(): ModelCtor[];

    abstract publicKeys(): Map<WorkforceClient, string>;

    abstract httpRoutes(auth: RequestHandler, cors: RequestHandler): Record<string, RequestHandler[]>;

    abstract wsRoutes(authOptions?: AuthOptions): Record<string, WebsocketRequestHandler>;
}