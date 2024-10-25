import { ObjectSubtype } from "../../../model.js";
import { CredentialConfig } from "../model.js";

export class CredentialConfigFactory {
    static defaultConfigFor(orgId: string, subtype: ObjectSubtype): CredentialConfig {
        return {
            id: crypto.randomUUID(),
            type: subtype,
            name: "Credential",
            description: "Credential",
            orgId: orgId,
        };
    }
}