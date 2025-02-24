import expressWs from "express-ws";
import { BaseComponent } from "../base.js";
import { WorkforceComponent } from "../model.js";
import { Configuration, OrgDb, OrgUserRelationDb, SecretDb, SecretRoutes, SpaceDb, SpaceUserRelationDb, UserDb, WorkforceClient } from "workforce-core";
import { RequestHandler } from "express";
import { ModelCtor, Sequelize } from "sequelize-typescript";

export class SecretsApiComponent extends BaseComponent {
    constructor(componentName: WorkforceComponent) {
        super(componentName);
    }

    async init(app: expressWs.WithWebsocketMethod): Promise<void> {
        this.logger.info(`${this.componentName} is ready`);
    }

    dbModels(): ModelCtor[] {
        return [
            OrgDb,
            SpaceDb,
            UserDb,
            OrgUserRelationDb,
            SpaceUserRelationDb,
            SecretDb
        ];
    }

    publicKeys(): Map<WorkforceClient, string> {
        return new Map<WorkforceClient, string>([
            ["secret-service", Configuration.EncryptionPublicKey],
            ["workforce-api" as WorkforceClient, Configuration.WorkforceApiPublicKey],
            ["workforce-engine" as WorkforceClient, Configuration.WorkforceEnginePublicKey],
            ["storage-api" as WorkforceClient, Configuration.StorageApiPublicKey],
        ]);
    }

    httpRoutes(auth: RequestHandler, cors: RequestHandler) {
        return {
            "/secrets": [
                cors,
                auth,
                SecretRoutes
            ],
        };
    }

    wsRoutes() {
        return {};
    }
}