import { expect } from "chai";
import { randomUUID } from "crypto";
import { Sequelize } from "sequelize-typescript";
import { ResourceDb } from "../../../src/objects/resource/db.js";
import { createBasicFlow, createBasicResource, createBasicResourceConfig, createOrg, newDb } from "../../helpers/db.js";

describe("Resource DB", () => {
    let sequelize: Sequelize;
    before(() => (sequelize = newDb()));
    beforeEach(async () => await sequelize.sync({ force: true }));

    describe("ResourceDb", () => {
        it("should create a db object from a model, save it, retrieve it, and convert back", async () => {
            const orgId = randomUUID();
            await createOrg(orgId);

            const flowDb = await createBasicFlow(orgId);
            const resourceDb = await createBasicResource(orgId, flowDb.id);
            const resourceConfig = resourceDb.toModel();

            const retrievedResourceDb = await ResourceDb.findByPk(resourceDb.id);
            const retrievedResourceConfig = retrievedResourceDb!.toModel();

            expect(retrievedResourceConfig).to.deep.equal(resourceConfig);
        });
        it("should not be possible to create two resources with the same name for the same flow", async () => {
            const orgId = randomUUID();
            await createOrg(orgId);
            
            const flowDb = await createBasicFlow(orgId);
            const resourceConfig = createBasicResourceConfig(orgId, flowDb.id);

            const resourceDb = new ResourceDb().loadModel(resourceConfig);
            resourceConfig.id = resourceDb.id;
            await resourceDb.save();

            const resourceDb2 = new ResourceDb().loadModel(resourceConfig);
            resourceConfig.id = resourceDb2.id;
            try {
                await resourceDb2.save();
                expect.fail("Should not be possible to create two resources with the same name for the same flow");
            } catch (e: any) {
                expect(e.message).to.equal("Validation error");
            }
        })
    });
});