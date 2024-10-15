import { Auth } from "../auth/auth.js";

export const configKeys = ["api", "org", "issuer-uri", "client-id"];

export async function config(key: string, value: string): Promise<void> {
    switch (key) {
        case "api":
            Auth.setApiUrl(value);
            break;
        case "org":
            Auth.setOrgId(value);
            break;
        case "issuer-uri":
            Auth.setOauth2IssuerUri(value);
            break;
        case "client-id":
            Auth.setOauth2ClientId(value);
            break;
        default:
            console.error("Invalid key. Please provide a valid key.");
            return;
    }
}


