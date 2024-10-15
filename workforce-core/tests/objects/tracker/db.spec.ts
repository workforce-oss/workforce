import { expect } from "chai";
import { randomUUID } from "crypto";
import { Sequelize } from "sequelize-typescript";
import { TrackerDb } from "../../../src/objects/tracker/db.js";
import { TrackerConfig } from "../../../src/objects/tracker/model.js";
import { createBasicFlow, createBasicTracker, createOrg, newDb } from "../../helpers/db.js";

describe("Tracker DB", () => {
    let sequelize: Sequelize;
    before(() => (sequelize = newDb()));
    beforeEach(async () => await sequelize.sync({ force: true }));

    describe("TrackerDb", () => {
        it("should create a db object from a model, save it, retrieve it, and convert back", async () => {
            const orgId = randomUUID();
            await createOrg(orgId);

            const flow = await createBasicFlow(orgId);
            const trackerDb = await createBasicTracker(orgId, flow.id);

            const retrievedTrackerDb = await TrackerDb.findByPk(trackerDb.id);
            const retrievedTrackerConfig = retrievedTrackerDb!.toModel();

            expect(retrievedTrackerConfig).to.deep.equal(trackerDb.toModel());
        });
        it("should not be possible to create two trackers with the same name for the same flow", async () => {
            const orgId = randomUUID();
            await createOrg(orgId);
            
            const flow = await createBasicFlow(orgId);
            const trackerDb = await createBasicTracker(orgId, flow.id);
            const trackerDb2 = new TrackerDb().loadModel(trackerDb.toModel());

            try {
                await trackerDb2.save();
            } catch (e: any) {
                expect(e.message).to.equal("Validation error");
            }
        });
    });
});