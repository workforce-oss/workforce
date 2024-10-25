import { expect } from "chai";
import { randomUUID } from "crypto";
import express from "express";
import { auth } from "express-oauth2-jwt-bearer";
import expressWs from "express-ws";
import { setupServer } from "msw/node";
import { Sequelize } from "sequelize-typescript";
import request from "supertest";
import { TaskRouter } from "../../../src/objects/task/api.js";
import { TaskDb } from "../../../src/objects/task/db.js";
import { TaskConfig } from "../../../src/objects/task/model.js";
import { createBasicFlow, createBasicTask, createBasicTaskConfig, createOrg, createUser, newDb } from "../../helpers/db.js";
import { createJwt, issuerHandlers } from "../../helpers/jwt.js";

describe("Task API", () => {
    const { app, getWss, applyTo } = expressWs(express());

    let sequelize: Sequelize;
    let orgId: string;
    let jwt: string;
    const server = setupServer(...issuerHandlers);
    before(async () => {
        sequelize = newDb();
        server.listen({ onUnhandledRequest: 'bypass'});
        app.use(auth({
            issuerBaseURL: 'https://localhost:3100/',
            audience: 'https://api/',
        }));
        orgId = randomUUID();

        app.use("/orgs/:orgId/flows/:flowId/tasks", TaskRouter)
    });
    beforeEach(async () => {
        await sequelize.sync({ force: true });
        await createOrg(orgId);
        const user = await createUser("test-user", orgId);
        jwt = await createJwt({ subject: user.id });

    });
    after(async () => {
        server.close();
        await sequelize.close();
    });

    describe("POST /tasks", () => {
        it("should create a new task", async () => {
            const flow = await createBasicFlow(orgId);

            const taskConfig: TaskConfig = createBasicTaskConfig(orgId, flow.id);
            const response = await request(app)
                .post(`/orgs/${orgId}/flows/${flow.id}/tasks`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .send(taskConfig)
                .expect(201)

            const taskDb = await TaskDb.findByPk(response.body.id);
            const retrievedTaskConfig = taskDb!.toModel();
            taskConfig.id = taskDb!.id;

            expect(retrievedTaskConfig).to.deep.equal(taskConfig);
            expect(response.body).to.deep.equal(taskConfig);
        });
        it("should not create a new task for a different org", async () => {
            const otherOrgId = randomUUID();
            await createOrg(otherOrgId);

            const flow = await createBasicFlow(otherOrgId);
            
            const taskConfig: TaskConfig = createBasicTaskConfig(otherOrgId, flow.id);
            await request(app)
            .post(`/orgs/${otherOrgId}/flows/${flow.id}/tasks`)
            .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .send(taskConfig)
                .expect(404)
        });
        it("should not create a new task for an invalid variables schema", async () => {
            const flow = await createBasicFlow(orgId);

            const taskConfig: TaskConfig = createBasicTaskConfig(orgId, flow.id);
            taskConfig.variables = {};
            await request(app)
            .post(`/orgs/${orgId}/flows/${flow.id}/tasks`)
            .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .send(taskConfig)
                .expect(400)
        });
    });
    describe("GET /tasks/:id", () => {
        it("should retrieve a task", async () => {
            const flow = await createBasicFlow(orgId);
            const taskDb = await createBasicTask(orgId, flow.id);

            const response = await request(app)
                .get(`/orgs/${orgId}/flows/${flow.id}/tasks/${taskDb.id}`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .expect(200)

            expect(response.body).to.deep.equal(taskDb.toModel());
        });
        it("should not retrieve a task for a different org", async () => {
            const otherOrgId = randomUUID();
            await createOrg(otherOrgId);

            const flow = await createBasicFlow(otherOrgId);
            const taskDb = await createBasicTask(otherOrgId, flow.id);

            await request(app)
                .get(`/orgs/${otherOrgId}/tasks/${taskDb.id}`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .expect(404)
        });
    });
    describe("GET /tasks", () => {
        it("should retrieve all tasks for a flow", async () => {
            const flow = await createBasicFlow(orgId);

            const taskDb = await createBasicTask(orgId, flow.id, undefined, undefined, true);

            const response = await request(app)
                .get(`/orgs/${orgId}/flows/${flow.id}/tasks`)
                .set("Authorization", `Bearer ${jwt}`)
                .expect(200)
            expect(response.body).to.deep.equal([taskDb.toModel()]);
        });
        
        it("should not retrieve tasks for a different org", async () => {
            const otherOrgId = randomUUID();
            await createOrg(otherOrgId);

            const flow = await createBasicFlow(otherOrgId);

            const taskDb = await createBasicTask(otherOrgId, flow.id);

            const response = await request(app)
                .get(`/orgs/${otherOrgId}/flows/${flow.id}/tasks`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .expect(404)

            expect(response.body).to.be.empty;
        });
    });
    describe("PUT /tasks/:id", () => {
        it("should update a task", async () => {
            const flow = await createBasicFlow(orgId);

            const taskDb = await createBasicTask(orgId, flow.id);

            const updatedTaskConfig: TaskConfig = taskDb.toModel();
            updatedTaskConfig.name = "updated name";

            await request(app)
                .put(`/orgs/${orgId}/flows/${flow.id}/tasks/${taskDb.id}`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .send(updatedTaskConfig)
                .expect(200)

            const updatedTaskDb = await TaskDb.findByPk(taskDb.id);
            const retrievedTaskConfig = updatedTaskDb!.toModel();
            updatedTaskConfig.id = taskDb.id;

            expect(retrievedTaskConfig).to.deep.equal(updatedTaskConfig);
        });
        it("should not update a task for a different org", async () => {
            const otherOrgId = randomUUID();
            await createOrg(otherOrgId);

            const flow = await createBasicFlow(otherOrgId);
            
            const taskDb = await createBasicTask(otherOrgId, flow.id);

            const updatedTaskConfig: TaskConfig = taskDb.toModel();
            updatedTaskConfig.name = "updated name";

            await request(app)
                .put(`/orgs/${otherOrgId}/flows{${flow.id}/tasks/${taskDb.id}`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .send(updatedTaskConfig)
                .expect(404)
        });
        it("should not update a task for a with an invalid variables schema", async () => {
            const flow = await createBasicFlow(orgId);
            const taskDb = await createBasicTask(orgId, flow.id);

            const updatedTaskConfig: TaskConfig = taskDb.toModel();
            updatedTaskConfig.variables = {};

            await request(app)
                .put(`/orgs/${orgId}/flows/${flow.id}/tasks/${taskDb.id}`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .send(updatedTaskConfig)
                .expect(400)
        });
    });
    describe("DELETE /tasks/:id", () => {
        it("should delete a task", async () => {
            const flow = await createBasicFlow(orgId);

            const taskDb = await createBasicTask(orgId, flow.id);

            await request(app)
                .delete(`/orgs/${orgId}/flows/${flow.id}/tasks/${taskDb.id}`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .expect(200)

            const retrievedTaskDb = await TaskDb.findByPk(taskDb.id);
            expect(retrievedTaskDb).to.be.null;
        });
        it("should not delete a task for a different org", async () => {
            const otherOrgId = randomUUID();
            await createOrg(otherOrgId);
            
            const flow = await createBasicFlow(otherOrgId);

            const taskDb = await createBasicTask(otherOrgId, flow.id);

            await request(app)
                .delete(`/orgs/${otherOrgId}/flows/${flow.id}/tasks/${taskDb.id}`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .expect(404)
        });
    });
});