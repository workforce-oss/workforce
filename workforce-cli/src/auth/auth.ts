import * as fs from "fs";
import { Issuer, TokenSet, generators } from "openid-client";
import * as http from "http";
import open from "open";

export type AuthConfig = {
  auth?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
    issuedAt: Date;
  };
  orgId?: string;
  apiUrl?: string;
  oauth2IssuerUri?: string;
  oauth2ClientId?: string;
};

export class Auth {
  public static config(): AuthConfig {
    const authConfig = this.getAuthConfigFromDisk();
    if (authConfig) {
      return authConfig;
    }
    throw new Error("Not logged in");
  }

  public static getAuthConfigFromDisk(): AuthConfig | undefined {
    const authConfigPath = this.getAuthConfigPath();
    if (fs.existsSync(authConfigPath)) {
      const authConfig = JSON.parse(fs.readFileSync(authConfigPath).toString());
      return authConfig;
    } else {
      fs.mkdirSync(authConfigPath.split("/").slice(0, -1).join("/"), { recursive: true });
      fs.writeFileSync(authConfigPath, JSON.stringify({}));
      return {}
    }
  }

  public static getAuthConfigPath(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    return `${homeDir}/workforce/.config.json`;
  }

  public static setAuth(auth: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
    issuedAt: Date;
  }) {
    const authConfig = this.getAuthConfigFromDisk();
    if (authConfig) {
      authConfig.auth = auth;
      fs.writeFileSync(this.getAuthConfigPath(), JSON.stringify(authConfig));
    }
  }

  public static setApiUrl(apiUrl: string) {
    const authConfig = this.getAuthConfigFromDisk();
    if (authConfig) {
      authConfig.apiUrl = apiUrl;
      fs.writeFileSync(this.getAuthConfigPath(), JSON.stringify(authConfig));
    }
  }

  public static setOrgId(orgId: string) {
    const authConfig = this.getAuthConfigFromDisk();
    if (authConfig) {
      authConfig.orgId = orgId;
      fs.writeFileSync(this.getAuthConfigPath(), JSON.stringify(authConfig));
    }
  }

  public static setOauth2IssuerUri(issuerUri: string) {
    const authConfig = this.getAuthConfigFromDisk();
    if (authConfig) {
      authConfig.oauth2IssuerUri = issuerUri;
      fs.writeFileSync(this.getAuthConfigPath(), JSON.stringify(authConfig));
    }
  }

  public static setOauth2ClientId(oauth2ClientId: string) {
    const authConfig = this.getAuthConfigFromDisk();
    if (authConfig) {
      authConfig.oauth2ClientId = oauth2ClientId;
      fs.writeFileSync(this.getAuthConfigPath(), JSON.stringify(authConfig));
    }
  }
}



export async function oauth2_login(issuerUri: string, oauth2ClientId: string): Promise<TokenSet> {
  // Initiliaze issuer configuration, discover or configure manually
  const issuer = await Issuer.discover(
    issuerUri
  );

  const client = new issuer.Client({
    client_id: oauth2ClientId,
    // fixed port 6363, could be dynamic, our webserver will be launched on this port
    redirect_uris: ["http://localhost:6363"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",

  });

  // Generate code challenge
  const code_verifier = generators.codeVerifier();
  const code_challenge = generators.codeChallenge(code_verifier);
  const state = Math.random().toString(36).substring(7);

  // Generate authorization url, that we will open for the user
  const authorizationUrl = await client.authorizationUrl({
    scope: "openid",
    code_challenge,
    code_challenge_method: "S256",
    audience: "https://api/",
    state
  });

  let params

  // Very simple webserver, using Nodes standard http module
  const server = http.createServer((req, res) => {
    // In here when the server gets a request
    if (req.url?.startsWith('/?')) {
      // The parameters could be parsed manually, but the openid-client offers a function for it
      params = client.callbackParams(req);
      res.end('You can close this browser now.')
    } else {
      res.end('Unsupported')
    }
  }).listen(6363) // static local port




  // Open authorization url in preferred browser, works cross-platform
  await open(authorizationUrl)

  // Recheck every 500ms if we received any parameters
  // This is a simple example without a timeout
  while (params === undefined) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const tokenSet = await client.callback('http://localhost:6363', params, { code_verifier, state });

  // we don't need the server anymore, stop listening
  server.close()

  console.log(tokenSet)
  if (!tokenSet.access_token) {
    throw new Error("No access token received")
  }
  return tokenSet;
}
