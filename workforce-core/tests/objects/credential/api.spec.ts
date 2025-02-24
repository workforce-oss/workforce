import { expect } from "chai";
import { randomUUID } from "crypto";
import express, { Application } from "express";
import { auth } from "express-oauth2-jwt-bearer";
import expressWs from "express-ws";
import * as fs from "fs";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { Sequelize } from "sequelize-typescript";
import request from "supertest";
import { CredentialRouter } from "../../../src/objects/credential/api.js";
import { CredentialConfig } from "../../../src/objects/credential/model.js";
import { jsonParse } from "../../../src/util/json.js";
import { createOrg, createUser, newDb } from "../../helpers/db.js";
import { createJwt, issuerHandlers } from "../../helpers/jwt.js";
import { mockCredentialConfig } from "../../helpers/mock_objects.js";
import { SecretRoutes } from "../../../src/secrets/api.js";
import { EncryptionService } from "../../../src/crypto/encryption_service.js";
import { CredentialDb } from "../../../src/objects/credential/db.js";


describe("Credential API", () => {
    const app = expressWs(express() as unknown as expressWs.Application).app as unknown as Application & expressWs.WithWebsocketMethod;

    let sequelize: Sequelize;
    let orgId: string;
    let jwt: string;
    const server = setupServer(...issuerHandlers,
        http.get(`https://localhost:3100/secrets/:id`, async (req) => {
            const response = await request(app).get(`/secrets/${req.params.id}`)
                .set("Authorization", req.request.headers.get("Authorization") || "");
            return HttpResponse.json(response.body);
        }),
        http.post(`https://localhost:3100/secrets`, async (req) => {
            const decoder = new TextDecoder();
            let body = "";
            if (req.request.body) {
                for await (const chunk of req.request.body) {
                    body += decoder.decode(chunk);
                }
            }
            const response = await request(app).post(`/secrets`)
                .set("Authorization", req.request.headers.get("Authorization") || "")
                .set("Content-Type", req.request.headers.get("Content-Type") || "")
                .send(jsonParse(body));
            return HttpResponse.json(response.body);
        }),
        http.put(`https://localhost:3100/secrets/:id`, async (req) => {
            const decoder = new TextDecoder();
            let body = "";
            if (req.request.body) {
                for await (const chunk of req.request.body) {
                    body += decoder.decode(chunk);
                }
            }
            const response = await request(app).put(`/secrets/${req.params.id}`)
                .set("Authorization", req.request.headers.get("Authorization") || "")
                .set("Content-Type", req.request.headers.get("Content-Type") || "")
                .send(body);
            return HttpResponse.json(response.body);
        }),
    );
    process.env.OAUTH2_ISSUER_URI = "https://localhost:3100";
    process.env.OAUTH2_CLIENT_ID = "workforce-api";
    process.env.OAUTH2_CLIENT_SECRET = "test-secret";
    process.env.OAUTH2_AUDIENCE = "https://api/";
    process.env.SECRET_SERVICE_URI = "https://localhost:3100";

    before(async () => {
        sequelize = newDb();
        server.listen({ onUnhandledRequest: "bypass" });
        app.use(auth({
            issuerBaseURL: 'https://localhost:3100/',
            audience: 'https://api/',
        }));
        orgId = randomUUID();
        jwt = await createJwt({ payload: { orgId } });

        app.use("/orgs/:orgId/credentials", CredentialRouter);
        app.use("/secrets", SecretRoutes);

        const publicKeys = new Map();
        publicKeys.set("workforce-api", "test-pub.pem");
        publicKeys.set("secret-service", "test-pub.pem");
        await EncryptionService.init("test-priv.pem", "test-pub.pem", "test-password", publicKeys);
    });
    beforeEach(async () => {
        await sequelize.sync({ force: true });
        await createOrg(orgId);
        const user = await createUser("test-user", orgId);
        jwt = await createJwt({ subject: user.id });
    });
    after(() => {
        try {
            server.close();
        } catch (e) {
            console.error(e);
        }
      // Clean up keys
        try {
            fs.unlinkSync("test-priv.pem");
            fs.unlinkSync("test-pub.pem");
        } catch (e) {
            console.error(e);
        }
    });

    describe("POST /credentials", () => {
        it("should create a credential", async () => {
            const credentialConfig: CredentialConfig = mockCredentialConfig({ name: "test-credential", orgId });

            await request(app)
                .post(`/orgs/${orgId}/credentials`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .send(credentialConfig)
                .expect(201);

            const response = await request(app)
                .get(`/orgs/${orgId}/credentials`)
                .set("Authorization", `Bearer ${jwt}`)
                .expect(200);
            // secret Id should not be returned
            expect(response.body.secretId).to.be.undefined;

            // variables should not be returned
            expect(response.body.variables).to.be.undefined;

            // secret Id should be stored in the database
            const dbCredential = await CredentialDb.findOne({ where: { orgId, name: credentialConfig.name } });
            expect(dbCredential).to.not.be.null;
            expect(dbCredential?.secretId).to.not.be.null;
        });
        it("should not create a new credential for a different org", async () => {
            const otherOrgId = randomUUID();
            await createOrg(otherOrgId);

            const credentialConfig: CredentialConfig = mockCredentialConfig({ name: "test-credential", orgId: otherOrgId });
            await request(app)
                .post(`/orgs/${otherOrgId}/credentials`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .send(credentialConfig)
                .expect(404);
        });
        it("should not create a credential for an invalid variables schema", async () => {
            const credentialConfig: CredentialConfig = mockCredentialConfig({ name: "test-credential", orgId });
            credentialConfig.variables = { secret_key: { value: "should not be a number, not an object" } };

            await request(app)
                .post(`/orgs/${orgId}/credentials`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .send(credentialConfig)
                .expect(400);
        });
    });

    describe("GET /credentials/:id", () => {
        it("should get a credential", async () => {
            const credentialConfig: CredentialConfig = mockCredentialConfig({ name: "test-credential", orgId });

            const createResponse = await request(app)
                .post(`/orgs/${orgId}/credentials`)
                .set("Authorization", `Bearer ${jwt}`)
                .set("Content-Type", "application/json")
                .send(credentialConfig)
                .expect(201);

            const response = await request(app)
                .get(`/orgs/${orgId}/credentials/${createResponse.body.id}`)
                .set("Authorization", `Bearer ${jwt}`)
                .expect(200);

            // secret Id should be returned for gets
            expect(response.body.secretId).to.not.be.null;

            // variables should be returned
            expect(response.body.variables.secret_key).to.equal(1);
        });
    });
});