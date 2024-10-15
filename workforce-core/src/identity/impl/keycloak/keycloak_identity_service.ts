import KcAdminClient from '@keycloak/keycloak-admin-client';
import { Credentials } from "@keycloak/keycloak-admin-client/lib/utils/auth.js";
import { randomUUID } from "crypto";
import { Configuration } from "../../../config/configuration.js";
import { Logger } from "../../../logging/logger.js";
import { WorkforceUser, WorkforceUserCreateRequest, WorkforceUserUpdateRequest } from "../../model.js";
import { IdentityService } from "../../service.js";

export class KeycloakIdentityService implements IdentityService {
    private client: KcAdminClient;
    private logger: Logger = Logger.getInstance("keycloak-identity-service");
    private authenticated = false;

    constructor(errorReturn: (error: Error) => void) {
        if (!Configuration.KeycloakBaseUrl) {
            throw new Error("KeycloakBaseUrl is not configured");
        }
        if (!Configuration.KeycloakRealmName) {
            throw new Error("KeycloakRealmName is not configured");
        }
        if (!Configuration.KeycloakClientId) {
            throw new Error("KeycloakClientId is not configured");
        }
        if (!Configuration.KeycloakUsername) {
            throw new Error("KeycloakUsername is not configured");
        }
        if (!Configuration.KeycloakPassword) {
            throw new Error("KeycloakPassword is not configured");
        }
        this.client = new KcAdminClient({
            baseUrl: Configuration.KeycloakBaseUrl,
        });

        const credentials: Credentials = {
            grantType: 'password',
            clientId: Configuration.KeycloakClientId,
            username: Configuration.KeycloakUsername,
            password: Configuration.KeycloakPassword,
        }

        this.client.auth(credentials).then(() => {
            this.authenticated = true;
            this.logger.info('Authenticated to Keycloak');
        }).catch((error: Error) => {
            this.logger.error('Failed to authenticate to Keycloak', error);
            errorReturn(error);
        });

        setInterval(() => {
            this.client.auth(credentials).catch((error: Error) => {
                this.logger.error('Failed to reAuthenticate to Keycloak', error);
                errorReturn(error);
            });
        }, 1000 * 60);
    }

    private awaitAuthenticated(retries?: number): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.authenticated) {
                resolve();
            } else {
                if (retries && retries >= 5) {
                    reject(new Error('Failed to authenticate to Keycloak'));
                }
                setTimeout(() => {
                    this.awaitAuthenticated(retries ? retries + 1 : 1).then(() => {
                        resolve();
                    }).catch((error: Error) => {
                        reject(error);
                    });
                }, 1000);
            }
        });
    }

    async createUser(user: WorkforceUserCreateRequest): Promise<WorkforceUser> {
        await this.awaitAuthenticated();
        const id = user.id ?? randomUUID();
        const kcUser = await this.client.users.create({
            realm: Configuration.KeycloakRealmName,
            id: id,
            username: user.username,
            email: user.email,
            enabled: true,
            firstName: user.firstName,
            lastName: user.lastName,
            emailVerified: true,
            credentials: [{
                type: 'password',
                value: user.password,
            }],
        }).catch((error: Error) => {
            this.logger.error('Failed to create keycloak user', error);
            throw error;
        });
        if (!kcUser) {
            throw new Error('Failed to create keycloak user');
        }

        return {
            id: kcUser.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
        };

    }
    async getUser(id: string): Promise<WorkforceUser> {
        await this.awaitAuthenticated();
        const user = await this.client.users.findOne({
            realm: Configuration.KeycloakRealmName,
            id: id
        }).catch((error: Error) => {
            this.logger.error('Failed to get keycloak user', error);
            throw error;
        });
        if (!user) {
            throw new Error('Failed to get keycloak user');
        }
        return {
            id: user.id,
            username: user.username!,
            firstName: user.firstName!,
            lastName: user.lastName!,
            email: user.email!,
        };
    }
    async getUserByUsername(username: string): Promise<WorkforceUser> {
        await this.awaitAuthenticated();
        const users = await this.client.users.find({
            realm: Configuration.KeycloakRealmName,
            username: username
        }).catch((error: Error) => {
            this.logger.error('Failed to get keycloak user', error);
            throw error;
        });
        if (!users || users.length === 0) {
            this.logger.warn(`User not found with username ${username}`);
            throw new Error('User not found');
        }

        if (users.length > 1) {
            this.logger.warn(`Found multiple users with username ${username}`);
            throw new Error('Failed to get keycloak user, multiple users found');
        }

        const user = users[0];

        return {
            id: user.id,
            username: user.username!,
            firstName: user.firstName!,
            lastName: user.lastName!,
            email: user.email!,
        };
    }
    async updateUser(user: WorkforceUserUpdateRequest): Promise<WorkforceUser> {
        await this.awaitAuthenticated();
        await this.client.users.update({
            realm: Configuration.KeycloakRealmName,
            id: user.id!
        }, {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
        }).catch((error: Error) => {
            this.logger.error('Failed to update keycloak user', error);
            throw error;
        });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...updated } = user;
        return updated;
    }
    async deleteUser(id: string): Promise<void> {
        await this.awaitAuthenticated();
        await this.client.users.del({
            realm: Configuration.KeycloakRealmName,
            id: id
        }).catch((error: Error) => {
            this.logger.error('Failed to delete keycloak user', error);
            throw error;
        });

    }
    destroy(): Promise<void> {
        return Promise.resolve();
    }
}