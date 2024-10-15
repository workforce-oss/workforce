import { expect } from "chai";
import { randomUUID } from "crypto";
import { Sequelize } from "sequelize-typescript";
import { ChannelDb } from "../../../src/objects/channel/db.js";
import { createBasicChannel, createBasicFlow, createOrg, newDb } from "../../helpers/db.js";

describe("Channel DB", () => {
    let sequelize: Sequelize;
    before(() => (sequelize = newDb()));
    beforeEach(async () => await sequelize.sync({ force: true }));

    describe("ChannelDb", () => {
        it("should create a db object from a model, save it, retrieve it, and convert back", async () => {
            const orgId = randomUUID();
            await createOrg(orgId);
            const flow = await createBasicFlow(orgId);
            const channelDb = await createBasicChannel(orgId, flow.id);

            const retrievedChannelDb = await ChannelDb.findByPk(channelDb.id);

            expect(retrievedChannelDb!.toModel()).to.deep.equal(channelDb.toModel());
        });
        it("should not be possible to create two channels with the same name for the same flow", async () => {
            const orgId = randomUUID();
            await createOrg(orgId);
            
            const flow = await createBasicFlow(orgId);
            const channelDb = await createBasicChannel(orgId, flow.id);
            const channelConfig = channelDb.toModel(); 

            const channelDb2 = new ChannelDb().loadModel(channelConfig);
            channelConfig.id = channelDb2.id;
            try {
                await channelDb2.save();
                expect.fail("Should not be possible to create two channels with the same name for the same flow");
            } catch (e: any) {
                expect(e.message).to.equal("Validation error");
            }
        });
    });
});