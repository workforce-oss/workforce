import { expect } from "chai";
import { randomUUID } from "crypto";
import express, { Application } from "express";
import { auth } from "express-oauth2-jwt-bearer";
import expressWs from "express-ws";
import { setupServer } from "msw/node";
import { Sequelize } from "sequelize-typescript";
import request from "supertest";
import { ChannelRouter } from "../../../src/objects/channel/api.js";
import { ChannelDb } from "../../../src/objects/channel/db.js";
import { ChannelConfig } from "../../../src/objects/channel/model.js";
import { createBasicChannel, createBasicChannelConfig, createBasicFlow, createBasicTask, createChannelMessage, createOrg, createTaskExecution, createUser, newDb } from "../../helpers/db.js";
import { createJwt, issuerHandlers } from "../../helpers/jwt.js";

describe("Channel API", () => {
    const app = expressWs(express() as unknown as expressWs.Application).app as unknown as Application & expressWs.WithWebsocketMethod;

    let sequelize: Sequelize;
    let orgId: string;
    let jwt: string;
    const server = setupServer(...issuerHandlers);

    before(async () => {
        sequelize = newDb();
        server.listen({
            onUnhandledRequest: "bypass",
        });
        app.use(auth({
            issuerBaseURL: 'https://localhost:3100/',
            audience: 'https://api/',
        }));
        orgId = randomUUID();

        app.use("/orgs/:orgId/flows/:flowId/channels", ChannelRouter)
    });
    beforeEach(async () => {
        await sequelize.sync({ force: true });
        await createOrg(orgId);
        const user = await createUser("test-user", orgId);
        jwt = await createJwt({ subject: user.id });

    });
    after(() => server.close());

    describe("POST /channels", () => {
        it("should create a new channel", async () => {
            const flow = await createBasicFlow(orgId);

            const channelConfig = createBasicChannelConfig(orgId, flow.id);

            const response = await request(app)
                .post(`/orgs/${orgId}/flows/${flow.id}/channels`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .send(channelConfig)
                .expect(201)

            const channelDb = await ChannelDb.findByPk(response.body.id);
            const retrievedChannelConfig = channelDb!.toModel();
            channelConfig.id = channelDb!.id;

            expect(retrievedChannelConfig).to.deep.equal(channelConfig);
            expect(response.body).to.deep.equal(channelConfig);
        });
        it("should not create a new channel for a different org", async () => {
            const otherOrgId = randomUUID();
            await createOrg(otherOrgId);

            const flow = await createBasicFlow(otherOrgId);

            const channelConfig: ChannelConfig = createBasicChannelConfig(otherOrgId, flow.id);
            await request(app)
                .post(`/orgs/${otherOrgId}/flows/${flow.id}/channels`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .send(channelConfig)
                .expect(404)
        });
        it("should not create a new channel for an invalid variables schema", async () => {
            const flow = await createBasicFlow(orgId);

            const channelConfig: ChannelConfig = createBasicChannelConfig(orgId, flow.id);
            channelConfig.variables = {};

            await request(app)
                .post(`/orgs/${orgId}/flows/${flow.id}/channels`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .send(channelConfig)
                .expect(400)
        });
    });
    describe("GET /channels/:id", () => {
        it("should retrieve a channel", async () => {
            const flow = await createBasicFlow(orgId);
            const channelConfig: ChannelConfig = (await createBasicChannel(orgId, flow.id)).toModel();

            const response = await request(app)
                .get(`/orgs/${orgId}/flows/${flow.id}/channels/${channelConfig.id}`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .expect(200)

            expect(response.body).to.deep.equal(channelConfig);
        });
        it("should not retrieve a channel for a different org", async () => {
            const otherOrgId = randomUUID();
            await createOrg(otherOrgId);

            const flow = await createBasicFlow(otherOrgId);

            const channelConfig: ChannelConfig = (await createBasicChannel(otherOrgId, flow.id)).toModel();

            await request(app)
                .get(`/orgs/${otherOrgId}/flows/${flow.id}/channels/${channelConfig.id}`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .expect(404)
        });
    });
    describe("GET /channels", () => {
        it("should retrieve all channels for a flow", async () => {
            const flow = await createBasicFlow(orgId);
            const channelConfig: ChannelConfig = (await createBasicChannel(orgId, flow.id)).toModel();

            const response = await request(app)
                .get(`/orgs/${orgId}/flows/${flow.id}/channels`)
                .set("Authorization", `Bearer ${jwt}`)
                .expect(200)

            expect(response.body).to.deep.equal([channelConfig]);
        });

        it("should not retrieve channels for a different org", async () => {
            const otherOrgId = randomUUID();
            await createOrg(otherOrgId);

            const flow = await createBasicFlow(otherOrgId);
            const channelConfig: ChannelConfig = (await createBasicChannel(otherOrgId, flow.id)).toModel();

            const response = await request(app)
                .get(`/orgs/${orgId}/flows/${flow.id}/channels`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .expect(200)

            expect(response.body).to.deep.equal([]);
        });
    });
    describe("PUT /channels/:id", () => {
        it("should update a channel", async () => {
            const flow = await createBasicFlow(orgId);
            const channelConfig: ChannelConfig = (await createBasicChannel(orgId, flow.id)).toModel();

            channelConfig.name = "updated name";

            await request(app)
                .put(`/orgs/${orgId}/flows/${flow.id}/channels/${channelConfig.id}`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .send(channelConfig)
                .expect(200)

            const updatedChannelDb = await ChannelDb.findByPk(channelConfig.id);
            const retrievedChannelConfig = updatedChannelDb!.toModel();

            expect(retrievedChannelConfig).to.deep.equal(channelConfig);
        });
        it("should not update a channel for a different org", async () => {
            const otherOrgId = randomUUID();
            await createOrg(otherOrgId);
            const flow = await createBasicFlow(otherOrgId);
            const channelConfig: ChannelConfig = (await createBasicChannel(otherOrgId, flow.id)).toModel();
            channelConfig.name = "updated name";

            await request(app)
                .put(`/orgs/${otherOrgId}/flows/${flow.id}/channels/${channelConfig.id}`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .send(channelConfig)
                .expect(404)

            await request(app)
                .put(`/orgs/${orgId}/flows/${flow.id}/channels/${channelConfig.id}`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .send(channelConfig)
                .expect(404)
        });
        it("should not update a channel for a with an invalid variables schema", async () => {
            const flow = await createBasicFlow(orgId);
            const channelConfig: ChannelConfig = (await createBasicChannel(orgId, flow.id)).toModel();

            channelConfig.variables = {};

            await request(app)
                .put(`/orgs/${orgId}/flows/${flow.id}/channels/${channelConfig.id}`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .send(channelConfig)
                .expect(400)
        });
    });
    describe("DELETE /channels/:id", () => {
        it("should delete a channel", async () => {
            const flow = await createBasicFlow(orgId);
            const channelConfig: ChannelConfig = (await createBasicChannel(orgId, flow.id)).toModel();

            await request(app)
                .delete(`/orgs/${orgId}/flows/${flow.id}/channels/${channelConfig.id}`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .expect(200)

            const retrievedChannelDb = await ChannelDb.findByPk(channelConfig.id);
            expect(retrievedChannelDb).to.be.null;
        });
        it("should not delete a channel for a different org", async () => {
            const otherOrgId = randomUUID();
            await createOrg(otherOrgId);
            const flow = await createBasicFlow(otherOrgId);
            const channelConfig: ChannelConfig = (await createBasicChannel(otherOrgId, flow.id)).toModel();

            await request(app)
                .delete(`/orgs/${otherOrgId}/flows/${flow.id}/channels/${channelConfig.id}`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .expect(404)
        });
    });

    describe("GET /channels/:channelId/messages", () => {
        it("should retrieve all channel messages for a given channel", async () => {
            const flow = await createBasicFlow(orgId);
            const channel = await createBasicChannel(orgId, flow.id);
            const task = await createBasicTask(orgId, flow.id);
            const taskExecution = await createTaskExecution(orgId, task.id);

            await createChannelMessage(channel.id, taskExecution.id);
            await createChannelMessage(channel.id, taskExecution.id);


            const response = await request(app)
                .get(`/orgs/${orgId}/flows/${flow.id}/channels/${channel.id}/messages`)
                .set("Authorization", `Bearer ${jwt}`)
                .expect(200);
            expect(response.body.length).to.equal(2);
        });

        it("should return no results if the channel does not belong to the org", async () => {
            const otherOrgId = randomUUID();
            await createOrg(otherOrgId);

            const flow = await createBasicFlow(otherOrgId);
            const channel = await createBasicChannel(otherOrgId, flow.id);
            const task = await createBasicTask(otherOrgId, flow.id);
            const taskExecution = await createTaskExecution(otherOrgId, task.id);

            await createChannelMessage(channel.id, taskExecution.id);
            await createChannelMessage(channel.id, taskExecution.id);

            const response = await request(app)
                .get(`/orgs/${otherOrgId}/flows/${flow.id}/channels/${channel.id}/messages`)
                .set("Authorization", `Bearer ${jwt}`)
                .expect(404);

            expect(response.body).be.empty;

        });
    });
});