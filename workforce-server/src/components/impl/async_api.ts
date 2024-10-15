import expressWs, { WebsocketRequestHandler } from "express-ws";
import { BaseComponent } from "../base.js";
import { AuthCallBackManager, ChannelDb, ChannelMessageDb, ChannelSessionDb, Configuration, CredentialDb, DocumentDb, DocumentRelationDb, DocumentRepositoryDb, DocumentationDb, FlowDb, OrgDb, OrgUserRelationDb, Outbox, ResourceDb, ResourceVersionDb, ResourceWriteDb, SkillDb, SpaceDb, SpaceUserRelationDb, TaskDb, TaskExecutionDb, TaskExecutionUserDb, TicketRequestDb, ToolDb, ToolRequestDb, ToolStateDb, TrackerDb, UserDb, WebhookRouteDb, WebhookRouteManager, WorkRequestDb, WorkerChatMessageDb, WorkerChatSessionDb, WorkerDb, WorkforceClient } from "workforce-core";
import { WorkforceComponent } from "../model.js";
import { ModelCtor, Sequelize } from "sequelize-typescript";

export class AsyncApiComponent extends BaseComponent {
    constructor(componentName: WorkforceComponent) {
        super(componentName);
    }

    async init(app: expressWs.Application, additionalWsHandlers?: Record<string, WebsocketRequestHandler>): Promise<void> {
        (await WebhookRouteManager.getInstance()).manage(app, additionalWsHandlers);
        (await AuthCallBackManager.getInstance()).manage(app);
        this.logger.info(`${this.componentName} is ready`);
    }

    dbModels(): ModelCtor[] {
        const models = [
            Outbox,
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
            OrgDb,
            SpaceDb,
            UserDb,
            OrgUserRelationDb,
            SpaceUserRelationDb,
        ];

        return models;
    }

    publicKeys(): Map<WorkforceClient, string> {
        return new Map<WorkforceClient, string>([
            ["workforce-api", Configuration.EncryptionPublicKey],
        ]);
    }

    httpRoutes() {
        return {};
    }

    wsRoutes() {
        return {};
    }
}