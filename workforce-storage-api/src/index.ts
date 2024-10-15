import cors from "cors";
import express from "express";
import { auth } from "express-oauth2-jwt-bearer";
import { Sequelize } from "sequelize-typescript";
import { ChannelDb, ChannelMessageDb, ChannelSessionDb, Configuration, CredentialDb, DocumentationDb, DocumentDb, DocumentRelationDb, DocumentRepositoryDb, FlowDb, OrgDb, OrgUserRelationDb, Outbox, ResourceDb, ResourceVersionDb, ResourceWriteDb, SkillDb, SpaceDb, SpaceUserRelationDb, SubjectFactory, TaskDb, TaskExecutionDb, TaskExecutionUserDb, TicketRequestDb, ToolDb, ToolRequestDb, ToolStateDb, TrackerDb, UserDb, WebhookRouteDb, WorkerChatMessageDb, WorkerChatSessionDb, WorkerDb, WorkRequestDb } from "workforce-core";
import { healthCheck } from "./api.js";
import { initStorageService, } from "./index.storage.js";
import { MessagingService } from "./service/messaging_service.js";
import { StorageClientFactory } from "./service/storage/factory.js";
import { StorageService } from "./service/storage_service.js";

import dotenv from "dotenv";
import { Transaction } from "sequelize";

if (Configuration.NodeEnv) {
    dotenv.config({ path: `${import.meta.dirname}/../.env.${Configuration.NodeEnv}` });
}

const app = express();
app.use(cors());

const component = Configuration.ComponentName ?? "storage";

try {
    const sqlite = Configuration.DbConnectionString.includes("sqlite");
    const sequelize = new Sequelize(Configuration.DbConnectionString, {
        models: [
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
        ],
        logging: false,
        transactionType: sqlite ? Transaction.TYPES.IMMEDIATE : Transaction.TYPES.DEFERRED,
        pool: {
            max: sqlite ? 1 : 20,
            min: sqlite ? 1 : 5,
            acquire: 30000,
            idle: 120000,
        },
    });
    sequelize.sync({}).then(async () => {

        const storageClient = StorageClientFactory.getStorageClient();
        const messagingService = await MessagingService.getInstance();

        const storageService = new StorageService(storageClient, messagingService);

        const api = express.Router();
        api.get("/health", async (req, res) => healthCheck(req, res));

        if (component === "storage" || component === "all") {
            initStorageService(api, storageService, messagingService);
        }

        console.log("configuring auth");
        console.log("issuerBaseURL: " + Configuration.OAuth2IssuerUri);
        console.log("audience: " + Configuration.OAuth2Audience);

        const disableAuth = process.env.DISABLE_AUTH === "true";

        if (!disableAuth && Configuration.OAuth2IssuerUri && Configuration.OAuth2Audience) {
            app.use("/", auth({
                issuerBaseURL: Configuration.OAuth2IssuerUri,
                audience: Configuration.OAuth2Audience,
                authRequired: true
            }), api);
        } else {
            app.use("/", api);
        }

        // collectMetrics();
        // app.use("/metrics", MetricsApi);

        const onExit = async () => {
            try {
                SubjectFactory.completeAll();
            } catch (error) {
                console.error(error);
            }
            await sequelize.close().catch((error) => {
                console.error(error);
            });
            process.exit(0);
        }

        process.on("SIGINT", onExit);

        process.on("SIGTERM", onExit);

        app.listen(Configuration.Port, () => {
            console.log(`Server is running on port ${Configuration.Port}`);
        });
    }).catch((error) => {
        console.error(error);
        process.exit(1);
    });
} catch (error) {
    console.error(error);
    process.exit(1);
}
