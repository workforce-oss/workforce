import { Sequelize } from "sequelize-typescript";
import { replacer } from "../../../src/util/json.js";
import { CredentialDb } from "../../../src/objects/credential/db.js";
import { expect } from "chai";
import { randomUUID } from "crypto";
import { CredentialConfig } from "../../../src/objects/credential/model.js";
import { dockerConnectionString } from "../../helpers/db.js";
import { Outbox } from "../../../src/objects/base/outbox.js";
import { createOrg } from "../../helpers/db.js";
import { OrgDb } from "../../../src/identity/db.org.js";
import { SpaceDb } from "../../../src/identity/db.space.js";

describe("Credential DB", () => {
    let sequelize: Sequelize;
    before(() => (sequelize = new Sequelize(dockerConnectionString, {
        models: [OrgDb, SpaceDb, CredentialDb, Outbox],
        logging: false
    })));
    beforeEach(async () => await sequelize.sync({ force: true }));

    describe("CredentialDb", () => {
        it("should create a db object from a model, save it, retrieve it, and convert back", async () => {
            const orgId = randomUUID();
            await createOrg(orgId);

            const credentialConfig: CredentialConfig = {
                name: "test",
                description: "test",
                type: "credential",
                subtype: "trello-tracker",
                orgId: orgId,
                secretId: randomUUID(),
            }

            const credentialDb = new CredentialDb().loadModel(credentialConfig);
            credentialConfig.id = credentialDb.id;
            await credentialDb.save();

            const retrievedCredentialDb = await CredentialDb.findByPk(credentialDb.id);

            const retrievedCredentialConfig = retrievedCredentialDb!.toModel();

            expect(retrievedCredentialConfig).to.deep.equal(credentialConfig);
        });
        it("should not be possible to create two credentials with the same name for the same org", async () => {
            const orgId = randomUUID();
            await createOrg(orgId);

            const credentialConfig: CredentialConfig = {
                name: "test",
                description: "test",
                type: "credential",
                subtype: "mock",
                orgId: orgId,
                secretId: randomUUID(),
                variables: {
                    output: "test"
                }
            }

            const credentialDb = new CredentialDb().loadModel(credentialConfig);
            credentialConfig.id = credentialDb.id;
            await credentialDb.save();

            const credentialDb2 = new CredentialDb().loadModel(credentialConfig);
            credentialConfig.id = credentialDb2.id;
            try {
                await credentialDb2.save();
            } catch (e: any) {
                expect(e.message).to.equal("Validation error");
            }
        });
    });
});