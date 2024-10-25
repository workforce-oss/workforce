import { expect } from "chai";
import { randomUUID } from "crypto";
import { Sequelize } from "sequelize-typescript";
import { ChannelType } from "../../../src/objects/channel/model.js";
import { WorkerDb } from "../../../src/objects/worker/db.js";
import { WorkerConfig } from "../../../src/objects/worker/model.js";
import { createOrg, newDb } from "../../helpers/db.js";

describe("Worker DB", () => {
    let sequelize: Sequelize;
    before(() => (sequelize = newDb()));
    beforeEach(async () => await sequelize.sync({ force: true }));

    describe("WorkerDb", () => {
        it("should create a db object from a model, save it, retrieve it, and convert back", async () => {
            const orgId = randomUUID();
            await createOrg(orgId);
            
            const workerConfig: WorkerConfig = {
                name: "test",
                description: "test",
                type: "ai-worker",
                orgId: orgId,
                channelUserConfig: {
                    "mock-channel": "mock"
                } as Record<ChannelType, string>,
                variables: {
                    test: "test"
                }
            }

            const workerDb = new WorkerDb().loadModel(workerConfig);
            workerConfig.id = workerDb.id;
            await workerDb.save();

            const retrievedWorkerDb = await WorkerDb.findByPk(workerDb.id);

            const retrievedWorkerConfig = retrievedWorkerDb!.toModel();

            expect(retrievedWorkerConfig).to.deep.equal(workerConfig);
        });
        it("should not be possible to create two workers with the same name for the same flow", async () => {
            const orgId = randomUUID();
            await createOrg(orgId);

            const workerConfig: WorkerConfig = {
                name: "test",
                description: "test",
                type: "ai-worker",
                orgId: orgId,
                channelUserConfig: {
                    "mock-channel": "mock"
                } as Record<ChannelType, string>,
                variables: {
                    test: "test"
                }
            }

            const workerDb = new WorkerDb().loadModel(workerConfig);
            workerConfig.id = workerDb.id;
            await workerDb.save();

            const workerDb2 = new WorkerDb().loadModel(workerConfig);
            workerConfig.id = workerDb2.id;
            try {
                await workerDb2.save();
                expect.fail("Should not be possible to create two workers with the same name for the same flow");
            } catch (e: any) {
                expect(e.message).to.equal("Validation error");
            }
        });
    });
});