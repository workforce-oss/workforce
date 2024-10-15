import { WorkforceUser, WorkforceUserCreateRequest, WorkforceUserUpdateRequest } from "./model.js";

export interface IdentityService {
    createUser(user: WorkforceUserCreateRequest): Promise<WorkforceUser>;
    getUser(id: string): Promise<WorkforceUser>;
    getUserByUsername(username: string): Promise<WorkforceUser>;
    updateUser(user: WorkforceUserUpdateRequest): Promise<WorkforceUser>;
    deleteUser(id: string): Promise<void>;

    destroy(): Promise<void>;
}