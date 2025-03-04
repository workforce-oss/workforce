import { Application, Request, RequestHandler, Response, Router } from "express";
import { AuthOptions, auth } from "express-oauth2-jwt-bearer";
import { ParamsDictionary } from "express-serve-static-core";
import expressWs from "express-ws";
import QueryString from "qs";
import { BrokerManager, ChannelDb, ChannelMessageDb, ChannelRouter, ChannelSessionDb, Configuration, CredentialDb, CredentialRouter, DocumentationDb, DocumentationRouter, DocumentDb, DocumentRelationDb, DocumentRepositoryDb, DocumentRepositoryRouter, FlowDb, FlowRouter, LocalIdentityDb, MapFactory, OAuth2Server, OAuthKeysDb, OrgDb, OrgRouter, OrgUserRelationDb, Outbox, ResourceDb, ResourceRouter, ResourceVersionDb, ResourceWriteDb, SkillDb, SkillRouter, SpaceDb, SpaceUserRelationDb, SubjectFactory, TaskDb, TaskExecutionDb, TaskExecutionRequest, TaskExecutionResponse, TaskExecutionRouter, TaskExecutionUserDb, TaskRouter, TicketRequestDb, ToolDb, ToolImageRouter, ToolRequestDb, ToolRouter, ToolStateDb, TrackerDb, TrackerRouter, UserDb, UserRouter, WebhookRouteDb, WebhookSocketAuthMessage, WorkerChatMessageDb, WorkerChatSessionDb, WorkerDb, WorkerRouter, WorkforceClient, WorkRequestDb, } from "workforce-core";
import WebSocket from "ws";
import { BaseComponent } from "../base.js";
import { WorkforceComponent } from "../model.js";
import { ModelCtor, Sequelize } from "sequelize-typescript";
import cors from "cors";

export class RestApiComponent extends BaseComponent {
    oauth2Server?: OAuth2Server;

    constructor(componentName: WorkforceComponent) {
        super(componentName);
    }

    async init(app: expressWs.WithWebsocketMethod & Application): Promise<void> {
        if (Configuration.EnableLocalAuth) {
            const authCache = await MapFactory.for<Record<string, string>>(
                "auth_cache",
                "local"
            );
            const oauth2Server = new OAuth2Server(authCache);
            this.oauth2Server = oauth2Server;

            const oath2Router = Router({ mergeParams: true });
            oath2Router.get("/", cors(), oauth2Server.expressHandlers.discovery);
            oath2Router.get("/.well-known/openid-configuration", cors(), oauth2Server.expressHandlers.discovery);
            oath2Router.get("/.well-known/jwks.json", cors(), oauth2Server.expressHandlers.config);
            oath2Router.post("/token", cors(), oauth2Server.expressHandlers.token);
            oath2Router.get("/authorize", cors(), oauth2Server.expressHandlers.authorize);
            oath2Router.post("/login", cors(), oauth2Server.expressHandlers.login);


            app.use("/insecure", oath2Router);
        }

        this.logger.info(`${this.componentName} is ready`);

    }

    dbModels(): ModelCtor[] {
        const models: ModelCtor[] = [
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
        ]

        if (Configuration.EnableLocalAuth) {
            models.push(LocalIdentityDb);
            models.push(OAuthKeysDb);
        }

        return models;
    }

    publicKeys(): Map<WorkforceClient, string> {
        return new Map<WorkforceClient, string>([
            ["workforce-api", Configuration.EncryptionPublicKey],
        ]);

    }

    httpRoutes(auth: RequestHandler, cors: RequestHandler): Record<string, RequestHandler[]> {
        const routes = {
            "/orgs/:orgId/flows": [
                cors,
                auth,
                FlowRouter               
            ],
            "/orgs/:orgId/flows/:flowId/channels": [
                cors,
                auth,
                ChannelRouter
            ],
            "/orgs/:orgId/flows/:flowId/documentation": [
                cors,
                auth,
                DocumentationRouter
            ],
            "/orgs/:orgId/flows/:flowId/resources": [
                cors,
                auth,
                ResourceRouter
            ],
            "/orgs/:orgId/flows/:flowId/tasks": [
                cors,
                auth,
                TaskRouter
            ],
            "/orgs/:orgId/flows/:flowId/tools": [
                cors,
                auth,
                ToolRouter
            ],
            "/orgs/:orgId/flows/:flowId/trackers": [
                cors,
                auth,
                TrackerRouter
            ],
            "/orgs/:orgId/document-repositories": [
                cors,
                auth,
                DocumentRepositoryRouter
            ],
            "/orgs/:orgId/skills": [
                cors,
                auth,
                SkillRouter
            ],
            "/orgs/:orgId/workers": [
                cors,
                auth,
                WorkerRouter
            ],
            "/orgs/:orgId/credentials": [
                cors,
                auth,
                CredentialRouter
            ],
            "/orgs/:orgId/task-executions": [
                cors,
                auth,
                TaskExecutionRouter
            ],
            "/state-images": [
                cors,
                auth,
                ToolImageRouter
            ],
            "/orgs": [
                cors,
                auth,
                OrgRouter
            ],
            "/users": [
                cors,
                auth,
                UserRouter
            ],
        };

        return routes;
    }

    wsRoutes(authOptions?: AuthOptions): Record<string, expressWs.WebsocketRequestHandler> {
        return {
            "/watch/task-executions":
                async (ws: WebSocket, req: any) => {
                    await this.watchTaskExecutions(ws, req, authOptions);
                }
        }
    }


    private async watchTaskExecutions(ws: WebSocket, req: Request, authOptions?: AuthOptions): Promise<void> {
        this.logger.info("watching task executions");
        ws.setMaxListeners(2);
        const client = {
            authed: false,
            ws: ws,
        }
        let requestSubscription: any;
        let responseSubscription: any;
        const pingInterval = setInterval(() => {
            ws.ping();
        }, 10000);
        ws.on("message", (message: string) => {
            if (!client.authed) {
                const authMessage: WebhookSocketAuthMessage = JSON.parse(message);
                this.validateAuth(authMessage.token, authOptions).then(async (authed) => {
                    const authResult = this.handleAuthResult(authMessage.token, authed, client);
                    if (authed) {
                        const taskExecutionRequests = await SubjectFactory.createSubject<TaskExecutionRequest>({
                            channel: SubjectFactory.TASK_EXECUTION_REQUEST,
                            mode: "redis",
                        });
                        const taskExecutionResponses = await SubjectFactory.createSubject<TaskExecutionResponse>({
                            channel: SubjectFactory.TASK_EXECUTION_RESPONSE,
                            mode: "redis",
                        });
                        requestSubscription = taskExecutionRequests.subscribe((taskExecution) => {
                            this.logger.debug(`received task execution request: ${JSON.stringify(taskExecution)}`);
                            this.logger.debug(`authResult: ${JSON.stringify(authResult)}`);
                            if (taskExecution.users.includes(authResult.userId)) {
                                client.ws.send(JSON.stringify([taskExecution]));
                            }
                        });
                        responseSubscription = taskExecutionResponses.subscribe((taskExecution) => {
                            if (taskExecution.users.includes(authResult.userId)) {
                                client.ws.send(JSON.stringify([taskExecution]));
                            }
                        });
                    }
                }).catch((err) => {
                    this.handleAuthError(client);
                });
            } else {
                this.logger.info("received unauthenticated message", message);
            }
        });

        ws.on("close", () => {
            if (requestSubscription) {
                requestSubscription.unsubscribe();
            }
            if (responseSubscription) {
                responseSubscription.unsubscribe();
            }
            clearInterval(pingInterval);
        });
    }

    handleAuthResult(token: string, authed: boolean, client: { authed: boolean; ws: WebSocket }): { orgId: string, userId: string } {
        if (authed) {
            this.logger.info("Received authenticated message");
            client.authed = true;
            client.ws.send(
                JSON.stringify({
                    success: true,
                    message: "Auth successful",
                })
            );

            const middleToken = token.split(".")[1];
            const decodedToken = JSON.parse(Buffer.from(middleToken, "base64").toString());
            return { orgId: decodedToken.orgId, userId: decodedToken.sub };
        } else {
            this.logger.info("Auth failed");
            client.ws.send(
                JSON.stringify({
                    success: false,
                    message: "Invalid auth token",
                })
            );
            client.ws.close();
            return { orgId: "", userId: "" };
        }
    }

    private handleAuthError(client: { authed: boolean; ws: WebSocket }) {
        this.logger.error("Error validating auth");
        client.ws?.send(
            JSON.stringify({
                success: false,
                message: "Error validating auth",
            })
        );
        client.ws?.close();
    }

    private async validateAuth(token: string, authOptions?: AuthOptions): Promise<boolean> {
        if (!authOptions) {
            return true;
        }
        const authPromise = new Promise<boolean>((resolve, reject) => {
            try {
                auth(authOptions)(
                    {
                        headers: {
                            authorization: `Bearer ${token}`,
                        },
                        is: (type: string | string[]): string | boolean => {
                            if (type === "urlencoded") {
                                return true;
                            }
                            return false;
                        }
                    } as Request<ParamsDictionary, any, any, QueryString.ParsedQs, Record<string, any>>,
                    {} as Response<any>,
                    (err: any) => {
                        if (err) {
                            this.logger.error(`validateAuth() inside error=${err}`);
                            reject(err);
                            return;
                        }
                        this.logger.debug(`validateAuth() token authenticated`);
                        resolve(true);
                    }
                );
            } catch (err) {
                this.logger.error(`validateAuth() error=${err}`);
                reject(err);
            }
        });

        await authPromise.then((authed) => {
            return authed;
        }).catch((err) => {
            this.logger.error(`validateAuth() error=${err}`);
            return false;
        });

        return authPromise;
    }
}