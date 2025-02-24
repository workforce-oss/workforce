import { randomUUID } from "crypto";
import { Sequelize } from "sequelize-typescript";
import { ResourceDb } from "../../../src/objects/resource/db.js";
import { ResourceConfig } from "../../../src/objects/resource/model.js";
import express, { Application } from "express";
import expressWs from "express-ws";
import { auth } from "express-oauth2-jwt-bearer";
import { ResourceRouter } from "../../../src/objects/resource/api.js";
import request from "supertest";
import { createJwt, issuerHandlers } from "../../helpers/jwt.js";
import { expect } from "chai";
import { setupServer } from "msw/node";
import {
	createBasicFlow,
	createBasicResource,
	createBasicResourceConfig,
	createOrg,
	createUser,
	newDb,
} from "../../helpers/db.js";

describe("Resource API", () => {
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

		app.use(`/orgs/:orgId/flows/:flowId/resources`, ResourceRouter);
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

	describe("POST /resources", () => {
		it("should create a new resource", async () => {
			const flow = await createBasicFlow(orgId);

			const resourceConfig: ResourceConfig = createBasicResourceConfig(orgId, flow.id);

			const response = await request(app)
				.post(`/orgs/${orgId}/flows/${flow.id}/resources`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.send(resourceConfig)
				.expect(201);

			const resourceDb = await ResourceDb.findByPk(response.body.id);
			const retrievedResourceConfig = resourceDb!.toModel();
			resourceConfig.id = resourceDb!.id;

			expect(retrievedResourceConfig).to.deep.equal(resourceConfig);
			expect(response.body).to.deep.equal(resourceConfig);
		});
		it("should not create a new resource for a different org", async () => {
			const otherOrgId = randomUUID();
			await createOrg(otherOrgId);
			
			const flow = await createBasicFlow(orgId);
			
			const resourceConfig: ResourceConfig = createBasicResourceConfig(flow.id, otherOrgId);
			await request(app)
				.post(`/orgs/${otherOrgId}/flows/${flow.id}/resources`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.send(resourceConfig)
				.expect(404);
		});
		it("should not create a new resource for an invalid variables schema", async () => {
			const flow = await createBasicFlow(orgId);

			const resourceConfig: ResourceConfig = createBasicResourceConfig(orgId, flow.id);
			resourceConfig.variables = {};

			await request(app)
				.post(`/orgs/${orgId}/flows/${flow.id}/resources`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.send(resourceConfig)
				.expect(400);
		});
	});
	describe("GET /resources/:id", () => {
		it("should retrieve a resource", async () => {
			const flow = await createBasicFlow(orgId);

			const resourceDb = await createBasicResource(orgId, flow.id);

			const response = await request(app)
				.get(`/orgs/${orgId}/flows/${flow.id}/resources/${resourceDb.id}`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.expect(200);

			expect(response.body).to.deep.equal(resourceDb.toModel());
		});
		it("should not retrieve a resource for a different org", async () => {
			const otherOrgId = randomUUID();
			await createOrg(otherOrgId);

			const flow = await createBasicFlow(otherOrgId);
			const createdResourceDb = await createBasicResource(otherOrgId, flow.id);

			await request(app)
				.get(`/orgs/${otherOrgId}/flows/${flow.id}/resources/${createdResourceDb.id}`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.expect(404);
		});
	});
	describe("GET /resources", () => {
		it("should retrieve all resources for a flow", async () => {
			const flow = await createBasicFlow(orgId);
			const resourceDb = await createBasicResource(orgId, flow.id);

			const response = await request(app)
				.get(`/orgs/${orgId}/flows/${flow.id}/resources`)
				.set("Authorization", `Bearer ${jwt}`)
				.expect(200);

			expect(response.body).to.deep.equal([resourceDb.toModel()]);
		});
		it("should not retrieve resources for a different org", async () => {
			const otherOrgId = randomUUID();
			await createOrg(otherOrgId);

			const flow = await createBasicFlow(otherOrgId);
			const createdResourceDb = await createBasicResource(otherOrgId, flow.id);

			const response = await request(app)
				.get(`/orgs/${otherOrgId}/resources`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.expect(404);
		});
	});
	describe("PUT /resources/:id", () => {
		it("should update a resource", async () => {
			const flow = await createBasicFlow(orgId);
			const resourceDb = await createBasicResource(orgId, flow.id);
			const updatedResourceConfig: ResourceConfig = resourceDb.toModel();
			updatedResourceConfig.name = "updated-name";

			await request(app)
				.put(`/orgs/${orgId}/flows/${flow.id}/resources/${resourceDb.id}`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.send(updatedResourceConfig)
				.expect(200);

			const updatedResourceDb = await ResourceDb.findByPk(resourceDb.id);
			const retrievedResourceConfig = updatedResourceDb!.toModel();
			updatedResourceConfig.id = resourceDb.id;

			expect(retrievedResourceConfig).to.deep.equal(updatedResourceConfig);
		});
		it("should not update a resource for a different org", async () => {
			const otherOrgId = randomUUID();
			await createOrg(otherOrgId);

			const flow = await createBasicFlow(otherOrgId)

			const resourceDb = await createBasicResource(otherOrgId, flow.id);
			const updatedResourceConfig: ResourceConfig = resourceDb.toModel();
			updatedResourceConfig.name = "updated-name";

			await request(app)
				.put(`/orgs/${orgId}/flows/${flow.id}/resources/${resourceDb.id}`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.send(updatedResourceConfig)
				.expect(404);
		});
		it("should not update a resource for a with an invalid variables schema", async () => {
			const flow = await createBasicFlow(orgId);

			const resourceDb = await createBasicResource(orgId, flow.id);

			const updatedResourceConfig: ResourceConfig = resourceDb.toModel();
			updatedResourceConfig.variables = {};

			await request(app)
				.put(`/orgs/${orgId}/flows/${flow.id}/resources/${resourceDb.id}`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.send(updatedResourceConfig)
				.expect(400);
		});
	});
	describe("DELETE /resources/:id", () => {
		it("should delete a resource", async () => {
			const flow = await createBasicFlow(orgId);

			const resourceDb = await createBasicResource(orgId, flow.id);

			await request(app)
				.delete(`/orgs/${orgId}/flows/${flow.id}/resources/${resourceDb.id}`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.expect(200);

			const retrievedResourceDb = await ResourceDb.findByPk(resourceDb.id);
			expect(retrievedResourceDb).to.be.null;
		});
		it("should not delete a resource for a different org", async () => {
			const otherOrgId = randomUUID();
			await createOrg(otherOrgId);
			
			const flow = await createBasicFlow(otherOrgId);

			const resourceDb = await createBasicResource(otherOrgId, flow.id);

			await request(app)
				.delete(`/orgs/${otherOrgId}/flows/${flow.id}/resources/${resourceDb.id}`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.expect(404);
		});
	});
});
