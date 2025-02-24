import { CheckOutBranchRequest, CommitAndPushRequest, ConvertToReferenceProjectRequest, CreateProjectRequest, ExecuteStepRequest, ExecutionPlan, ExecutionStep, GetProjectFileFunctionTextRequest, GetProjectFileRequest, GetProjectFileResponse, GetProjectResponse, GetRequest, ListProjectsResponse, ListReferenceProjectsResponse, Project, SocketMessage } from "lib";
import { WebSocket } from "ws";
import { CodingService } from "../api/_service";
import * as vscode from 'vscode';
import { Auth } from "../../auth/auth";
import { GitProvider } from "../scm/git";

export class WorkforceSocketService {
    socket?: WebSocket;
    codingService: CodingService;
    scmProvider: GitProvider;
    channel: vscode.OutputChannel;
    url: string;

    constructor(url: string, codingService: CodingService, channel: vscode.OutputChannel, scmProvider: GitProvider) {
        this.channel = channel;
        this.codingService = codingService;
        this.scmProvider = scmProvider;
        this.url = url;

        try {
            this.socket = new WebSocket(url);
            this.init();
        } catch (err) {
            this.channel.appendLine('Error: ' + err);
        }
    }

    connect(): void {
        this.channel.appendLine('connect');
        try {
            this.socket = new WebSocket(this.url);
            this.init();
        } catch (err) {
            this.channel.appendLine('Error: ' + err);
            setTimeout(() => {
                this.connect();
            }, 5000);
        }
    }

    init(): void {
        this.channel.appendLine('init');
        const authEnabled = vscode.workspace.getConfiguration('workforce-vscode').get('authEnabled') as boolean;

        this.socket?.on('open', () => {
            this.channel.appendLine('Connected to server');
            if (authEnabled) {
                Auth.session().then((session) => {
                    if (!session?.auth.accessToken) {
                        throw new Error("No access token");
                    }
                    this.socket?.send(JSON.stringify({ token: session?.auth.accessToken }));
                }).catch((err) => {
                    this.channel.appendLine('Error: ' + err);
                });
            }
        });
        this.socket?.on('close', () => {
            this.channel.appendLine('Disconnected from server');
            setTimeout(() => {
                this.connect();
            }, 5000);
        });
        this.socket?.on('error', (err: Error) => {
            this.channel.appendLine('Error: ' + err);
        });
        this.socket?.on('message', (msg: string) => {
            const message = JSON.parse(msg) as SocketMessage;
            this.channel.appendLine('Received message: ' + msg);
            const correlationId = message.correlationId;
            const handleErrors = (err: any) => {
                this.channel.appendLine('Error: ' + err);
                this.socket?.send(JSON.stringify({
                    type: 'Error',
                    payload: {
                        message: JSON.stringify(err)
                    },
                    correlationId
                } as SocketMessage));
                /// Task complete callback should clear out channel session
            };
            try {
                if (authEnabled && (message as any).success === false) {
                    this.channel.appendLine('Error: ' + JSON.stringify(message));
                    Auth.logout().then(() => {
                        vscode.commands.executeCommand('workbench.action.webview.reloadWebviewAction');
                    }).catch((error) => {
                        this.channel.appendLine(error);
                    });
                }
                if (message.type === 'ListProjectsRequest') {
                    this.codingService.ListProjects().then(projects => {
                        this.socket?.send(JSON.stringify({
                            type: 'ListProjectsResponse',
                            payload: {
                                projects
                            } as ListProjectsResponse,
                            correlationId
                        } as SocketMessage));
                    }).catch(handleErrors);
                } else if (message.type === 'GetProjectRequest') {
                    this.codingService.GetProject((message.payload! as GetRequest).slug).then(data => {
                        this.socket?.send(JSON.stringify({
                            type: 'GetProjectResponse',
                            payload: {
                                project: data?.project,
                                machineState: data?.machineState
                            } as GetProjectResponse,
                            correlationId
                        } as SocketMessage));
                    }).catch(handleErrors);
                } else if (message.type === 'GetProjectFileRequest') {
                    this.codingService.GetProjectFile((message.payload! as GetRequest).slug, (message.payload! as GetProjectFileRequest).fileLocation).then(projectFile => {
                        this.socket?.send(JSON.stringify({
                            type: 'GetProjectFileResponse',
                            payload: {
                                projectFile
                            } as GetProjectFileResponse,
                            correlationId
                        } as SocketMessage));
                    }).catch(handleErrors);
                } else if (message.type === 'GetProjectFileFunctionTextRequest') {
                    this.codingService.GetProjectFileFunctionText((message.payload! as GetRequest).slug, (message.payload! as GetProjectFileFunctionTextRequest).fileLocation, (message.payload! as GetProjectFileFunctionTextRequest).functionName).then(text => {
                        this.socket?.send(JSON.stringify({
                            type: 'GetProjectFileFunctionTextResponse',
                            payload: {
                                text
                            },
                            correlationId
                        } as SocketMessage));
                    }).catch(handleErrors);
                } else if (message.type === "CreateProjectRequest") {
                    if (message.payload) {
                        this.codingService.CreateProject(message.payload! as Project).then(project => {
                            this.socket?.send(JSON.stringify({
                                type: 'CreateProjectResponse',
                                payload: {
                                    project
                                },
                                correlationId
                            } as SocketMessage));
                        }).catch(handleErrors);
                    }
                } else if (message.type === 'ConvertToReferenceProjectRequest') {
                    if (message.payload) {
                        this.codingService.ConvertToReferenceProject((message.payload! as ConvertToReferenceProjectRequest).existingProjectSlug, (message.payload! as ConvertToReferenceProjectRequest).newName, (message.payload! as ConvertToReferenceProjectRequest).newLocation, (message.payload! as ConvertToReferenceProjectRequest).newDescription, (message.payload! as ConvertToReferenceProjectRequest).projectFileTypes).then(referenceProject => {
                            this.socket?.send(JSON.stringify({
                                type: 'ConvertToReferenceProjectResponse',
                                payload: {
                                    referenceProject
                                },
                                correlationId
                            } as SocketMessage));
                        }).catch(handleErrors);
                    }
                } else if (message.type === 'ListReferenceProjectsRequest') {
                    this.codingService.ListReferenceProjects().then(referenceProjects => {
                        this.socket?.send(JSON.stringify({
                            type: 'ListReferenceProjectsResponse',
                            payload: {
                                referenceProjects
                            } as ListReferenceProjectsResponse,
                            correlationId
                        } as SocketMessage));
                    }).catch(handleErrors);
                } else if (message.type === 'GetReferenceProjectRequest') {
                    this.codingService.GetReferenceProject((message.payload! as GetRequest).slug).then(referenceProject => {
                        this.socket?.send(JSON.stringify({
                            type: 'GetReferenceProjectResponse',
                            payload: {
                                referenceProject
                            },
                            correlationId
                        } as SocketMessage));
                    }).catch(handleErrors);
                } else if (message.type === 'ExecutionPlanRequest') {
                    this.codingService.CreateExecutionPlan(message.payload! as ExecutionPlan).then(executionPlan => {
                        this.socket?.send(JSON.stringify({
                            type: 'ExecutionPlanResponse',
                            payload: executionPlan,
                            correlationId
                        } as SocketMessage));
                    }).catch(handleErrors);
                } else if (message.type === 'ExecuteStepRequest') {
                    this.codingService.ExecuteStep(message.payload! as ExecuteStepRequest).then(executionStep => {
                        this.socket?.send(JSON.stringify({
                            type: 'ExecutionStepResponse',
                            payload: executionStep,
                            correlationId
                        } as SocketMessage));
                    }).catch(handleErrors);
                } else if (message.type === 'HealthCheckRequest') {
                    this.socket?.send(JSON.stringify({
                        type: 'HealthCheckResponse',
                        payload: {
                            status: 'OK'
                        },
                        correlationId
                    } as SocketMessage));
                } else if (message.type === 'CommitAndPushRequest') {
                    this.scmProvider.commitAndPush(message.payload! as CommitAndPushRequest).then(branchName => {
                        this.socket?.send(JSON.stringify({
                            type: 'CommitAndPushResponse',
                            payload: {
                                actualBranch: branchName
                            },
                            correlationId
                        } as SocketMessage));
                    }).catch(handleErrors);
                } else if (message.type === 'CheckOutBranchRequest') {
                    this.scmProvider.checkoutBranch(message.payload! as CheckOutBranchRequest).then(branchName => {
                        this.socket?.send(JSON.stringify({
                            type: 'CheckOutBranchResponse',
                            payload: {
                                message: `Checked out ${branchName}`
                            },
                            correlationId
                        } as SocketMessage));
                    }).catch(handleErrors);
                }
            } catch (err) {
                handleErrors(err);
            }
        });
    }
}