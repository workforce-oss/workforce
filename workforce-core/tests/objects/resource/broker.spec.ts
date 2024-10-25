import { expect } from "chai";
import { randomUUID } from "crypto";
import { Sequelize } from "sequelize-typescript";
import { ResourceBroker } from "../../../src/objects/resource/broker.js";
import { MockResource } from "../../../src/objects/resource/impl/mock/mock_resource.js";
import { ResourceObject, ResourceVersion } from "../../../src/objects/resource/model.js";
import { createBasicFlow, createBasicResource, createBasicResourceConfig, createOrg, newDb } from "../../helpers/db.js";

describe("Resource Broker", () => {
    let sequelize: Sequelize;
    before(() => (sequelize = newDb()));
    beforeEach(async () => await sequelize.sync({ force: true }));
    it("should register a resource and be able to retrieve it", async () => {
        const orgId = randomUUID();
        await createOrg(orgId);
        
        const flow = await createBasicFlow(orgId);
        const resourceDb = await createBasicResource(orgId, flow.id, {
            output: "mock-output"
        });
        const resourceConfig = resourceDb.toModel();
        
        const resource = new MockResource(resourceConfig, () => {});

        const broker = new ResourceBroker({mode: "in-memory"});
        await broker.register(resource);

        let resourceVersionReceived = false;
        let gotVersion: ResourceVersion | undefined;
        let gotResourceObject: ResourceObject | undefined;
        await broker.subscribe(resourceConfig.id!, (resourceVersion: ResourceVersion) => {
            resourceVersionReceived = true;
            gotVersion = resourceVersion;
            broker.getObject(resourceConfig.id!)?.fetchObject(resourceVersion, "mock-object-name").then(object => {
                gotResourceObject = object;
            });
        });

        await broker.write({
            requestId: randomUUID(),
            resourceId: resourceConfig.id!,
            message: "test",
            data: {
                name: "mock-object-name",
                content: "test"
            }
        })

        // Wait for the write to be processed
        await new Promise(resolve => setTimeout(resolve, 200));

        expect(resourceVersionReceived).to.be.true;
        expect(gotVersion).to.deep.equal({
            resourceId: resourceConfig.id!,
            eventId: "mock-event-id",
            versionId: "mock-version-id",
            timestamp: gotVersion?.timestamp,
            objectNames: ["mock-object-name"],
            metadata: {},
        });
        expect(gotResourceObject).to.deep.equal({
            name: "mock-object-name",
            content: "test"
        });
    });
});
