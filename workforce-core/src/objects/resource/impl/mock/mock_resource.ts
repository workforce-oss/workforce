import { Logger } from "../../../../logging/logger.js";
import { VariablesSchema } from "../../../base/variables_schema.js";
import { MockChannelMetadata } from "../../../channel/impl/mock/mock_channel_metadata.js";
import { Resource } from "../../base.js";
import { ResourceConfig, ResourceObject, ResourceVersion, WriteRequest } from "../../model.js";
import { MockResourceMetadata } from "./mock_resource_metadata.js";

export class MockResource extends Resource {
    logger = Logger.getInstance("MockResource");
    
    constructor(config: ResourceConfig, onFailure: (objectId: string, error: string) => void) {
        super(config, onFailure);
        this.versions.next({
            resourceId: this.config.id!,
            eventId: "mock-event-id",
            versionId: "mock-version-id",
            timestamp: Date.now(),
            objectNames: ["mock-object-name"],
            metadata: {},
        });
    }

    public static defaultConfig(orgId: string): ResourceConfig {
        return MockResourceMetadata.defaultConfig(orgId);
    }

    private objects = new Map<string, ResourceObject>();

    fetchObject(resourceVersion: ResourceVersion, objectName: string): Promise<ResourceObject> {
        if (!this.objects.has(objectName)) {
            const output = this.config.variables?.output as ResourceObject | undefined;
            if (!output) {
                throw new Error("No output provided");
            }

            this.logger.debug(`Creating new object for ${objectName} in ${this.config.id} with value ${output.content}`);
            this.objects.set(objectName, output);
        }
        const obj = this.objects.get(objectName);
        if (!obj) {
            throw new Error(`Object ${objectName} not found`);
        }
        return Promise.resolve(obj);
    }

    refresh(): Promise<void> {
        this.versions.next({
            resourceId: this.config.id!,
            eventId: "mock-event-id",
            versionId: "mock-version-id",
            timestamp: Date.now(),
            objectNames: ["mock-object-name"],
            metadata: {},
        });
        return Promise.resolve();
    }

    async write(writeRequest: WriteRequest): Promise<void> {
        this.objects.set("mock-object-name", writeRequest.data as ResourceObject);
        this.versions.next({
            resourceId: this.config.id!,
            eventId: "mock-event-id",
            versionId: "mock-version-id",
            timestamp: Date.now(),
            objectNames: ["mock-object-name"],
            metadata: {},
        });
        return Promise.resolve();
    }

    static variablesSchema(): VariablesSchema {
        return MockChannelMetadata.variablesSchema();
    }

}