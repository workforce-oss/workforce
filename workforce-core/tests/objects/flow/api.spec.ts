import chai, { expect } from "chai";
import deepEqualInAnyOrder from "deep-equal-in-any-order";
import { randomUUID } from "crypto";
import express from "express";
import { auth } from "express-oauth2-jwt-bearer";
import expressWs from "express-ws";
import { setupServer } from "msw/node";
import { Sequelize } from "sequelize-typescript";
import request from "supertest";
import { ResourceConfig } from "../../../src/model.js";
import { FlowRoutes } from "../../../src/objects/flow/api.js";
import { FlowDb } from "../../../src/objects/flow/db.js";
import { FlowConfig } from "../../../src/objects/flow/model.js";
import { createBasicToolConfig, createOrg, createUser, newDb } from "../../helpers/db.js";
import { createJwt, issuerHandlers } from "../../helpers/jwt.js";

chai.use(deepEqualInAnyOrder);

describe("Flow API", () => {
	const { app, getWss, applyTo } = expressWs(express());

	const basicConfig = (customOrgId?: string): FlowConfig => (
		{
			name: "test",
			description: "test",
			orgId: customOrgId || orgId,
			status: "active",
			channels: [
				{
					name: "test-channel",
					orgId: customOrgId || orgId,
					description: "test",
					type: "channel",
					subtype: "mock",
					variables: {
						output: "test-channel-output",
					},
				},
			],
			documentation: [],
			resources: [
				{
					name: "test-resource",
					orgId: customOrgId || orgId,
					description: "test",
					type: "resource",
					subtype: "mock",
					variables: {
						output: "test-resource-output",
					},
				},
			],
			tools: [],
			trackers: [],
			tasks: [
				{
					name: "test-input-task",
					description: "test",
					type: "task",
					subtype: "mock",
					orgId: customOrgId || orgId,
					defaultChannel: "test-channel",
					inputs: {},
					variables: {
						prompt_template: "test",
					},
					subtasks: [{
						name: "test-input-task2",
					}]
				},
				{
					name: "test-input-task2",
					description: "test",
					type: "task",
					subtype: "mock",
					orgId: customOrgId || orgId,
					inputs: {
						message: "test-input-task"
					},
					variables: {
						prompt_template: "test",
					},
				}
			],
		});

	const basicResourceConfig = (customOrgId?: string): ResourceConfig => ({
		name: "test-resource",
		orgId: customOrgId || orgId,
		description: "test",
		type: "resource",
		subtype: "mock",
		variables: {
			output: "test-resource-output",
		},
	});

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

		app.use("/flows", FlowRoutes);
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

	describe("POST /flows", () => {
		it("should create a new flow", async () => {
			const flowConfig: FlowConfig = basicConfig();

			const response = await request(app)
				.post("/flows")
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.send(flowConfig)
				.expect(201);

			const flowDb = await FlowDb.findByPk(response.body.id, { include: { all: true } });
			const retrievedFlowConfig = await flowDb!.toModel({ replaceIdsWithNames: true });
			flowConfig.id = flowDb!.id;
			flowConfig.resources![0].id = retrievedFlowConfig.resources![0].id;
			flowConfig.resources![0].flowId = retrievedFlowConfig.resources![0].flowId;

			flowConfig.channels![0].id = retrievedFlowConfig.channels![0].id;
			flowConfig.channels![0].flowId = retrievedFlowConfig.channels![0].flowId;

			flowConfig.tasks![0].id = retrievedFlowConfig.tasks![0].id;
			flowConfig.tasks![0].flowId = retrievedFlowConfig.tasks![0].flowId;

			retrievedFlowConfig.tasks![0].defaultChannel = flowConfig.tasks![0].defaultChannel;
			flowConfig.tasks![1].id = retrievedFlowConfig.tasks![1].id;
			flowConfig.tasks![1].flowId = retrievedFlowConfig.tasks![1].flowId;

			expect(retrievedFlowConfig, "expected flowconfig to equal retrieved").to.deep.equalInAnyOrder(flowConfig);
			expect(response.body, "expected flowconfig to equal responsebody").to.deep.equalInAnyOrder(flowConfig);
		});
		it("should not create a new flow for a different org", async () => {
			const otherOrgId = randomUUID();
			await createOrg(otherOrgId);

			const flowConfig: FlowConfig = basicConfig(otherOrgId);
			await request(app)
				.post("/flows")
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.query({ orgId: otherOrgId })
				.send(flowConfig)
				.expect(404);
		});
		it("should create a flow with tools, and then remove the tools by updating the flow", async () => {
			const flowConfig: FlowConfig = basicConfig();
			flowConfig.tools = [{
				name: "test-tool",
				description: "test",
				type: "tool",
				subtype: "mock",
				orgId: orgId,
				variables: {
					output: "test-tool-output",
				},
			}]
			flowConfig.tasks![0].tools = [{ name: "test-tool" }];

			const response = await request(app)
				.post("/flows")
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.send(flowConfig)
				.expect(201);

			const flowDb = await FlowDb.findByPk(response.body.id, { include: { all: true } });
			const retrievedFlowConfig = await flowDb!.toModel({ replaceIdsWithNames: true });

			expect(retrievedFlowConfig.tasks?.[0]?.tools?.length).to.equal(1, "expected 1 tool");

			delete retrievedFlowConfig.tasks![0].tools;

			const updated = await request(app)
				.post(`/flows`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.query({ orgId: orgId })
				.send(retrievedFlowConfig)
				.expect(201);
			expect(updated.body.tasks?.[0]?.tools?.length).to.equal(undefined, "expected no tools");
		});
	});
	describe("GET /flows/:id", () => {
		it("should retrieve a flow", async () => {
			const flowConfig: FlowConfig = basicConfig();
			const flowDb = await new FlowDb().loadModel(flowConfig);
			flowConfig.id = flowDb.id;
			await flowDb.save();

			const response = await request(app)
				.get(`/flows/${flowDb.id}`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.query({ orgId: orgId })
				.expect(200);
			flowConfig.resources![0].id = response.body.resources![0].id;
			flowConfig.resources![0].flowId = response.body.resources![0].flowId;
			flowConfig.channels![0].id = response.body.channels![0].id;
			flowConfig.channels![0].flowId = response.body.channels![0].flowId;
			flowConfig.tasks![0].id = response.body.tasks![0].id;
			flowConfig.tasks![0].flowId = response.body.tasks![0].flowId;
			flowConfig.tasks![1].id = response.body.tasks![1].id;
			flowConfig.tasks![1].flowId = response.body.tasks![1].flowId;

			expect(response.body).to.deep.equalInAnyOrder(flowConfig);
		});
		it("should not retrieve a flow for a different org", async () => {
			const otherOrgId = randomUUID();
			await createOrg(otherOrgId);

			const flowConfig: FlowConfig = basicConfig(otherOrgId);
			const flowDb = await new FlowDb().loadModel(flowConfig);
			flowConfig.id = flowDb.id;
			await flowDb.save();

			await request(app)
				.get(`/flows/${flowDb.id}`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.query({ orgId: otherOrgId })
				.expect(404);
		});
	});
	describe("GET /flows", () => {
		it("should retrieve all flows for an org", async () => {
			const flowConfig: FlowConfig = basicConfig();
			const flowDb = await new FlowDb().loadModel(flowConfig);
			flowConfig.id = flowDb.id;
			await flowDb.save();

			const response = await request(app)
				.get(`/flows`)
				.set("Authorization", `Bearer ${jwt}`)
				.query({ orgId: orgId })
				.expect(200);

			expect(response.body).to.deep.equal([
				{
					name: flowConfig.name,
					description: flowConfig.description,
					orgId: flowConfig.orgId,
					id: flowConfig.id,
					status: flowConfig.status,
				},
			]);
		});
		it("should not retrieve flows for a different org", async () => {
			const otherOrgId = randomUUID();
			await createOrg(otherOrgId);

			const flowConfig: FlowConfig = basicConfig(otherOrgId);
			const flowDb = await new FlowDb().loadModel(flowConfig);
			flowConfig.id = flowDb.id;
			await flowDb.save();

			await request(app)
				.get(`/flows`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.query({ orgId: otherOrgId })
				.expect(404);

			const response = await request(app)
				.get(`/flows`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.query({ orgId: orgId })
				.expect(200);

			expect(response.body).to.deep.equal([]);
		});
	});
	describe("PUT /flows/:id", () => {
		it("should update a flow", async () => {
			const flowConfig: FlowConfig = basicConfig();
			const flowDb = await new FlowDb().loadModel(flowConfig);
			flowConfig.id = flowDb.id;
			await flowDb.save();

			const updatedFlowConfig: FlowConfig = basicConfig();
			updatedFlowConfig.name = "updated name";

			await request(app)
				.put(`/flows/${flowDb.id}`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.send(updatedFlowConfig)
				.expect(200);

			const updatedFlowDb = await FlowDb.findByPk(flowDb.id, { include: { all: true } });
			const retrievedFlowConfig = await updatedFlowDb!.toModel({ replaceIdsWithNames: true });
			updatedFlowConfig.id = flowDb.id;
			updatedFlowConfig.resources![0].id = retrievedFlowConfig.resources![0].id;
			updatedFlowConfig.resources![0].flowId = retrievedFlowConfig.resources![0].flowId;
			updatedFlowConfig.channels![0].id = retrievedFlowConfig.channels![0].id;
			updatedFlowConfig.channels![0].flowId = retrievedFlowConfig.channels![0].flowId;
			updatedFlowConfig.tasks![0].id = retrievedFlowConfig.tasks![0].id;
			updatedFlowConfig.tasks![0].flowId = retrievedFlowConfig.tasks![0].flowId;
			retrievedFlowConfig.tasks![0].defaultChannel = flowConfig.tasks![0].defaultChannel;

			updatedFlowConfig.tasks![1].id = retrievedFlowConfig.tasks![1].id;
			updatedFlowConfig.tasks![1].flowId = retrievedFlowConfig.tasks![1].flowId;

			updatedFlowConfig.id = flowDb.id;
			expect(retrievedFlowConfig).to.deep.equalInAnyOrder(updatedFlowConfig);
		});
		it("should not update a flow for a different org", async () => {
			const otherOrgId = randomUUID();
			await createOrg(otherOrgId);

			const flowConfig: FlowConfig = basicConfig(otherOrgId);
			const flowDb = await new FlowDb().loadModel(flowConfig);
			flowConfig.id = flowDb.id;
			await flowDb.save();

			const updatedFlowConfig: FlowConfig = basicConfig(otherOrgId);

			await request(app)
				.put(`/flows/${flowDb.id}`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.send(updatedFlowConfig)
				.expect(404);
		});
	});
	describe("DELETE /flows/:id", () => {
		it("should delete a flow", async () => {
			const flowConfig: FlowConfig = basicConfig();
			const flowDb = await new FlowDb().loadModel(flowConfig);
			flowConfig.id = flowDb.id;
			await flowDb.save();

			await request(app)
				.delete(`/flows/${flowDb.id}`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.query({ orgId: orgId })
				.expect(200);

			const retrievedFlowDb = await FlowDb.findByPk(flowDb.id);
			expect(retrievedFlowDb).to.be.null;
		});
		it("should not delete a flow for a different org", async () => {
			const otherOrgId = randomUUID();
			await createOrg(otherOrgId);

			const flowConfig: FlowConfig = basicConfig(otherOrgId);
			const flowDb = await new FlowDb().loadModel(flowConfig);
			flowConfig.id = flowDb.id;
			await flowDb.save();

			await request(app)
				.delete(`/flows/${flowDb.id}`)
				.set("Authorization", `Bearer ${jwt}`)
				.set("Content-Type", "application/json")
				.query({ orgId: otherOrgId })
				.expect(404);
		});
	});
});
