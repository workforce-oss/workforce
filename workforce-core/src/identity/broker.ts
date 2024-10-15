import { Logger } from "../logging/logger.js";
import { OrgDb } from "./db.org.js";
import { OrgUserRelationDb } from "./db.org_user.js";
import { UserDb } from "./db.user.js";
import { IdentityServiceFactory } from "./impl/factory.js";
import { WorkforceUser, WorkforceUserCreateRequest, WorkforceUserUpdateRequest } from "./model.js";
import { IdentityService } from "./service.js";

export class IdentityBroker {
    private logger: Logger = Logger.getInstance("IdentityBroker");
    identityService: IdentityService;

    static create(): IdentityBroker {
        return new IdentityBroker();
    }

    private constructor() {
        this.identityService = IdentityServiceFactory.createIdentityService((error: Error) => {
            this.logger.error(`Error creating identity service: ${error}`);
        });
    }

    async createUser(user: WorkforceUserCreateRequest): Promise<WorkforceUser> {
        this.logger.debug(`Creating user: ${user.username}`);
        const userExists = await UserDb.findOne({
            where: {
                username: user.username
            }
        }).catch((err) => {
            this.logger.error(`Error getting user: ${err}`);
            return null;
        });

        if (userExists) {
            throw new Error(`User already exists: ${user.username}`);
        }

        const created = await this.identityService.createUser(user);
        const userDb = await UserDb.create({
            id: created.id,
            username: created.username,
            email: created.email,
            firstName: created.firstName,
            lastName: created.lastName,
        }).catch((err) => {
            this.logger.error(`Error creating user: ${err}`);
            return null;
        });

        if (!userDb) {
            throw new Error(`Error creating user: ${created.username}`);
        }

        const orgDb = await OrgDb.create({
            name: created.username,
            status: "active",
            description: "Default org for user",
        }).catch((err) => {
            this.logger.error(`Error creating org: ${err}`);
            return null;
        });

        if (!orgDb) {
            throw new Error(`Error creating org: ${user.username}`);
        }

        const relation = await OrgUserRelationDb.create({
            orgId: orgDb.id,
            userId: userDb.id,
            role: "admin",
        }).catch((err) => {
            this.logger.error(`Error creating org user relation: ${err}`);
            return null;
        });

        if (!relation) {
            throw new Error(`Error creating org user relation: ${created.username}`);
        }

        return created;

    }

    async getUser(id: string): Promise<WorkforceUser> {
        return this.identityService.getUser(id);
    }

    async getUserByUsername(username: string): Promise<WorkforceUser> {
        return this.identityService.getUserByUsername(username);
    }

    async updateUser(user: WorkforceUserUpdateRequest): Promise<WorkforceUser> {
        const userDb = await UserDb.findByPk(user.id).catch((err) => {
            this.logger.error(`Error getting user: ${err}`);
            return null;
        });
        if (!userDb) {
            throw new Error(`User not found: ${user.id}`);
        }
        
        const updated = await this.identityService.updateUser(user);

        userDb.username = updated.username;
        userDb.email = updated.email;
        userDb.firstName = updated.firstName;
        userDb.lastName = updated.lastName;

        await userDb.save().catch((err) => {
            this.logger.error(`Error updating user: ${err}`);
            return null;
        });

        return updated;
    }

    async deleteUser(id: string): Promise<void> {
        await this.identityService.deleteUser(id);
        this.logger.debug(`Deleted user: ${id}`);
        OrgUserRelationDb.destroy({
            where: {
                userId: id
            }
        }).then(() => {
            UserDb.destroy({
                where: {
                    id: id
                }
            }).catch((err) => {
                this.logger.error(`Error deleting user: ${err}`);
            });
            this.logger.debug(`Deleted org user relation for: ${id}`);
        }).catch((err_1) => {
            this.logger.error(`Error deleting org user relation: ${err_1}`);
        });
    }

    async destroy(): Promise<void> {
        return this.identityService.destroy();
    }
}