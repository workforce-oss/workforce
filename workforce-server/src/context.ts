import cors from "cors";
import dotenv from "dotenv";
import express, { RequestHandler } from "express";
import { auth } from "express-oauth2-jwt-bearer";
import expressWs from "express-ws";
import { Transaction } from "sequelize";
import { ModelCtor, Sequelize } from "sequelize-typescript";
import { fileURLToPath } from "url";
import { Configuration, EncryptionService, Logger, MapFactory, MetricsHandlers, SubjectFactory, WorkforceClient, collectMetrics } from "workforce-core";
import { BaseComponent } from "./components/base.js";
import { ComponentFactory } from "./components/factory.js";
import { WorkforceComponent, workforceComponentTypes } from "./components/model.js";

export class ServerContext {
    __dirname: string;

    componentNames: WorkforceComponent[];
    components: BaseComponent[];
    publicKeys: Map<WorkforceClient, string>;
    httpRoutes: Record<string, RequestHandler[]>;
    wsRoutes: Record<string, expressWs.WebsocketRequestHandler>;
    sequelize: Sequelize;
    server?: expressWs.Application;
    logger: Logger = Logger.getInstance("workforce-server");
    models: ModelCtor[] = [];

    constructor(componentNames: WorkforceComponent[], rootDir?: string) {
        if (!rootDir) {
            this.__dirname = import.meta.dirname;
        } else {
            this.__dirname = rootDir;
        }
        dotenv.config({ path: `${this.__dirname}/../.env.${Configuration.NodeEnv}` });

        this.componentNames = componentNames;
        this.components = this.componentNames.flatMap((componentName) => {
            if (!workforceComponentTypes.includes(componentName as WorkforceComponent)) {
                throw new Error(`Invalid component name: ${componentName}`);
            }
            return ComponentFactory.createComponent(componentName as WorkforceComponent);
        });

        this.publicKeys = new Map();
        this.components.forEach((component) => {
            component.publicKeys().forEach((value, key) => {
                this.publicKeys.set(key, value);
            });
        });

        this.httpRoutes = {};
        this.components.forEach((component) => {
            this.httpRoutes = {
                ...this.httpRoutes, ...component.httpRoutes(auth({
                    issuerBaseURL: Configuration.OAuth2IssuerUri,
                    jwksUri: Configuration.OAuth2JwksUri ? Configuration.OAuth2JwksUri : undefined,
                    audience: Configuration.OAuth2Audience,
                }), cors())
            };
        });

        this.wsRoutes = {};
        this.components.forEach((component) => {
            this.wsRoutes = {
                ...this.wsRoutes, ...component.wsRoutes({
                    issuerBaseURL: Configuration.OAuth2IssuerUri,
                    jwksUri: Configuration.OAuth2JwksUri ? Configuration.OAuth2JwksUri : undefined,
                    audience: Configuration.OAuth2Audience,
                })
            };
        });

        const uniqueModels: ModelCtor[] = [];
        this.components.forEach((component) => {
            component.dbModels().forEach((model) => {
                if (!uniqueModels.some((uniqueModel) => uniqueModel.name === model.name)) {
                    uniqueModels.push(model);
                }
            });
        });

        console.log(uniqueModels);
        uniqueModels.reverse();

        const sqlite = Configuration.DbConnectionString.includes("sqlite");
        this.sequelize = new Sequelize(Configuration.DbConnectionString, {
            logging: false,
            transactionType: sqlite ? Transaction.TYPES.IMMEDIATE : Transaction.TYPES.DEFERRED,
            pool: {
                max: sqlite ? 1 : 20,
                min: sqlite ? 1 : 5,
                acquire: 30000,
                idle: 120000,
            },
            models: uniqueModels,
        });
    }

    async init(): Promise<void> {
        if (Configuration.EnvName === "e2e") {
            await this.sequelize.sync({ force: true });
        } else {
            await this.sequelize.sync({ });
        }

        if (!this.publicKeys.has("secret-service")) {
            this.publicKeys.set("secret-service", Configuration.SecretServicePublicKey);
        }

        console.log(this.publicKeys);

        await EncryptionService.init(Configuration.EncryptionPrivateKey, Configuration.EncryptionPublicKey, Configuration.EncryptionKeyPassword,
            this.publicKeys).catch((e) => {
                this.logger.error(`Error initializing encryption service: ${e}`);
                throw e;
            });

        const { app, getWss, applyTo } = expressWs(express());


        for (const [key, value] of Object.entries(this.httpRoutes)) {
            this.logger.info(`Adding route: ${key}`);
            app.use(key, value);
        }

        for (const [key, value] of Object.entries(this.wsRoutes)) {
            this.logger.info(`Adding ws route: ${key}`);
            app.ws(key, value);
        }

        collectMetrics();

        app.use(
            "/metrics",
            cors(),
            MetricsHandlers
        );

        app.use("/health", (req, res) => {
            res.status(200).send("OK");
        });

        for (const component of this.components) {
            await component.init(app, this.wsRoutes);
        }

        process.on("SIGTERM", async () => {
            this.logger.info("Received SIGTERM. Shutting down.");
            SubjectFactory.completeAll();
            MapFactory.destroy();
            await this.sequelize.close();
            process.exit(0);
        });

        app.listen(Configuration.Port, () => {
            Logger.getInstance("WorkforceServer").info(`Workforce Server listening on port ${Configuration.Port}`);
        });

        this.server = app;
    }

}