import { Logger } from "../../../logging/logger.js";
import { UserDb } from "../../db.user.js";
import { WorkforceUser, WorkforceUserCreateRequest, WorkforceUserUpdateRequest } from "../../model.js";
import { IdentityService } from "../../service.js";
import bcrypt from "bcryptjs";
import { LocalIdentityDb } from "./db.js";

export class LocalIdentityService implements IdentityService {
    
    logger: Logger = Logger.getInstance("LocalIdentityService");

    async getUser(id: string): Promise<WorkforceUser> {
        this.logger.debug(`Getting user: ${id}`);
        const user = await UserDb.findByPk(id).catch((err) => {
            this.logger.error(`Error getting user: ${err}`);
            return null;
        });

        if (!user) {
            throw new Error(`User not found: ${id}`);
        }

        return user.toModel();
    }

    async getUserByUsername(username: string): Promise<WorkforceUser> {
        this.logger.debug(`Getting user: ${username}`);
        const user = await UserDb.findOne({
            where: {
                username: username
            }
        }).catch((err) => {
            this.logger.error(`Error getting user: ${err}`);
            return null;
        });

        if (!user) {
            throw new Error(`User not found: ${username}`);
        }

        return {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
        }

    }
    async updateUser(user: WorkforceUserUpdateRequest): Promise<WorkforceUser> {
        this.logger.debug(`Updating user: ${user.id}`);
        if (user.password) {
            const localIdentityDb = await LocalIdentityDb.findOne({
                where: {
                    username: user.username
                }
            }).catch((err) => {
                this.logger.error(`Error getting local identity: ${err}`);
                return null;
            });

            const passwordHash = await bcrypt.hash(user.password, 12);

            if (!localIdentityDb) {
                throw new Error(`Local identity not found: ${user.username}`);
            }

            localIdentityDb.passwordHash = passwordHash;

            await localIdentityDb.save().catch((err) => {
                this.logger.error(`Error updating local identity: ${err}`);
                return null;
            });
        }

        return {
            id: user.id,
            idpId: user.idpId,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
        }
    }
    async deleteUser(id: string): Promise<void> {
        this.logger.debug(`Deleting user: ${id}`);
        const user = await UserDb.findByPk(id).catch((err) => {
            this.logger.error(`Error getting user: ${err}`);
            return null;
        });

        if (!user) {
            throw new Error(`User not found: ${id}`);
        }

        const localIdentityDb = await LocalIdentityDb.findOne({
            where: {
                username: user.username
            }
        }).catch((err) => {
            this.logger.error(`Error getting local identity: ${err}`);
            return null;
        });

        if (localIdentityDb) {
            this.logger.debug(`Deleting local identity: ${localIdentityDb.username}`);
            await localIdentityDb.destroy().catch((err) => {
                this.logger.error(`Error deleting local identity: ${err}`);
                return null;
            });
        }

        await user.destroy().catch((err) => {
            this.logger.error(`Error deleting user: ${err}`);
            return null;
        });
    }
    async createUser(user: WorkforceUserCreateRequest): Promise<WorkforceUser> {
        const passwordHash = await bcrypt.hash(user.password, 12);

        const localIdentityDb = await LocalIdentityDb.create({
            username: user.username,
            passwordHash: passwordHash
        }).catch((err) => {
            this.logger.error(`Error creating local identity: ${err}`);
            return null;
        });

        if (!localIdentityDb) {
            throw new Error(`Error creating local identity: ${user.username}`);
        }

        return {
            id: localIdentityDb.id,
            idpId: user.idpId,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
        }
    }

    async destroy(): Promise<void> {
        // no-op
        return Promise.resolve();
    }
}

