import { expect } from "chai";
import { randomUUID } from "crypto";
import { Sequelize } from "sequelize-typescript";
import { BrokerManager } from "../../../src/manager/broker_manager.js";
import { TASK_COMPLETE_FUNCTION_NAME, ToolCall } from "../../../src/objects/base/model.js";
import { MockChannel } from "../../../src/objects/channel/impl/mock/mock_channel.js";
import { DocumentRepositoryBroker } from "../../../src/objects/document_repository/broker.js";
import { MockWorker } from "../../../src/objects/worker/impl/mock/mock_worker.js";
import { WorkResponse } from "../../../src/objects/worker/model.js";
import { jsonStringify } from "../../../src/util/json.js";
import {
	createBasicChannel,
	createBasicCredential,
	createBasicFlow,
	createBasicTask,
	createBasicWorker,
	createOrg,
	createTaskExecution,
	newDb,
} from "../../helpers/db.js";

describe("Worker Broker", () => {
	let sequelize: Sequelize;
	before(() => (sequelize = newDb()));
	beforeEach(async () => {
		await sequelize.sync({ force: true })
		await BrokerManager.reset();
	});
	it("should register a worker and perform work", async () => {
		const orgId = randomUUID();
		await createOrg(orgId);
		
		const flow = await createBasicFlow(orgId);
		const taskDb = await createBasicTask(orgId, flow.id);
		const taskExecutionDb = await createTaskExecution(orgId, taskDb.id);
		const workerDb = await createBasicWorker(orgId, {
			output: {
				name: TASK_COMPLETE_FUNCTION_NAME,
				arguments: {
					message_test_channel: {
						message: "worker-output",
					},
				},
			},
			final_message: "test-message",
		});
		workerDb.skills = ["test-role"];
		await workerDb.save();

		const workerConfig = workerDb.toModel();
		await BrokerManager.init()

		const worker = new MockWorker(workerConfig);
		
		await BrokerManager.workerBroker.register(worker);
		let workPerformed = false;
		let gotWork: WorkResponse | undefined;
		await BrokerManager.workerBroker.subscribe(workerConfig.id!, async (work: WorkResponse) => {
			workPerformed = true;
			gotWork = work;
		});

		const taskExecutionId = taskExecutionDb.id;

		BrokerManager.workerBroker.request({
			taskExecutionId: taskExecutionId,
			taskId: taskDb.id,
			workerId: workerConfig.id!,
			timestamp: Date.now(),
			input: {
				name: "test",
				description: "test",
				prompt: "test-message",
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 200));

		expect(workPerformed).to.be.true;

		expect(gotWork).to.deep.equal({
			taskId: taskDb.id,
			taskExecutionId: taskExecutionId,
			timestamp: gotWork?.timestamp,
			workerId: workerConfig.id!,
			output: {
				name: TASK_COMPLETE_FUNCTION_NAME,
				arguments: {
					message_test_channel: {
						message: "worker-output",
					},
				},
				sessionId: (gotWork?.output as ToolCall)?.sessionId ?? "",
			},
		});
	});
	it("should perform chat work if the work request has a channel", async () => {
		const orgId = randomUUID();
		await createOrg(orgId);
		
		const flow = await createBasicFlow(orgId);
		const channelDb = await createBasicChannel(orgId, flow.id);

		const taskDb = await createBasicTask(orgId, flow.id);
		taskDb.requiredSkills = ["test-role"];
		taskDb.defaultChannel = channelDb.id;
		await taskDb.save();

		const channelUserConfigDb = await createBasicCredential(orgId);
		channelUserConfigDb.variables = jsonStringify({ token: "test-token" });
		await channelUserConfigDb.save();

		const taskExecutionDb = await createTaskExecution(orgId, taskDb.id);
		const workerDb = await createBasicWorker(orgId, {
			output: {
				name: TASK_COMPLETE_FUNCTION_NAME,
				arguments: {
					message_test_channel: {
						message: "worker-output",
					},
				},
			},
			final_message: "test-message",
		});
		workerDb.skills = ["test-role"];
		workerDb.channelUserConfig = jsonStringify({ "mock-channel": channelUserConfigDb.id });
		await workerDb.save();

		await BrokerManager.init()
		const channel = new MockChannel(channelDb.toModel(), () => {});
		await BrokerManager.channelBroker.register(channel);

		const documentRepositoryBroker = new DocumentRepositoryBroker({mode: "in-memory"});

		const worker = new MockWorker(workerDb.toModel());
		await BrokerManager.workerBroker.register(worker);
		let workPerformed = false;
		let gotWork: WorkResponse | undefined;
		await BrokerManager.workerBroker.subscribe(workerDb.id!, async (work: WorkResponse) => {
			workPerformed = true;
			gotWork = work;
		});

		BrokerManager.workerBroker.request({
			taskExecutionId: taskExecutionDb.id,
			taskId: taskDb.id,
			workerId: workerDb.id!,
			timestamp: Date.now(),
			channelId: channelDb.id!,
			input: {
				name: "test",
				description: "test",
				prompt: "test-message",
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 500));

		expect(workPerformed).to.be.true;

		expect(gotWork).to.deep.equal({
			taskId: taskDb.id,
			taskExecutionId: taskExecutionDb.id,
			timestamp: gotWork?.timestamp,
			workerId: workerDb.id!,
			output: {
				name: TASK_COMPLETE_FUNCTION_NAME,
				arguments: {
					message_test_channel: {
						message: "worker-output",
					},
				},
				sessionId: (gotWork?.output as ToolCall)?.sessionId ?? "",
			},
		});
	});
});
