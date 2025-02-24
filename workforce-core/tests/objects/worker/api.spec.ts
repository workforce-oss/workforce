import { expect } from "chai";
import { randomUUID } from "crypto";
import express, { Application } from "express";
import { auth } from "express-oauth2-jwt-bearer";
import expressWs from "express-ws";
import { setupServer } from "msw/node";
import { Sequelize } from "sequelize-typescript";
import request from "supertest";
import { CredentialDb } from "../../../src/objects/credential/db.js";
import { WorkerRouter } from "../../../src/objects/worker/api.js";
import { WorkerDb } from "../../../src/objects/worker/db.js";
import { WorkerConfig } from "../../../src/objects/worker/model.js";
import { createBasicWorker, createBasicWorkerConfig, createOrg, createUser, newDb } from "../../helpers/db.js";
import { createJwt, issuerHandlers } from "../../helpers/jwt.js";
import { CredentialConfig } from "../../../src/objects/credential/model.js";

describe("Worker API", () => {
    const app = expressWs(express() as unknown as expressWs.Application).app as unknown as Application & expressWs.WithWebsocketMethod;

    const basicCredentialConfig = (customOrgId?: string): CredentialConfig => ({
        name: "test-credential",
        description: "test",
        type: "mock-worker",
        orgId: customOrgId || orgId,
        variables: {
            output: "test"
        }
    });

    let sequelize: Sequelize;
    let orgId: string;
    let jwt: string;
    const server = setupServer(...issuerHandlers);

    before(async () => {
        sequelize = newDb();
        server.listen({ onUnhandledRequest: 'bypass' });
        app.use(auth({
            issuerBaseURL: 'https://localhost:3100/',
            audience: 'https://api/',
        }));
        orgId = randomUUID();
        jwt = await createJwt({ payload: { orgId } });

        app.use("/orgs/:orgId/workers", WorkerRouter)
    });
    beforeEach(async () => {
        await sequelize.sync({ force: true });
        await createOrg(orgId);
        const user = await createUser("test-user", orgId);
        jwt = await createJwt({ subject: user.id });
    });
    after(() => server.close());

    describe("POST /workers", () => {
        it("should create a new worker", async () => {
            const workerConfig: WorkerConfig = createBasicWorkerConfig(orgId);
            const credentialConfig: CredentialConfig = basicCredentialConfig();
            await CredentialDb.create(credentialConfig);
            workerConfig.credential = credentialConfig.name;

            const response = await request(app)
                .post(`/orgs/${orgId}/workers`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .send(workerConfig)
                .expect(201)

            const workerDb = await WorkerDb.findByPk(response.body.id);
            const retrievedWorkerConfig = workerDb!.toModel();
            retrievedWorkerConfig.credential = credentialConfig.name;

            workerConfig.id = workerDb!.id;

            expect(retrievedWorkerConfig).to.deep.equal(workerConfig);
            expect(response.body).to.deep.equal(workerConfig);
        });
        it("should not create a new worker for a different org", async () => {
            const otherOrgId = randomUUID();
            await createOrg(otherOrgId);

            const workerConfig: WorkerConfig = createBasicWorkerConfig(otherOrgId);
            await request(app)
                .post(`/orgs/${otherOrgId}/workers`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .send(workerConfig)
                .expect(404)
        });
        it("should not create a new worker for an invalid variables schema", async () => {
            const workerConfig: WorkerConfig = createBasicWorkerConfig(orgId);
            workerConfig.variables = {};

            await request(app)
                .post(`/orgs/${orgId}/workers`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .send(workerConfig)
                .expect(400)
        });
    });
    describe("GET /workers/:id", () => {
        it("should retrieve a worker", async () => {
            const credentialConfig: CredentialConfig = basicCredentialConfig();
            const credentialDb = await CredentialDb.create(credentialConfig);

            const workerDb = await createBasicWorker(orgId);
            workerDb.credentialId = credentialDb.id!;
            await workerDb.save();

            const response = await request(app)
                .get(`/orgs/${orgId}/workers/${workerDb.id}`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .expect(200)

            const retrievedWorkerDb = await WorkerDb.findByPk(workerDb.id);
            const retrievedWorkerConfig = retrievedWorkerDb!.toModel();
            retrievedWorkerConfig.credential = credentialConfig.name;


            expect(response.body).to.deep.equal(retrievedWorkerConfig);
        });
        it("should not retrieve a worker for a different org", async () => {
            const otherOrgId = randomUUID();
            await createOrg(otherOrgId);

            const credentialConfig: CredentialConfig = basicCredentialConfig(otherOrgId);
            await CredentialDb.create(credentialConfig);

            const workerConfig: WorkerConfig = createBasicWorkerConfig(otherOrgId);
            workerConfig.credential = credentialConfig.id!;

            const workerDb = new WorkerDb().loadModel(workerConfig);
            workerConfig.id = workerDb.id;
            await workerDb.save();

            await request(app)
                .get(`/orgs/${orgId}/workers/${workerDb.id}`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .expect(404)
        });
    });
    describe("GET /workers", () => {
        it("should retrieve all workers for an org", async () => {
            const credentialConfig: CredentialConfig = basicCredentialConfig();
            const credentialDb = await CredentialDb.create(credentialConfig);

            const workerConfig: WorkerConfig = createBasicWorkerConfig(orgId);
            workerConfig.credential = credentialDb.id!;

            const workerDb = new WorkerDb().loadModel(workerConfig);
            workerConfig.id = workerDb.id;
            await workerDb.save();

            const response = await request(app)
                .get(`/orgs/${orgId}/workers`)
                .set("Authorization", `Bearer ${jwt}`)
                .expect(200)

            workerConfig.credential = credentialConfig.name;

            expect(response.body).to.deep.equal([workerConfig]);
        });

        it("should not retrieve workers for a different org", async () => {
            const otherOrgId = randomUUID();
            await createOrg(otherOrgId);

            const credentialConfig: CredentialConfig = basicCredentialConfig();
            await CredentialDb.create(credentialConfig);

            const workerConfig: WorkerConfig = createBasicWorkerConfig(otherOrgId);
            workerConfig.credential = credentialConfig.id!;

            const workerDb = new WorkerDb().loadModel(workerConfig);
            workerConfig.id = workerDb.id;
            await workerDb.save();

            const response = await request(app)
                .get(`/orgs/${otherOrgId}/workers`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .expect(404)

            expect(response.body).to.deep.equal({});
        });
    });
    describe("PUT /workers/:id", () => {
        it("should update a worker", async () => {
            const credentialConfig: CredentialConfig = basicCredentialConfig();
            await CredentialDb.create(credentialConfig);

            const workerConfig: WorkerConfig = createBasicWorkerConfig(orgId);
            workerConfig.credential = credentialConfig.id!;

            const workerDb = new WorkerDb().loadModel(workerConfig);
            workerConfig.id = workerDb.id;
            await workerDb.save();

            const updatedWorkerConfig: WorkerConfig = createBasicWorkerConfig(orgId);
            updatedWorkerConfig.credential = credentialConfig.name;
            updatedWorkerConfig.name = "updated name";

            await request(app)
                .put(`/orgs/${orgId}/workers/${workerDb.id}`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .send(updatedWorkerConfig)
                .expect(200)

            const updatedWorkerDb = await WorkerDb.findByPk(workerDb.id);
            const retrievedWorkerConfig = updatedWorkerDb!.toModel();
            retrievedWorkerConfig.credential = credentialConfig.name;

            updatedWorkerConfig.id = workerDb.id;

            expect(retrievedWorkerConfig).to.deep.equal(updatedWorkerConfig);
        });
        it("should not update a worker for a different org", async () => {
            const otherOrgId = randomUUID();
            await createOrg(otherOrgId);

            const credentialConfig: CredentialConfig = basicCredentialConfig(otherOrgId);
            await CredentialDb.create(credentialConfig);

            const workerConfig: WorkerConfig = createBasicWorkerConfig(otherOrgId);
            workerConfig.credential = credentialConfig.id!;

            const workerDb = new WorkerDb().loadModel(workerConfig);
            workerConfig.id = workerDb.id;
            await workerDb.save();

            const updatedWorkerConfig: WorkerConfig = createBasicWorkerConfig(otherOrgId);

            await request(app)
                .put(`/orgs/${orgId}/workers/${workerDb.id}`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .send(updatedWorkerConfig)
                .expect(404)
        });
        it("should not update a worker for a with an invalid variables schema", async () => {
            const credentialConfig: CredentialConfig = basicCredentialConfig();
            await CredentialDb.create(credentialConfig);

            const workerConfig: WorkerConfig = createBasicWorkerConfig(orgId);
            workerConfig.credential = credentialConfig.id!;

            const workerDb = new WorkerDb().loadModel(workerConfig);
            workerConfig.id = workerDb.id;
            await workerDb.save();

            const updatedWorkerConfig: WorkerConfig = createBasicWorkerConfig(orgId);
            updatedWorkerConfig.variables = {};

            await request(app)
                .put(`/orgs/${orgId}/workers/${workerDb.id}`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .send(updatedWorkerConfig)
                .expect(400)
        });
    });
    describe("DELETE /workers/:id", () => {
        it("should delete a worker", async () => {
            const credentialConfig: CredentialConfig = basicCredentialConfig();
            await CredentialDb.create(credentialConfig);

            const workerConfig: WorkerConfig = createBasicWorkerConfig(orgId);
            workerConfig.credential = credentialConfig.id!;

            const workerDb = new WorkerDb().loadModel(workerConfig);
            workerConfig.id = workerDb.id;
            await workerDb.save();

            await request(app)
                .delete(`/orgs/${orgId}/workers/${workerDb.id}`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .expect(200)

            const retrievedWorkerDb = await WorkerDb.findByPk(workerDb.id);
            expect(retrievedWorkerDb).to.be.null;
        });
        it("should not delete a worker for a different org", async () => {
            const otherOrgId = randomUUID();
            await createOrg(otherOrgId);

            const credentialConfig: CredentialConfig = basicCredentialConfig(otherOrgId);
            await CredentialDb.create(credentialConfig);

            const workerConfig: WorkerConfig = createBasicWorkerConfig(otherOrgId);
            workerConfig.credential = credentialConfig.id!;

            const workerDb = new WorkerDb().loadModel(workerConfig);
            workerConfig.id = workerDb.id;
            await workerDb.save();

            await request(app)
                .delete(`/orgs/${otherOrgId}/workers/${workerDb.id}`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .expect(404)
        });
    });
});