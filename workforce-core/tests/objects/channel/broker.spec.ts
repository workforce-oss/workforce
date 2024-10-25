import { expect } from "chai";
import { randomUUID } from "crypto";
import { Sequelize } from "sequelize-typescript";
import { ChannelBroker } from "../../../src/objects/channel/broker.js";
import { MockChannel } from "../../../src/objects/channel/impl/mock/mock_channel.js";
import { createBasicChannel, createBasicFlow, createBasicTask, createOrg, createTaskExecution, newDb } from "../../helpers/db.js";
import { MessageRequest } from "../../../src/objects/channel/model.js";
import { TASK_COMPLETE_FUNCTION_NAME } from "../../../src/objects/base/model.js";

describe("Channel Broker", () => {
    let sequelize: Sequelize;
    before(() => (sequelize = newDb()));
    beforeEach(async () => await sequelize.sync({ force: true }));
    it("should register a channel and get messages for a session", async () => {
        const orgId = randomUUID();
        await createOrg(orgId);
        const flowDb = await createBasicFlow(orgId);
        const taskDb = await createBasicTask(orgId, flowDb.id);
        const channelDb = await createBasicChannel(orgId, flowDb.id, {
            output: {
                name: TASK_COMPLETE_FUNCTION_NAME,
                arguments: {
                    message_test: {
                        message: "test"
                    }
                }
            },
        });
        const taskExecution = await createTaskExecution(orgId, taskDb.id);

        const channel = new MockChannel(channelDb.toModel(), () => {});

        const broker = new ChannelBroker({mode: "in-memory"});
        await broker.register(channel);
        await broker.establishSession(channelDb.id!, taskExecution.id);


        let response: MessageRequest | undefined;
        broker.subscribeToSession(channelDb.id!, taskExecution.id, "mock-worker-id", ["message"], (event) => {
            response = event;
        });

        await broker.message({
            channelId: channelDb.id!,
            workerId: "mock-worker-id",
            taskExecutionId: taskExecution.id,
            timestamp: Date.now(),
            senderId: "mock-sender-id",
            messageId: "mock-message-id",
            message: "input",
            messageType: "message",
        });

        await new Promise((resolve) => setTimeout(resolve, 500));


        expect(response).to.deep.equal({
            channelId: channelDb.id!,
            workerId: "mock-worker-id",
            taskExecutionId: taskExecution.id,
            senderId: channelDb.id!,
            messageId: "mock-message-id",
            message: "mock-final-message",
            timestamp: response?.timestamp,

        });
    });
});