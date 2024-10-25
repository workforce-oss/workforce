import { WorkforceAPIClient } from "workforce-api-client";
import { Auth, AuthConfig, oauth2_login } from "../auth/auth.js";
import { initApi } from "./base.js";
import { OrgAPI } from "workforce-api-client/dist/api/org_api.js";
import { OrgUserAPI } from "workforce-api-client/dist/api/org_user_api.js";
import { UserAPI } from "workforce-api-client/dist/api/user_api.js";
import { WorkforceUser } from "workforce-core/model";

export async function login(options: {
  oauth2IssuerUri?: string,
  oauth2ClientId?: string,
  api?: string,
}) {
  console.log("Logging in");
  console.log("issuer_uri: " + options.oauth2IssuerUri);
  const issuerUri = options.oauth2IssuerUri || Auth.config().oauth2IssuerUri;
  if (!issuerUri) {
    throw new Error("Issuer URI is required. Please provide an issuer URI or set a default issuer URI.");
  }

  const clientId = options.oauth2ClientId || Auth.config().oauth2ClientId;
  if (!clientId) {
    throw new Error("Client ID is required. Please provide a client ID or set a default client ID.");
  }

  const token = await oauth2_login(issuerUri, clientId);

  const output: AuthConfig = {
    auth: {
      accessToken: token.access_token!,
      expiresIn: token.expires_in!,
      tokenType: token.token_type!,
      issuedAt: new Date(),
      refreshToken: token.refresh_token!,
    },
    oauth2IssuerUri: issuerUri,
    oauth2ClientId: options.oauth2ClientId
  };

  // write to .workforce
  Auth.setAuth(output.auth!);
  Auth.setOauth2IssuerUri(output.oauth2IssuerUri!);
  Auth.setOauth2ClientId(output.oauth2ClientId!);

  console.log("Logged in");
  console.log("API URL: " + options.api);
  const tokenParts = token.access_token!.split(".");
  const payload = JSON.parse(Buffer.from(tokenParts[1], "base64").toString());
  const userId = payload.sub;
  const api: UserAPI | undefined = initApi("users", options.api) as UserAPI | undefined;
  if (api) {
    Auth.setApiUrl(options.api!);
    const response = await api.get(userId) as WorkforceUser;
    if (response.relations && response.relations.length > 0) {
      Auth.setOrgId(response.relations?.[0].orgId!);
    } 
  }
    
  
  console.log("Logged in");
}
