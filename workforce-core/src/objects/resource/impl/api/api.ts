import { randomUUID } from "crypto";
import { Logger } from "../../../../logging/logger.js";
import { WebhookEvent } from "../../../../manager/webhook_route_manager.js";
import { FunctionParameters, getFunctionsForPath, getPaths, performAPICall } from "../../../../util/openapi.js";
import { Resource } from "../../base.js";
import { ResourceConfig, ResourceObject, ResourceVersion, WriteRequest } from "../../model.js";
import { jsonParse } from "../../../../util/json.js";

export class ApiResource extends Resource {
    logger = Logger.getInstance("ApiResource");

    constructor(config: ResourceConfig, onFailure: (objectId: string, error: string) => void) {
        super(config, onFailure);
    }

    webhookHandler(event: WebhookEvent): Promise<void> {
        this.logger.debug("Received webhook event", event);
        return Promise.resolve();
    }

    async refresh(): Promise<void> {
        // no-op
    }

    write(writeRequest: WriteRequest): Promise<void> {
        this.logger.debug("Writing resource", writeRequest);
        return Promise.resolve();
    }

    async latestVersion(): Promise<ResourceVersion> {
        try {
            const latest = await super.latestVersion();
            if (latest?.objectNames && latest.objectNames.length > 0) {
                return latest;
            }
        } catch (e) {
            this.logger.error("Error getting latest version", e);
        }
        return {} as ResourceVersion;
    }

    async fetchObject(resourceVersion: ResourceVersion, objectName: string): Promise<ResourceObject> {
        const schema = await this.getApiSchema();
        if (!schema) {
            throw new Error("No schema found");
        }

        if (!this.config.variables?.fetch_path) {
            throw new Error("No fetch path provided");
        }

        if (!this.config.variables?.fetch_method) {
            throw new Error("No fetch method provided");
        }

        const result = await performAPICall({
            orgId: this.config.orgId,
            apiCall: {
                body: {},
                headers: {},
                path: this.config.variables.fetch_path as string,
                verb: this.config.variables.fetch_method as string,
                queryParams: {},
            },
            openApiDocument: schema,
            taskExecutionId: randomUUID(),
            variables: this.config.variables,
            logger: this.logger,
        }).catch((e) => {
            this.logger.error("Error fetching object", e);
            throw e;
        });

        if (result.error) {
            throw new Error(`Error fetching object: ${result.error as string}`);
        }

        return {
            name: objectName,
            content: JSON.stringify((result as Record<string, unknown>).response),
        };
    }

    private async getApiSchema(): Promise<Record<string, unknown> | undefined> {
        if (this.config.variables?.raw_schema) {
            return jsonParse(this.config.variables.raw_schema as string);
        }

        if (!this.config.variables?.schema_url) {
            throw new Error("No schema URL provided");
        }

        const schemaUrl = this.config.variables?.schema_url as string;
        const response = await fetch(schemaUrl);
        if (!response.ok) {
            throw new Error(`Error fetching schema: ${response.statusText}`);
        }
        return response.json() as Promise<Record<string, unknown>> | undefined;
    }

    public async schema(): Promise<Record<string, FunctionParameters>> {
        const apiSchema = await this.getApiSchema();
        if (!apiSchema) {
            return {}
        }

        const createPath = this.config.variables?.create_path;
        if (!createPath) {
            throw new Error("No create path provided");
        }
        
        const createMethod = this.config.variables?.create_method;
        if (!createMethod) {
            throw new Error("No create method provided");
        }

        const paths = getPaths(apiSchema) as Record<string, unknown> | undefined;

        if (!paths?.createPath) {
            throw new Error(`Path ${createPath as string} not found in schema`);
        }

        const f = getFunctionsForPath({path: createPath as string, targetVerb: createMethod as string, pathObj: (apiSchema.paths as Record<string, unknown>)[createPath as string] as Record<string, unknown>});

        if (!f) {
            throw new Error(`Function not found for path ${createPath as string} and method ${createMethod as string}`);
        }

        return {
            // functions: f
        }     
         
    }
}