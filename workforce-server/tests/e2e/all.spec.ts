import { expect } from "chai";
import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import { Configuration, CredentialConfig, FlowConfig, UserDb } from "workforce-core";
import { WorkforceUser, WorkforceUserCreateRequest } from "../../../workforce-core/dist/identity/model.js";
import { TestContext } from "./context/TestContext.js";
import { fail } from "assert";

describe("Flows", () => {
    const context = new TestContext();
    let jwt: string;
    let orgId: string;
    let adminJwt: string;

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


    const setOrgId = async () => {
        const jwtParts = jwt.split(".");
        expect(jwtParts).to.have.lengthOf(3);
        const jwtPayload = JSON.parse(Buffer.from(jwtParts[1], "base64").toString());
        expect(jwtPayload).to.have.property("sub");
        const userId = jwtPayload.sub;

        console.log(`User ID: ${userId}`);
        console.log(`Fetching user: ${userId}`);
        
        const userApiResponse = await fetch(`${Configuration.BaseUrl}/users/${userId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwt}`,
            },
        });

        expect(userApiResponse.status).to.equal(200);

        const user = await userApiResponse.json() as WorkforceUser;
        expect(user.relations).to.have.lengthOf(1);
        expect(user.relations![0].role).to.equal("admin");
        
        orgId = user.relations![0].orgId;
    }


    const addUsers = async (fileName: string) => {
        const userJson = getJson(`../configs/${fileName}`) as any;
        console.log(userJson);
        // create users
        for (const user of userJson.users as WorkforceUserCreateRequest[]) {
            console.log(`Creating user: ${user.username}`);
            const userResponse = await fetch(`${Configuration.BaseUrl}/users`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${adminJwt}`,
                },
                body: JSON.stringify(user),
            });
            expect(userResponse.status).to.equal(201);

            const userData = await userResponse.json();
            expect(userData).to.have.property("id");

            jwt = await context.createJwt({
                payload: {},
                issuer: Configuration.OAuth2IssuerUri,
                subject: userData.id,
                audience: Configuration.OAuth2Audience,
            })
        }
    }

    const addCredentials = async (fileName: string) => {
        const credentialJson = getJson(`../configs/${fileName}`) as any;
        // create credentials
        for (const credential of credentialJson.credentials as CredentialConfig[]) {
            const credentialResponse = await fetch(`${Configuration.BaseUrl}/orgs/${orgId}/credentials`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${jwt}`,
                },
                body: JSON.stringify(credential),
            });
            expect(credentialResponse.status).to.equal(201);
        }
    }

    const addSkills = async (fileName: string) => {
        const skillsJson = getJson(`../configs/${fileName}`) as any;
        // create skills
        for (const skill of skillsJson.skills) {
            const skillResponse = await fetch(`${Configuration.BaseUrl}/orgs/${orgId}/skills`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${jwt}`,
                },
                body: JSON.stringify(skill),
            });
            expect(skillResponse.status).to.equal(201);
        }
    }

    const addWorkers = async (fileName: string) => {
        const workersJson = getJson(`../configs/${fileName}`) as any;
        // create workers
        for (const worker of workersJson.workers) {
            const workerResponse = await fetch(`${Configuration.BaseUrl}/orgs/${orgId}/workers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${jwt}`,
                },
                body: JSON.stringify(worker),
            });
            expect(workerResponse.status).to.equal(201);
        }
    }

    

    before(async () => {
        await context.init().catch((e) => {
            console.error(`Error starting Workforce Server: ${JSON.stringify(e)}`);
            throw e;
        });

        const adminUser = await UserDb.findOne({
            where: {
                username: "admin",
            },
        });
        if (!adminUser) {
            throw new Error("Admin user not found");
        }
        adminJwt = await context.createJwt({
            payload: {},
            issuer: Configuration.OAuth2IssuerUri,
            subject: adminUser.id,
            audience: Configuration.OAuth2Audience,
        });

    });

    beforeEach(async () => {
        // create a fresh user and org for each test

        // create users
        await addUsers("users.yaml");
        // set org id
        await setOrgId();
      
        // create credentials
        await addCredentials("credentials.yaml");

        // create skills
        await addSkills("skills.yaml");

        // create workers
        await addWorkers("workers.yaml");
    });

    it("Should exercise Excelsior", async () => {

        const documentRepositoryJson = getJson("../configs/document-repositories.yaml");
        // create document repositories
        for (const documentRepository of documentRepositoryJson.documentRepositories) {
            const documentRepositoryResponse = await fetch(`${Configuration.BaseUrl}/orgs/${orgId}/document-repositories`, {
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
        // create flow
        const response = await fetch(`${Configuration.BaseUrl}/orgs/${orgId}/flows`, {
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
