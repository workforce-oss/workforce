import { expect } from "chai";
import { log } from "console";
import { randomUUID } from "crypto";
import { Sequelize } from "sequelize-typescript";
import { BrokerManager } from "../../../src/manager/broker_manager.js";
import { SUBTASK_SUMMARY_FUNCTION_NAME, TASK_COMPLETE_FUNCTION_NAME } from "../../../src/objects/base/model.js";
import { ChannelMessageEvent } from "../../../src/objects/channel/model.js";
import { ResourceObject, ResourceVersion } from "../../../src/objects/resource/model.js";
import { TaskExecutionDb } from "../../../src/objects/task/db.task_execution.js";
import { TicketEvent } from "../../../src/objects/tracker/model.js";
import { jsonStringify } from "../../../src/util/json.js";
import {
	createBasicChannel,
	createBasicCredential,
	createBasicFlow,
	createBasicResource,
	createBasicTask,
	createBasicTool,
	createBasicTracker,
	createBasicWorker,
	createOrg,
	newDb,
} from "../../helpers/db.js";
import { MockObjectFactory } from "../../helpers/mock_objects.js";

describe("Task Broker", () => {
	process.env.LOG_LEVEL = "debug";
	let sequelize: Sequelize;
	const orgId = randomUUID();
	before(() => (sequelize = newDb()));
	beforeEach(async () => {
		await sequelize.sync({ force: true })
		await BrokerManager.reset();
		await createOrg(orgId);
	});

	it("should register a task and perform work in response to a ticket", async () => {
		console.log("should register a task and perform work in response to a ticket");
		// Setup values
		
		const flow = await createBasicFlow(orgId);
		const roleResourceDb = await createBasicResource(orgId, flow.id);
		roleResourceDb.name = "role_resource";
		await roleResourceDb.save();

		const outputResourceDb = await createBasicResource(orgId, flow.id);
		outputResourceDb.name = "output_resource";
		await outputResourceDb.save();

		const channelDb = await createBasicChannel(orgId, flow.id, {
			endCount: 5,
			finalMessage: "mock-final-message",
		});
		const channelConfig = channelDb.toModel();

		const channelUserConfigDb = await createBasicCredential(orgId);
		channelUserConfigDb.variables = JSON.stringify({
			token: "test-token",
		});
		await channelUserConfigDb.save();


		const workerDb = await createBasicWorker(orgId, {
			output: {
				name: TASK_COMPLETE_FUNCTION_NAME,
				arguments: {
					output_resources: [
						{
							name: "test-object",
							content: "test-output-content",
							message: "test-message",
						},
					],
				},
			},
			final_message: "mock-final-message",
			messageCount: 5,
		});
		workerDb.skills = ["test-role"];
		workerDb.channelUserConfig = jsonStringify({ "mock-channel": channelUserConfigDb.id });
		await workerDb.save();

		const inputTrackerDb = await createBasicTracker(orgId, flow.id);
		inputTrackerDb.name = "input_tracker";
		await inputTrackerDb.save();

		const taskDb = await createBasicTask(orgId, flow.id);
		taskDb.name = "test-task";
		taskDb.description = "test";
		taskDb.type = "mock-task";
		taskDb.flowId = flow.id;
		taskDb.orgId = orgId;
		taskDb.inputs = jsonStringify({
			role: roleResourceDb.id!,
		});
		taskDb.outputs = [outputResourceDb.id!];
		taskDb.trackerId = inputTrackerDb.id!;
		taskDb.requiredSkills = ["test-role"];
		taskDb.defaultChannel = channelDb.id!;
		taskDb.variables = jsonStringify({
			prompt_template: "{{role}}",
			system_message_template: "test",
		});

		await taskDb.save();

		const mock = await MockObjectFactory.createAndRegisterConfigs([
			roleResourceDb.toModel(),
			outputResourceDb.toModel(),
			channelConfig,
			workerDb.toModel(),
			inputTrackerDb.toModel(),
			taskDb.toModel(),
		]);

		let ticketStarted = false;
		let ticketCompleted = false;
		let ticket: TicketEvent | undefined;
		let resourceVersionReceived = false;
		let gotVersion: ResourceVersion | undefined;
		let gotResourceObject: ResourceObject | undefined;

		// Subscribe to Listeners

		await BrokerManager.trackerBroker.subscribe(inputTrackerDb.id!, async (ticketEvent: TicketEvent) => {
			if (ticketEvent.data.status === "in-progress") {
				ticketStarted = true;
			} else if (ticketEvent.data.status === "completed") {
				ticketCompleted = true;
			}
			ticket = ticketEvent;
		});

		await BrokerManager.resourceBroker.subscribe(outputResourceDb.id!, async (resourceVersion: ResourceVersion) => {
			if (resourceVersion.resourceId === outputResourceDb.id) {
				resourceVersionReceived = true;
				gotVersion = resourceVersion;
				gotResourceObject = await BrokerManager.resourceBroker
					.getObject(resourceVersion.resourceId)
					?.fetchObject(resourceVersion, resourceVersion.objectNames[0]);
			}
		});

		// Execute Actions

		await BrokerManager.trackerBroker.create({
			trackerId: inputTrackerDb.id!,
			requestId: randomUUID(),
			input: {
				name: "test-ticket",
				status: "ready",
			},
		});


		await new Promise((resolve) => setImmediate(resolve));
		// add a delay to allow the task to complete
		await new Promise((resolve) => setTimeout(resolve, 1500));

		expect(ticketStarted, "Ticket Should Be Started").to.be.true;
		expect(ticketCompleted, "Ticket Should be Completed").to.be.true;
		expect(ticket, "Iicket should not be undefined").to.not.be.undefined;
		expect(ticket!.data.status, "Ticket status should be completed").to.equal("completed");
		expect(resourceVersionReceived, "Resource Version should be received").to.be.true;
		expect(gotVersion, "Got Version should not be undefined").to.not.be.undefined;
		expect(gotResourceObject, "Got Resource Object should not be undefined").to.not.be.undefined;
		expect(gotResourceObject!.content, "Got Resource Object should have 'test-output-content' as content").to.equal("test-output-content");
	});
	it("should perform a chat and provide an output message in response to a ticket", async () => {
		// Setup values
		const flow = await createBasicFlow(orgId);

		const channelUserConfigDb = await createBasicCredential(orgId);
		
		channelUserConfigDb.variables = jsonStringify({
			token: "test-token",
		});
		await channelUserConfigDb.save();

		const testWorkerDb = await createBasicWorker(orgId, {
			output: {
				name: TASK_COMPLETE_FUNCTION_NAME,
				arguments: {
					message_test_channel: {
						message: "test-message",
					},
				},
			},
			final_message: "final-message",
			messageCount: 5,
		});
		testWorkerDb.name = "test-worker";
		testWorkerDb.channelUserConfig = jsonStringify({ "mock-channel": channelUserConfigDb.id });
		testWorkerDb.skills = ["test-role"];
		await testWorkerDb.save();


		const testChannelDb = await createBasicChannel(orgId, flow.id, {
			endCount: 5,
			finalMessage: "final-message",
			workerId: testWorkerDb.id!,
		});

		const testTrackerDb = await createBasicTracker(orgId, flow.id);
		testTrackerDb.name = "test-tracker";
		await testTrackerDb.save();



		const testTaskDb = await createBasicTask(orgId, flow.id);
		testTaskDb.name = "test-task";
		testTaskDb.requiredSkills = ["test-role"];
		testTaskDb.trackerId = testTrackerDb.id!;
		testTaskDb.outputs = [testChannelDb.id!];
		testTaskDb.defaultChannel = testChannelDb.id!;
		testTaskDb.variables = jsonStringify({
			prompt_template: "{{ticket.name}}: {{ticket.description}}",
			system_message_template: "System: {{ticket.name}}: {{ticket.description}}",
		});
		await testTaskDb.save();

		const mock = await MockObjectFactory.createAndRegisterConfigs([
			testChannelDb.toModel(),
			testTrackerDb.toModel(),
			testWorkerDb.toModel(),
			testTaskDb.toModel(),
		]);

		let ticketStarted = false;
		let ticketCompleted = false;
		let ticket: TicketEvent | undefined;
		let chatMessageCount = 0;
		let gotChatMessage: string | undefined;

		// Subscribe to Listeners

		await BrokerManager.trackerBroker.subscribe(testTrackerDb.id!, async (ticketEvent: TicketEvent) => {
			if (ticketEvent.data.status === "in-progress") {
				ticketStarted = true;
			} else if (ticketEvent.data.status === "completed") {
				ticketCompleted = true;
			}
			ticket = ticketEvent;
		});

		BrokerManager.channelBroker.getObject(testChannelDb.id!)!.subscribe(async (message: ChannelMessageEvent) => {
			chatMessageCount++;
			gotChatMessage = message.message;
			log(`gotChatMessage=${gotChatMessage}`);
		});

		// Execute Actions

		await BrokerManager.trackerBroker.create({
			trackerId: testTrackerDb.id!,
			requestId: randomUUID(),
			input: {
				name: "test-ticket",
				description: "test-description",
				status: "ready",
			},
		});

		await new Promise((resolve) => setImmediate(resolve));
		// add a delay to allow the task to complete
		await new Promise((resolve) => setTimeout(resolve, 1000));


		expect(ticketStarted).to.be.true;
		expect(ticketCompleted).to.be.true;
		expect(ticket).to.not.be.undefined;
		expect(ticket!.data.status).to.equal("completed");
		expect(chatMessageCount).to.equal(6);
		expect(gotChatMessage).to.equal("final-message");
	});

	it("should perform a chat in response to a message when there is no explicit worker channel set", async () => {
		const flow = await createBasicFlow(orgId);
		const testChannelDb = await createBasicChannel(orgId, flow.id, {
			endCount: 5,
			finalMessage: "final-message",
		});

		const channelUserConfigDb = await createBasicCredential(orgId);
		channelUserConfigDb.variables = jsonStringify({
			token: "test-token",
		});
		await channelUserConfigDb.save();

		const testWorkerDb = await createBasicWorker(orgId, {
			output: {
				name: TASK_COMPLETE_FUNCTION_NAME,
				arguments: {
					message_test_channel: {
						message: "test-message",
					},
				},
			},
			final_message: "final-message",
			messageCount: 5,

		});
		testWorkerDb.name = "test-worker";
		testWorkerDb.skills = ["test-role"];
		testWorkerDb.channelUserConfig = jsonStringify({ "mock-channel": channelUserConfigDb.id });
		await testWorkerDb.save();

		const testTaskDb = await createBasicTask(orgId, flow.id);
		testTaskDb.name = "test-task";
		testTaskDb.requiredSkills = ["test-role"];
		testTaskDb.defaultChannel = testChannelDb.id!;
		testTaskDb.triggers = [testChannelDb.id!];
		testTaskDb.inputs = jsonStringify({
			message: testChannelDb.id!,
		});
		testTaskDb.outputs = [testChannelDb.id!];
		testTaskDb.variables = jsonStringify({
			prompt_template: "{{message}}",
			system_prompt_template: "System",
		});
		await testTaskDb.save();

		const mock = await MockObjectFactory.createAndRegisterConfigs([
			testChannelDb.toModel(),
			testWorkerDb.toModel(),
			testTaskDb.toModel(),
		]);

		let chatMessageCount = 0;
		let gotChatMessage: string | undefined;

		// Subscribe to Listeners

		const channel = BrokerManager.channelBroker.getObject(testChannelDb.id!)!;

		channel.subscribe(async (message: ChannelMessageEvent) => {
			chatMessageCount++;
			gotChatMessage = message.message;
			log(`gotChatMessage=${gotChatMessage}`);
		});

		// Execute Actions

		const mockId = randomUUID();

		channel.subject.next({
			channelId: testChannelDb.id!,
			senderId: mockId,
			users: [mockId],
			messageId: randomUUID(),
			message: "test-message",
			messageType: "message",
		});

		await new Promise((resolve) => setImmediate(resolve));
		// add a delay to allow the task to complete
		await new Promise((resolve) => setTimeout(resolve, 1500));

		// In this case it includes the initial message
		expect(chatMessageCount).to.equal(7);
		expect(gotChatMessage).to.equal("final-message");
	});
	it("should create a resource for a tool function output", async () => {
		const flow = await createBasicFlow(orgId);
		const testResourceDb = await createBasicResource(orgId, flow.id);
		testResourceDb.name = "test-resource";
		await testResourceDb.save();

		const toolDb = await createBasicTool(orgId, flow.id);
		toolDb.name = "test-tool";
		await toolDb.save();

		const testChannelDb = await createBasicChannel(orgId, flow.id, {
			endCount: 5,
			finalMessage: "final-message",
		});

		const channelUserConfigDb = await createBasicCredential(orgId);
		channelUserConfigDb.variables = jsonStringify({
			token: "test-token",
		});
		await channelUserConfigDb.save();

		const testWorkerDb = await createBasicWorker(orgId, {
			output: {
				name: TASK_COMPLETE_FUNCTION_NAME,
				arguments: {
					message_test_channel: {
						message: "test-message",
					},
					test_resources: [
						{
							name: "test-resource",
							message: "test-message",
							function_name: "mock-function",
						},
					],
				},
			},
			final_message: "final-message",
			messageCount: 5,
		});
		testWorkerDb.name = "test-worker";
		testWorkerDb.skills = ["test-role"];
		testWorkerDb.channelUserConfig = jsonStringify({ "mock-channel": channelUserConfigDb.id });
		await testWorkerDb.save();

		const testTaskDb = await createBasicTask(orgId, flow.id);
		testTaskDb.name = "test-task";
		testTaskDb.requiredSkills = ["test-role"];
		testTaskDb.triggers = [testChannelDb.id!];
		testTaskDb.inputs = jsonStringify({
			message: testChannelDb.id!,
		});
		testTaskDb.outputs = [testChannelDb.id!, testResourceDb.id!];
		testTaskDb.variables = jsonStringify({
			prompt_template: "{{message}}",
			system_prompt_template: "System",
		});
		testTaskDb.tools = jsonStringify([
			{
				name: toolDb.name,
				output: testResourceDb.id!,
				id: toolDb.id,
			},
		]);
		await testTaskDb.save();

		const mock = await MockObjectFactory.createAndRegisterConfigs([
			testChannelDb.toModel(),
			testResourceDb.toModel(),
			testWorkerDb.toModel(),
			testTaskDb.toModel(),
			toolDb.toModel(),
		]);

		let resourceVersionReceived = false;
		let gotVersion: ResourceVersion | undefined;
		let gotResourceObject: ResourceObject | undefined;

		await BrokerManager.resourceBroker.subscribe(testResourceDb.id!, async (resourceVersion: ResourceVersion) => {
			if (resourceVersion.resourceId === testResourceDb.id) {
				resourceVersionReceived = true;
				gotVersion = resourceVersion;
				gotResourceObject = await BrokerManager.resourceBroker
					.getObject(resourceVersion.resourceId)
					?.fetchObject(resourceVersion, resourceVersion.objectNames[0]);
			}
		});

		let chatMessageCount = 0;
		let gotChatMessage: string | undefined;

		// Subscribe to Listeners

		const channel = BrokerManager.channelBroker.getObject(testChannelDb.id!)!;

		channel.subscribe(async (message: ChannelMessageEvent) => {
			chatMessageCount++;
			gotChatMessage = message.message;
			log(`gotChatMessage=${gotChatMessage}`);
		});

		// Execute Actions
		const mockId = randomUUID();
		channel.subject.next({
			channelId: testChannelDb.id!,
			senderId: mockId,
			users: [mockId],
			messageId: randomUUID(),
			message: "test-message",
			messageType: "message",
		});

		await new Promise((resolve) => setImmediate(resolve));
		// add a delay to allow the task to complete
		await new Promise((resolve) => setTimeout(resolve, 1500));
		console.log(`[TEST] [${new Date().toISOString()}] FInishing Test: should create a resource for a tool function output`)

		// In this case it includes the initial message
		expect(chatMessageCount, "Chat Message count should be 7").to.equal(7);
		expect(gotChatMessage, "Got Chat Message shouldb be 'final-message").to.equal("final-message");
		expect(resourceVersionReceived, "Should receive resource version").to.be.true;
		expect(gotVersion, "Got Version should not be undefined").to.not.be.undefined;
		expect(gotResourceObject, "Got Resource Object should not be undefined").to.not.be.undefined;
	});
	it("Should execute a subtask and return the result", async () => {
		const flow = await createBasicFlow(orgId);
		const testChannelDb = await createBasicChannel(orgId, flow.id, {
			messages: [
				"t-message-1",
				"t-message-2",
				"subtask-message",
				"s-message-1",
				"s-message-2",
				"s-message-3",
				"s-message-4",
				"final-message",
				"t-message-3",
				"t-message-4",
				"final-message",
			],
			finalMessage: "final-message",
		});
		const channelUserConfigDb = await createBasicCredential(orgId);
		channelUserConfigDb.variables = jsonStringify({
			token: "test-token",
		});
		await channelUserConfigDb.save();
		const testWorkerDb = await createBasicWorker(orgId, {
			output: {
				name: TASK_COMPLETE_FUNCTION_NAME,
				arguments: {
					[SUBTASK_SUMMARY_FUNCTION_NAME]: {
						arguments: {
							summary: "A summry of the subtask"
						}
					},
				},
			},
			subtask_message: "subtask-message",
			subtask_tool_call: {
				name: "test_subtask",
				arguments: {
					message: "subtask-called-message"
				}
			},
			final_message: "final-message",
			messageCount: 5,
		});
		testWorkerDb.name = "test-worker";
		testWorkerDb.skills = ["test-role"];
		testWorkerDb.channelUserConfig = jsonStringify({ "mock-channel": channelUserConfigDb.id });
		await testWorkerDb.save();

		const rootTaskDb = await createBasicTask(orgId, flow.id);
		rootTaskDb.name = "test-task";
		rootTaskDb.requiredSkills = ["test-role"];
		rootTaskDb.triggers = [testChannelDb.id!];
		rootTaskDb.inputs = jsonStringify({
			message: testChannelDb.id!,
		});
		rootTaskDb.variables = jsonStringify({
			prompt_template: "{{message}}",
			system_prompt_template: "System",
		});

		await rootTaskDb.save();

		const subTaskDb = await createBasicTask(orgId, flow.id, undefined, "test-subtask");
		subTaskDb.name = "test-subtask";
		subTaskDb.description = "This is a test subtask"
		subTaskDb.requiredSkills = ["test-role"];
		subTaskDb.inputs = jsonStringify({
			message: rootTaskDb.id!,
		});
		subTaskDb.variables = jsonStringify({
			prompt_template: "{{message}}",
			system_prompt_template: "System",
		});
		
		await subTaskDb.save();

		rootTaskDb.subtasks = jsonStringify([{
			name: "test-subtask",
			id: subTaskDb.id,
		}]);
		
		await rootTaskDb.save();

		const mock = await MockObjectFactory.createAndRegisterConfigs([
			testChannelDb.toModel(),
			testWorkerDb.toModel(),
			rootTaskDb.toModel(),
			subTaskDb.toModel(),
		]);

		let chatMessageCount = 0;
		let messageMap: Map<string, string[]> = new Map<string, string[]>();

		// Subscribe to Listeners
		const channel = BrokerManager.channelBroker.getObject(testChannelDb.id!)!;
		channel.subscribe(async (message: ChannelMessageEvent) => {
			chatMessageCount++;
			if (!messageMap.has(message.taskExecutionId!)) {
				messageMap.set(message.taskExecutionId!, []);
			}
			messageMap.get(message.taskExecutionId!)?.push(message.message);
		});

		// Execute Actions
		const mockId = randomUUID();
		channel.subject.next({
			channelId: testChannelDb.id!,
			senderId: mockId,
			users: [mockId],
			messageId: randomUUID(),
			message: "test-message",
			messageType: "message",
		});

		await new Promise((resolve) => setImmediate(resolve));
		await new Promise((resolve) => setTimeout(resolve, 1500));
		console.log(`[TEST] [${new Date().toISOString()}] Message Map`);
		console.log(jsonStringify(messageMap));

		const taskExecutions = await TaskExecutionDb.findAll({
			where: {
				taskId: subTaskDb.id
			}
		});
		if (taskExecutions.length == 0) {
			expect.fail("No task executions found for subtask");
		}


		
		// In this case it includes the initial message and the final message
		// first entry is null because the trigger message is not associated with a task execution
		expect(messageMap.size, "Message Map should have 3 entries").to.equal(3);
		expect(chatMessageCount, "Chat Message count should be 13").to.equal(13);		
	});
});
