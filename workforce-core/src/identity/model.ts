export type WorkforceClient = "workforce-api" | "workforce-engine" | "secret-service" | "storage-api";

export type WorkforceRole = (typeof workerRoles)[number];

export const workerRoles = ["admin", "maintainer", "developer", "reporter"] as const;

export interface WorkforceOrg {
    id?: string;
    name: string;
    status: string;
    description?: string;
    company?: string;
}

export interface WorkforceSpace {
    id?: string;
    orgId: string;
    name: string;
    description?: string;
}

export interface WorkforceUser {
    id?: string;
    idpId?: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
}

export type WorkforceUserCreateRequest = {
    password: string;
} & WorkforceUser;

export type WorkforceUserUpdateRequest = {
    password?: string;
} & WorkforceUser;

export interface WorkforceOrgUserRelation {
    id?: string;
    orgId: string;
    userId: string;
    role: WorkforceRole;
}

export interface WorkforceSpaceUserRelation {
    id?: string;
    spaceId: string;
    userId: string;
    role: WorkforceRole;
}

export interface WorkforceIdentityProvider {
    id?: string;
    secretId: string;
    type: string;
}

export interface WorkforceIdenityProviderConfig {
    clientId?: string;
    clientSecret?: string;
    callbackUrl?: string;
}