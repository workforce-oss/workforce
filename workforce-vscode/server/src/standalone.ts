import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import expressWs from "express-ws";
import { SocketMessage } from "lib";
import { Subject } from "rxjs";
import { handleRequest } from "./api";
import { getWebhookSocketHandler } from "./socket";

try {
    const subject: Subject<SocketMessage> = new Subject();
    const buffer: SocketMessage[] = [];
    const clients: Set<any> = new Set();
    const connect = async () => {
        const { app, getWss, applyTo } = expressWs(express());
        app.use(cors())
        app.ws(
            "/socket",
            getWebhookSocketHandler(subject, clients, buffer)
        )
        app.get("/projects", async (req, res) => {
            await handleRequest(req, res, subject, clients, buffer,"ListProjectsRequest", "ListProjectsResponse");
        });

        app.get("/projects/:slug", async (req, res) => {
            await handleRequest(req, res, subject, clients, buffer,"GetProjectRequest", "GetProjectResponse");
        });

        app.get("/projects/:slug/projectFileFunction", async (req, res) => {
            await handleRequest(req, res, subject, clients, buffer,"GetProjectFileFunctionTextRequest", "GetProjectFileFunctionTextResponse");
        });

        app.get("/projects/:slug/projectFile", async (req, res) => {
            await handleRequest(req, res, subject, clients, buffer,"GetProjectFileRequest", "GetProjectFileResponse");
        });

        app.post("/projects", bodyParser.json(), async (req, res) => {
            await handleRequest(req, res, subject, clients, buffer,"CreateProjectRequest", "CreateProjectResponse");
        });

        app.get("/referenceProjects", bodyParser.json(), async (req, res) => {
            return await handleRequest(req, res, subject, clients, buffer,"ListReferenceProjectsRequest", "ListReferenceProjectsResponse");
        });

        app.get("/referenceProjects/:slug", async (req, res) => {
            await handleRequest(req, res, subject, clients, buffer,"GetReferenceProjectRequest", "GetReferenceProjectResponse");
        });

        app.post("/executionPlans", bodyParser.json(), async (req, res) => {
            await handleRequest(req, res, subject, clients, buffer,"ExecutionPlanRequest", "ExecutionPlanResponse");
        });

        app.post("/executeStep", bodyParser.json(), async (req, res) => {
            await handleRequest(req, res, subject, clients, buffer,"ExecuteStepRequest", "ExecutionStepResponse");
        });

        app.post("/commitAndPush", bodyParser.json(), async (req, res) => {
            await handleRequest(req, res, subject, clients, buffer,"CommitAndPushRequest", "CommitAndPushResponse");
        });

        app.post("/checkOutBranch", bodyParser.json(), async (req, res) => {
            await handleRequest(req, res, subject, clients, buffer,"CheckOutBranchRequest", "CheckOutBranchResponse");
        });

        app.get("/api/healthz", async (req, res) => {
            await handleRequest(req, res, subject, clients, buffer,"HealthCheckRequest", "HealthCheckResponse");
        });

        app.listen(process.env.PORT || 3190, () => {
            console.log(`Server is listening on port ${process.env.PORT || 3190}`);
        });    
    }


    connect().catch((e) => {
        console.error(e);
        process.exit(1);
    });
} catch (e) {
    console.error(e);
    process.exit(1);
}