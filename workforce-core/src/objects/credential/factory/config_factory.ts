import { CredentialConfig } from "../model.js";

export class CredentialConfigFactory {
    static defaultConfigFor(orgId: string, subtype: string): CredentialConfig {
        return {
            id: crypto.randomUUID(),
            type: "credential",
            subtype: subtype as unknown as CredentialConfig["subtype"],
            name: "Credential",
            description: "Credential",
            orgId: orgId,
        };
    }
}