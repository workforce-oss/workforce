import { Configuration } from "../../config/configuration.js";
import { IdentityService } from "../service.js";
import { KeycloakIdentityService } from "./keycloak/keycloak_identity_service.js";
import { LocalIdentityService } from "./local/local_identity_service.js";

export class IdentityServiceFactory {
    static createIdentityService(errorReturn: (error: Error) => void): IdentityService {
        switch (Configuration.IdentityManagerType) {
            case "local":
                return new LocalIdentityService();
            case "keycloak":
                return new KeycloakIdentityService(errorReturn);
            default:
                throw new Error(`Unsupported identity manager type: ${Configuration.IdentityManagerType}`);
        }
    }
}