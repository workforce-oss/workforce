import { RequestHandler } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { BrokerManager, ChannelDb, ChannelMessageDb, ChannelSessionDb, Configuration, CredentialDb, DocumentDb, DocumentRelationDb, DocumentRepositoryDb, DocumentationDb, FlowDb, Logger, ObjectManager, OrgDb, OrgUserRelationDb, Outbox, ResourceDb, ResourceVersionDb, ResourceWriteDb, SkillDb, SpaceDb, SpaceUserRelationDb, TaskDb, TaskExecutionDb, TaskExecutionUserDb, TicketRequestDb, ToolDb, ToolRequestDb, ToolStateDb, TrackerDb, UserDb, WebhookRouteDb, WorkRequestDb, WorkerChatMessageDb, WorkerChatSessionDb, WorkerDb, WorkforceClient } from "workforce-core";
import { BaseComponent } from "../base.js";
import { ModelCtor, Sequelize } from "sequelize-typescript";
import expressWs from "express-ws";
import { WorkforceComponent } from "../model.js";

export class EngineComponent extends BaseComponent {


    constructor(componentName: WorkforceComponent) {
        super(componentName);
    }

    async init(app: expressWs.Application): Promise<void> {
        await ObjectManager.create();
        if (Configuration.AdminUsername && Configuration.AdminPassword && Configuration.AdminEmail) {
            this.logger.info(`Creating admin user`)
            if (!BrokerManager.identityBroker) {
                throw new Error("Identity Broker not initialized");
            }
            await BrokerManager.identityBroker.createUser({
                email: Configuration.AdminEmail,
                password: Configuration.AdminPassword,
                firstName: "Admin",
                lastName: "User",
                username: Configuration.AdminUsername,
            }).catch((error) => {
                if (error.message?.startsWith("User already exists")) {
                    this.logger.info(`Admin user already exists`);
                    return;
                }
                this.logger.error(`Error creating admin user: ${error}`);
            });
            const created = await BrokerManager.identityBroker.getUserByUsername(Configuration.AdminUsername).catch((error) => {
                this.logger.error(`Error getting admin user: ${error}`);
                return null;
            });
            if (!created) {
                this.logger.error(`Error creating admin user`);
            } else {
                this.logger.info(`Admin user created`);
                this.logger.debug(`Admin user: ${JSON.stringify({
                    email: created.email,
                    username: created.username,
                    firstName: created.firstName,
                    lastName: created.lastName
                })}`);
            }
        } else {
            this.logger.warn(`Admin username, password, and email not set. Admin user will not be created`);
        }
        this.logger.info(`${this.componentName} is ready`)
    }

    dbModels(): ModelCtor[] {
        const models: ModelCtor[] = [
            Outbox,
            OrgDb,
            SpaceDb,
            UserDb,
            OrgUserRelationDb,
            SpaceUserRelationDb,
            WebhookRouteDb,
            CredentialDb,
            FlowDb,
            ChannelDb,
            ChannelMessageDb,
            ChannelSessionDb,
            DocumentRepositoryDb,
            DocumentDb,
            DocumentRelationDb,
            DocumentationDb,
            ResourceDb,
            ResourceWriteDb,
            ResourceVersionDb,
            TaskDb,
            TaskExecutionDb,
            TaskExecutionUserDb,
            ToolDb,
            ToolRequestDb,
            ToolStateDb,
            TrackerDb,
            TicketRequestDb,
            WorkerDb,
            WorkRequestDb,
            WorkerChatSessionDb,
            WorkerChatMessageDb,
            SkillDb,
        ]
        return models;
    }
    publicKeys(): Map<WorkforceClient, string> {
        return new Map<WorkforceClient, string>([
            ["workforce-engine", Configuration.EncryptionPublicKey],
        ]);
    }

    httpRoutes(): Record<string, RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>[]> {
        return {};
    }
    wsRoutes(): Record<string, expressWs.WebsocketRequestHandler> {
        return {};
    }


}