import { expect } from "chai";

import { OpenAPIAuthHelper } from "../../../../src/objects/tool/impl/openapi/openapi_auth_helper.js";
import schema from "../../../../src/objects/tool/impl/google_drive/api_schema.js";
import { AuthData } from "../../../../src/objects/tool/impl/openapi/openapi_types.js";
describe("Google Drive Tool", () => {

    function getStateAuthorizationUrl(state: string) {
        return `https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=client_id&redirect_uri=%2Fworkforce-api%2Fauth%2Fcallback&scope=openid+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file&state=${state}&prompt=consent+select_account`;
    }

    describe("OpenAPIAuthHelper", () => {
        it("should get the correct authentication", async () => {
            const auth = await OpenAPIAuthHelper.getAuth(schema, {
                client_id: "client_id",
                client_secret: "client_secret",
                oauth2_audience: "oauth2_audience"
            })

            expect(auth.state).to.not.be.undefined;

            const expectedAuth: AuthData = {
                authType: "oauth2_authorization_code",
                authorizationUrl: getStateAuthorizationUrl(auth.state ?? ""),
                scope: "openid https://www.googleapis.com/auth/drive.file",
                state: auth.state,
                tokenUrl: "https://accounts.google.com/o/oauth2/token",
            }

            
            expect(auth).to.deep.equal(expectedAuth);
        });
    });
});