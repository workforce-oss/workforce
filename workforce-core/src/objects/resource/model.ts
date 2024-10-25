import { BaseConfig } from "../base/model.js";

export interface WriteRequest  {
    resourceId: string;
    requestId: string;
    message: string;
    data: ResourceObject | Record<string, unknown>;
}

export interface ResourceObjectVersion {
    metadata: Record<string, unknown>;
    resourceObject: ResourceObject;
}

export interface ResourceObject {
    name: string;
    content: string;
    metadata?: Record<string, unknown>;
}

export interface ResourceVersion {
    resourceId: string;
    eventId: string;
    versionId: string;
    timestamp: number;
    objectNames: string[];
    metadata: Record<string, unknown>;
}

export type ResourceType = typeof resourceTypes[number];

export interface ResourceWrite {
    id: string;
    resourceId: string;
    timestamp: number;
    status: ResourceWriteStatus;
    data?: Record<string, unknown>;
}

export type ResourceWriteStatus = "started" | "complete" | "error";

export const resourceTypes = [
    "mock-resource",
    "api-resource",
    "github-repo-resource",
    "raw-text-resource",
    "github-pull-request-resource",
] as const;

export interface ResourceConfig extends BaseConfig {
    type: ResourceType;
    example?: string;
}