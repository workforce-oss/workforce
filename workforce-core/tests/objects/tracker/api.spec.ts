import { expect } from "chai";
import { randomUUID } from "crypto";
import express, { Application } from "express";
import { auth } from "express-oauth2-jwt-bearer";
import expressWs from "express-ws";
import { setupServer } from "msw/node";
import { Sequelize } from "sequelize-typescript";
import request from "supertest";
import { TrackerRouter } from "../../../src/objects/tracker/api.js";
import { TrackerDb } from "../../../src/objects/tracker/db.js";
import { TrackerConfig } from "../../../src/objects/tracker/model.js";
import { createBasicFlow, createBasicTracker, createBasicTrackerConfig, createOrg, createUser, newDb } from "../../helpers/db.js";
import { createJwt, issuerHandlers } from "../../helpers/jwt.js";

describe("Tracker API", () => {
	const app = expressWs(express() as unknown as expressWs.Application).app as unknown as Application & expressWs.WithWebsocketMethod;

	let sequelize: Sequelize;
	let orgId: string;
	let jwt: string;
	const server = setupServer(...issuerHandlers);

	before(async () => {
		sequelize = newDb();
		server.listen({ onUnhandledRequest: "bypass" });
		app.use(
			auth({
				issuerBaseURL: "https://localhost:3100/",
				audience: "https://api/",
			})
		);
		orgId = randomUUID();
		jwt = await createJwt({ payload: { orgId } });

		app.use("/orgs/:orgId/flows/:flowId/trackers", TrackerRouter);
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

	describe("POST /trackers", () => {
		it("should create a new tracker", async () => {
			const flow = await createBasicFlow(orgId);
			const trackerConfig = createBasicTrackerConfig(orgId, flow.id);

			const response = await request(app)
				.post(`/orgs/${orgId}/flows/${flow.id}/trackers`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.send(trackerConfig)
				.expect(201);

			const trackerDb = await TrackerDb.findByPk(response.body.id);
			const retrievedTrackerConfig = trackerDb!.toModel();
			trackerConfig.id = trackerDb!.id;

			expect(retrievedTrackerConfig).to.deep.equal(trackerConfig);
			expect(response.body).to.deep.equal(trackerConfig);
		});
		it("should not create a new tracker for a different org", async () => {
			const otherOrgId = randomUUID();
			await createOrg(otherOrgId);

			const flow = await createBasicFlow(otherOrgId);
			const trackerConfig = createBasicTrackerConfig(otherOrgId, flow.id);
			await request(app)
				.post(`/orgs/${otherOrgId}/flows/${flow.id}/trackers`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.send(trackerConfig)
				.expect(404);
		});
		it("should not create a new tracker for an invalid variables schema", async () => {
			const flow = await createBasicFlow(orgId);
			const trackerConfig = createBasicTrackerConfig(orgId, flow.id);
			trackerConfig.variables = {};

			await request(app)
				.post(`/orgs/${orgId}/flows/${flow.id}/trackers`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.send(trackerConfig)
				.expect(400);
		});
	});
	describe("GET /trackers/:id", () => {
		it("should retrieve a tracker", async () => {
			const flow = await createBasicFlow(orgId);
			const trackerDb = await createBasicTracker(orgId, flow.id);

			const response = await request(app)
				.get(`/orgs/${orgId}/flows/${flow.id}/trackers/${trackerDb.id}`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.expect(200);

			expect(response.body).to.deep.equal(trackerDb.toModel());
		});
		it("should not retrieve a tracker for a different org", async () => {
			const otherOrgId = randomUUID();
			await createOrg(otherOrgId);

			const flow = await createBasicFlow(otherOrgId);
			const trackerDb = await createBasicTracker(otherOrgId, flow.id);

			await request(app)
				.get(`/orgs/${otherOrgId}/flows/${flow.id}/trackers/${trackerDb.id}`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.expect(404);
		});
	});
	describe("GET /trackers", () => {
		it("should retrieve all trackers for a flow", async () => {
			const flow = await createBasicFlow(orgId);
			const trackerDb = await createBasicTracker(orgId, flow.id);

			const response = await request(app)
				.get(`/orgs/${orgId}/flows/${flow.id}/trackers`)
				.set("Authorization", `Bearer ${jwt}`);

			expect(response.body).to.deep.equal([trackerDb.toModel()]);
		});

		it("should not retrieve trackers for a different org", async () => {
			const otherOrgId = randomUUID();
			await createOrg(otherOrgId);

			const flow = await createBasicFlow(otherOrgId);
			const trackerDb = await createBasicTracker(otherOrgId, flow.id);

			const response = await request(app)
				.get(`/orgs/${orgId}/flows/${flow.id}/trackers`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.expect(200);

			expect(response.body).to.deep.equal([]);
		});
	});
	describe("PUT /trackers/:id", () => {
		it("should update a tracker", async () => {
			const flow = await createBasicFlow(orgId);
			const trackerDb = await createBasicTracker(orgId, flow.id);

			const updatedTrackerConfig: TrackerConfig = trackerDb.toModel();
			updatedTrackerConfig.name = "updated name";

			await request(app)
				.put(`/orgs/${orgId}/flows/${flow.id}/trackers/${trackerDb.id}`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.send(updatedTrackerConfig)
				.expect(200);

			const updatedTrackerDb = await TrackerDb.findByPk(trackerDb.id);
			const retrievedTrackerConfig = updatedTrackerDb!.toModel();
			updatedTrackerConfig.id = trackerDb.id;

			expect(retrievedTrackerConfig).to.deep.equal(updatedTrackerConfig);
		});
		it("should not update a tracker for a different org", async () => {
			const otherOrgId = randomUUID();
			await createOrg(otherOrgId);

			const flow = await createBasicFlow(otherOrgId);
			const trackerDb = await createBasicTracker(otherOrgId, flow.id);

			const updatedTrackerConfig: TrackerConfig = trackerDb.toModel();
			await request(app)
				.put(`/orgs/${orgId}/flows/${flow.id}/trackers/${trackerDb.id}`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.send(updatedTrackerConfig)
				.expect(404);
		});
		it("should not update a tracker for a with an invalid variables schema", async () => {
			const flow = await createBasicFlow(orgId);
			const trackerDb = await createBasicTracker(orgId, flow.id);

			const updatedTrackerConfig: TrackerConfig = trackerDb.toModel();
			updatedTrackerConfig.variables = {};

			await request(app)
				.put(`/orgs/${orgId}/flows/${flow.id}/trackers/${trackerDb.id}`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.send(updatedTrackerConfig)
				.expect(400);
		});
	});
	describe("DELETE /trackers/:id", () => {
		it("should delete a tracker", async () => {
			const flow = await createBasicFlow(orgId);
			const trackerDb = await createBasicTracker(orgId, flow.id);

			await request(app)
				.delete(`/orgs/${orgId}/flows/${flow.id}/trackers/${trackerDb.id}`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.expect(200);

			const retrievedTrackerDb = await TrackerDb.findByPk(trackerDb.id);
			expect(retrievedTrackerDb).to.be.null;
		});
		it("should not delete a tracker for a different org", async () => {
			const otherOrgId = randomUUID();
			await createOrg(otherOrgId);
			
			const flow = await createBasicFlow(otherOrgId);
			const trackerDb = await createBasicTracker(otherOrgId, flow.id);

			await request(app)
				.delete(`/orgs/${otherOrgId}/flows/${flow.id}/trackers/${trackerDb.id}`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.expect(404);
		});
	});
});
