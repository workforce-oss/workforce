import { expect } from "chai";

import { randomUUID } from "crypto";
import express from "express";
import { auth } from "express-oauth2-jwt-bearer";
import expressWs from "express-ws";
import { setupServer } from "msw/node";
import { Sequelize } from "sequelize-typescript";
import request from "supertest";
import { ChannelMessageRoutes } from "../../../src/objects/channel/api.message.js";
import { createBasicChannel, createBasicFlow, createBasicTask, createChannelMessage, createOrg, createTaskExecution, createUser, newDb } from "../../helpers/db.js";
import { createJwt, issuerHandlers } from "../../helpers/jwt.js";

describe("Channel Message API", () => {
    const { app, getWss, applyTo } = expressWs(express());
    let sequelize: Sequelize;
    let orgId: string;
    let jwt: string;
    const server = setupServer(...issuerHandlers);

    
    before(async () => {
        sequelize = newDb();
        server.listen({ onUnhandledRequest: "bypass"});
        app.use(auth({
            issuerBaseURL: 'https://localhost:3100/',
            audience: 'https://api/',
        }));
        orgId = randomUUID();

        app.use("/channel-messages", ChannelMessageRoutes);
    });
    beforeEach(async () => {
        await sequelize.sync({ force: true });
        await createOrg(orgId);
        const user = await createUser("test-user", orgId);
        jwt = await createJwt({ subject: user.id });

    });
   
    after(async () => {
        server.close();
    });

    describe("GET /channel-messages", () => {
        it("should retrieve all channel messages for a given task execution", async () => {
            const flow = await createBasicFlow(orgId);
            const channel = await createBasicChannel(orgId, flow.id);
            const task = await createBasicTask(orgId, flow.id);
            const taskExecution = await createTaskExecution(orgId, task.id);
            const channelMessage1 = await createChannelMessage(channel.id, taskExecution.id);
            const channelMessage2 = await createChannelMessage(channel.id, taskExecution.id);


            const response = await request(app)
                .get("/channel-messages")
                .set("Authorization", `Bearer ${jwt}`)
                .query({ taskExecutionId: taskExecution.id, orgId: orgId })
                .expect(200);
            expect(response.body.length).to.equal(2);
        });
        it("should return 400 if taskExecutionId is missing", async () => {
            const response = await request(app)
                .get("/channel-messages")
                .set("Authorization", `Bearer ${jwt}`)
                .query({ orgId: orgId })
                .expect(400);
        });
        it("should return no results if the channel does not belong to the org", async () => {
            const otherOrgId = randomUUID();
            await createOrg(otherOrgId);
            
            const flow = await createBasicFlow(otherOrgId);
            const channel = await createBasicChannel(otherOrgId, flow.id);
            const task = await createBasicTask(otherOrgId, flow.id);
            const taskExecution = await createTaskExecution(otherOrgId, task.id);
            const channelMessage1 = await createChannelMessage(channel.id, taskExecution.id);
            const channelMessage2 = await createChannelMessage(channel.id, taskExecution.id);

            const response = await request(app)
                .get("/channel-messages")
                .set("Authorization", `Bearer ${jwt}`)
                .query({ taskExecutionId: taskExecution.id, orgId: orgId })
                .expect(200);

            expect(response.body.length).to.equal(0);
            
        });
    });
});

