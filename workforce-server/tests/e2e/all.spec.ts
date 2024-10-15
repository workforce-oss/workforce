import { expect } from "chai";
import { randomUUID } from "crypto";
import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import { Configuration, CredentialConfig, FlowConfig, OrgDb, OrgUserRelationDb, UserDb, formatCredentials, formatDocumentRepositories, formatFlow } from "workforce-core";
import { TestContext } from "./context/TestContext.js";

describe("Flows", () => {
    const context = new TestContext();
    const orgId = randomUUID();
    let jwt: string;

    const getJson = (fileName: string): any => {
        try {
            const buffer = fs.readFileSync(path.join(context.__dirname, fileName), "utf-8");
            const yamlString = buffer.toString();
            // convert yaml to json
            return yaml.load(yamlString);
        } catch (e) {
            console.error(e);
            throw e;
        }
    }

    beforeEach(async () => {
        await context.init().catch((e) => {
            console.error(`Error starting Workforce Server: ${JSON.stringify(e)}`);
            throw e;
        });
        const org = await OrgDb.create({
            id: orgId,
            name: "Test Org",
            status: "active",
        })
        const user = await UserDb.create({
            username: "test-user",
            email: "test@example.com",
            firstName: "Test",
            lastName: "User",        
        });
        await OrgUserRelationDb.create({
            orgId: org.id,
            userId: user.id,
            role: "admin",
        });
        jwt = await context.createJwt({
            payload: {},
            issuer: Configuration.OAuth2IssuerUri,
            subject: user.id,
            audience: Configuration.OAuth2Audience,
        })

        const credentialBuffer = fs.readFileSync(path.join(context.__dirname, "../configs/credentials.yaml"), "utf-8");
        const credentialYamlString = credentialBuffer.toString();
        // convert yaml to json
        const credentialJson = yaml.load(credentialYamlString);
        formatCredentials((credentialJson as any)?.credentials as CredentialConfig[], orgId);
        // create credentials
        for (const credential of (credentialJson as any)?.credentials as CredentialConfig[]) {
            const credentialResponse = await fetch(`${Configuration.BaseUrl}/credentials`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${jwt}`,
                },
                body: JSON.stringify(credential),
            });
            expect(credentialResponse.status).to.equal(201);
        }
    });

    it("Should exercise Excelsior", async () => {
        const documentRepositoryJson = getJson("../configs/document-repositories.yaml");
        formatDocumentRepositories(documentRepositoryJson.documentRepositories, orgId);
        // create document repositories
        for (const documentRepository of documentRepositoryJson.documentRepositories) {
            const documentRepositoryResponse = await fetch(`${Configuration.BaseUrl}/document-repositories`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${jwt}`,
                },
                body: JSON.stringify(documentRepository),
            });
            expect(documentRepositoryResponse.status).to.equal(201);
        }


        const flowJson = getJson("../configs/Excelsior.yaml");
        formatFlow(flowJson as FlowConfig, orgId);
        // create flow
        const response = await fetch(`${Configuration.BaseUrl}/flows`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwt}`,
            },
            body: JSON.stringify(flowJson),
        });

        expect(response.status).to.equal(201);

    }).timeout(10000);
});
