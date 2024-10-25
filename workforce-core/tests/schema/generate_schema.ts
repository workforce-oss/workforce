import fs from "fs";
import { ConfigFactory } from "../../src/objects/base/factory/config_factory.js";
import { objectTypes } from "../../src/objects/base/factory/types.js";
import { VariablesSchemaFactory } from "../../src/objects/base/factory/variable_schema_factory.js";
import { BaseConfig } from "../../src/objects/base/model.js";
import { convertVariablesSchemaToJsonSchema } from "../../src/objects/base/variables_schema_tools.js";
import { channelTypes } from "../../src/objects/channel/model.js";
import { documentChunkStrategyTypes } from "../../src/objects/document_repository/model.js";
import { flowObjectTypes } from "../../src/objects/flow/model.js";
import { snakeify } from "../../src/util/snake.js";
import _, { flow } from "lodash";
import { title } from "process";

describe("Generate API Schema", () => {
    it("should generate the schema", async () => {
        const schema = {
            openapi: "3.0.3",
            info: {
                title: "Workforce API",
                version: "0.1.0",
            },
            servers: [
                {
                    url: "https://localhost:8085/workforce-api/",
                }
            ],
            security: [
                {
                    oauth2: [],
                },
            ],
            paths: {} as Record<string, any>,
            components: {
                schemas: {} as Record<string, any>,
                securitySchemes: {
                    oauth2: {
                        type: "oauth2",
                        flows: {
                            authorizationCode: {
                                authorizationUrl: "http://localhost:8085/insecure/authorize",
                                tokenUrl: "http://localhost:8085/token",
                                scopes: {
                                    openid: ""
                                },
                            },
                        },
                    }
                }

            },
        };

        const baseComponentSchemas = {} as Record<string, any>;
        const baseComponentJsonSchemas = {} as Record<string, any>;

        // Add the credential schema
        baseComponentSchemas.credential = {
            oneOf: objectTypes.filter(objectType => objectType != "credential").map((objectType) => {
                return { $ref: `#/components/schemas/${objectType}_credential` }
            }),
        }
        baseComponentJsonSchemas.credential = {
            oneOf: objectTypes.filter(objectType => objectType != "credential").map((objectType) => {
                return { $ref: `${specRef("json-schema")}/${objectType}_credential` }
            }),
        }

        // Add the base object schema
        baseComponentSchemas.object = {
            type: "object",
            title: "Object",
            properties: {
                id: { type: "string", format: "uuid", description: "The unique identifier for the object", readOnly: true },
                orgId: { type: "string", format: "uuid", description: "The unique identifier for the organization the object belongs to.", readOnly: true },
                name: { type: "string" },
                description: { type: "string" },
                credential: { type: "string", description: "The name of the credential to use for this object." },
            },
            required: ["name", "description"],
        };
        baseComponentJsonSchemas.object = _.cloneDeep(baseComponentSchemas.object);

        // Add the base credential schema
        baseComponentSchemas.credential_object = {
            type: "object",
            title: "Credential",
            properties: {
                id: { type: "string", format: "uuid", description: "The unique identifier for the object", readOnly: true },
                orgId: { type: "string", format: "uuid", description: "The unique identifier for the organization the object belongs to.", readOnly: true },
                name: { type: "string" },
                description: { type: "string" },
            },
            required: ["name", "description", "variables"],
        }
        baseComponentJsonSchemas.credential_object = _.cloneDeep(baseComponentSchemas.credential_object);

        // Add the tool reference schema
        baseComponentSchemas.tool_reference = {
            type: "object",
            title: "Tool Reference",
            properties: {
                name: { type: "string" },
                id: { type: "string", format: "uuid" },
                output: { type: "string" },
            },
            required: ["name"],
        }
        baseComponentJsonSchemas.tool_reference = _.cloneDeep(baseComponentSchemas.tool_reference);

        // Add the subtask schema
        baseComponentSchemas.subtask = {
            type: "object",
            title: "Subtask",
            properties: {
                name: { type: "string" },
                id: { type: "string", format: "uuid" },
                async: { type: "boolean" },
            },
            required: ["name"],
        }
        baseComponentJsonSchemas.subtask = _.cloneDeep(baseComponentSchemas.subtask);

        const componentVariableSchemas = {} as Record<string, Record<string, any>>;
        const componentVariableJsonSchemas = {} as Record<string, Record<string, any>>;
        const variableSchemas = {} as Record<string, any>;
        const variableJsonSchemas = {} as Record<string, any>;
        const componentCredentialSchemas = {} as Record<string, Record<string, any>>;
        const componentCredentialJsonSchemas = {} as Record<string, Record<string, any>>;
        const credentialSchemas = {} as Record<string, any>;
        const credentialJsonSchemas = {} as Record<string, any>;
        const componentTypeSchemas = {} as Record<string, any>;
        const componentTypeJsonSchemas = {} as Record<string, any>;

        for (const objectType of objectTypes) {
            if (objectType === "credential") {
                continue;
            }

            const subtypes = ConfigFactory.getSubtypesForType(objectType).filter((subtype) => !subtype.startsWith("mock"));

            subtypes.sort();

            // Create all variables schemas, and credential schemas, but ignore this step for credentials as they inherit sensitive variables
            const variablesSchemas = {} as Record<string, any>;
            for (const subtype of subtypes) {
                // These are the non-sensitive variables
                const variablesSchema = VariablesSchemaFactory.for({
                    type: subtype
                } as BaseConfig, objectType);

                const jsonSchema = convertVariablesSchemaToJsonSchema(variablesSchema);
                variablesSchemas[subtype] = jsonSchema;

                if (!componentVariableSchemas[objectType]) {
                    componentVariableSchemas[objectType] = {};
                }
                if (!componentVariableJsonSchemas[objectType]) {
                    componentVariableJsonSchemas[objectType] = {};
                }


                componentVariableSchemas[objectType][`${snakeify(subtype)}_variables`] = jsonSchema;
                componentVariableJsonSchemas[objectType][`${snakeify(subtype)}_variables`] = jsonSchema;

                // These are the sensitive variables
                const credentialSchema = VariablesSchemaFactory.for({
                    type: subtype,
                } as BaseConfig, "credential");
                const credentialJsonSchema = convertVariablesSchemaToJsonSchema(credentialSchema);
                credentialJsonSchema.description = `The sensitive variables for the ${subtype} ${objectType}`;

                if (!componentCredentialSchemas[objectType]) {
                    componentCredentialSchemas[objectType] = {};
                }
                if (!componentCredentialJsonSchemas[objectType]) {
                    componentCredentialJsonSchemas[objectType] = {};
                }
                componentCredentialSchemas[objectType][`${snakeify(subtype)}_credential`] = credentialJsonSchema;
                componentCredentialJsonSchemas[objectType][`${snakeify(subtype)}_credential`] = credentialJsonSchema;
            }

            if (componentCredentialSchemas[objectType]) {
                for (const subtype of subtypes) {
                    credentialSchemas[`${snakeify(subtype)}_credential`] = componentCredentialSchemas[objectType][`${snakeify(subtype)}_credential`];
                }
                credentialSchemas[`${objectType}_credential`] = credentialSchema(subtypes);
                credentialSchemas[`${objectType}_credential`].title = `${objectType} Credential`;
            }

            if (componentCredentialJsonSchemas[objectType]) {
                for (const subtype of subtypes) {
                    credentialJsonSchemas[`${snakeify(subtype)}_credential`] = componentCredentialJsonSchemas[objectType][`${snakeify(subtype)}_credential`];
                }
                credentialJsonSchemas[`${objectType}_credential`] = credentialSchema(subtypes, false, "json-schema");
                credentialJsonSchemas[`${objectType}_credential`].title = `${objectType} Credential`;
            }

            if (componentVariableSchemas[objectType]) {
               for (const subtype of subtypes) {
                    variableSchemas[`${snakeify(subtype)}_variables`] = componentVariableSchemas[objectType][`${snakeify(subtype)}_variables`];
                }
            }

            if (componentVariableJsonSchemas[objectType]) {
                for (const subtype of subtypes) {
                    variableJsonSchemas[`${snakeify(subtype)}_variables`] = componentVariableJsonSchemas[objectType][`${snakeify(subtype)}_variables`];
                    variableJsonSchemas[`${snakeify(subtype)}_variables`].title = `${subtype} Variables`;
                }
            }
        }

        const identityApiSchema = _.cloneDeep(schema);
        const orgResourceApiSchema = _.cloneDeep(schema);
        const flowResourceApiSchema = _.cloneDeep(schema);

        identityApiSchema.paths = { ...identityApiSchema.paths, ...createRestEndpoint("users", "user", ["create", "read", "delete"]) }
        identityApiSchema.paths = { ...identityApiSchema.paths, ...createRestEndpoint("orgs", "org") }
        identityApiSchema.paths = { ...identityApiSchema.paths, ...createRestEndpoint("org-users", "org_user_relation") }

        orgResourceApiSchema.paths = { ...orgResourceApiSchema.paths, ...createRestEndpoint("credentials", "credential") }
        orgResourceApiSchema.paths = { ...orgResourceApiSchema.paths, ...createRestEndpoint("skills", "skill") }
        orgResourceApiSchema.paths = { ...orgResourceApiSchema.paths, ...createRestEndpoint("workers", "worker") }
        orgResourceApiSchema.paths = { ...orgResourceApiSchema.paths, ...createRestEndpoint("document-repositories", "document_repository") }
        orgResourceApiSchema.paths = { ...orgResourceApiSchema.paths, ...createRestEndpoint("flows", "flow") }


        flowResourceApiSchema.paths = { ...flowResourceApiSchema.paths, ...createRestEndpoint("channels", "channel") }
        flowResourceApiSchema.paths = { ...flowResourceApiSchema.paths, ...createRestEndpoint("documentation", "documentation") }
        flowResourceApiSchema.paths = { ...flowResourceApiSchema.paths, ...createRestEndpoint("resources", "resource") }
        flowResourceApiSchema.paths = { ...flowResourceApiSchema.paths, ...createRestEndpoint("tasks", "task") }
        flowResourceApiSchema.paths = { ...flowResourceApiSchema.paths, ...createRestEndpoint("tools", "tool") }
        flowResourceApiSchema.paths = { ...flowResourceApiSchema.paths, ...createRestEndpoint("trackers", "tracker") }


        const identityComponentSchemas = _.cloneDeep(componentTypeSchemas);
        const orgResourceComponentSchemas = _.cloneDeep(componentTypeSchemas);
        const flowResourceComponentSchemas = _.cloneDeep(componentTypeSchemas);
        

        identityComponentSchemas.user = userSchema();
        identityComponentSchemas.org = orgSchema();
        identityComponentSchemas.org_user_relation = orgUserSchema();

        orgResourceComponentSchemas.flow = flowSchema();
        orgResourceComponentSchemas.worker = workerSchema();
        orgResourceComponentSchemas.document_repository = documentRepositorySchema();
        orgResourceComponentSchemas.skill = skillSchema();

        flowResourceComponentSchemas.channel = channelSchema();
        flowResourceComponentSchemas.documentation = documentationSchema();
        flowResourceComponentSchemas.resource = resourceSchema();
        flowResourceComponentSchemas.task = taskSchema();
        flowResourceComponentSchemas.tool = toolSchema();
        flowResourceComponentSchemas.tracker = trackerSchema();

        identityApiSchema.components.schemas = { 
            ...identityComponentSchemas
        }

        orgResourceApiSchema.components.schemas = {
            ...orgResourceComponentSchemas,
            ...flowResourceComponentSchemas,
            ...credentialSchemas,
            ...variableSchemas,
            ...baseComponentSchemas
        }

        flowResourceApiSchema.components.schemas = {
            ...flowResourceComponentSchemas,
            ...credentialSchemas,
            ...variableSchemas,
            ...baseComponentSchemas,
        }

        const flowJsonSchema = flowSchema("json-schema") as Record<string, any>;
        flowJsonSchema["title"] = "Flow";
        flowJsonSchema["$defs"] = {
            channel: channelSchema("json-schema"),
            documentation: documentationSchema("json-schema"),
            resource: resourceSchema("json-schema"),
            task: taskSchema("json-schema"),
            tool: toolSchema("json-schema"),
            tracker: trackerSchema("json-schema"),
            ...variableJsonSchemas,
            ...baseComponentJsonSchemas,
            // ...credentialJsonSchemas,
        }


        // write the schema to a file
        fs.writeFileSync("identity-api-schema.json", JSON.stringify(identityApiSchema, null, 2));
        fs.writeFileSync("org-resource-api-schema.json", JSON.stringify(orgResourceApiSchema, null, 2));
        fs.writeFileSync("flow-resource-api-schema.json", JSON.stringify(flowResourceApiSchema, null, 2));
        fs.writeFileSync("flow-json-schema.json", JSON.stringify(flowJsonSchema, null, 2));
    });
});

function userSchema() {
    return {
        type: "object",
        properties: {
            id: { type: "string", format: "uuid", description: "The unique identifier for the user", readOnly: true },
            idpId: { type: "string", format: "uuid", description: "The unique identifier for the identity provider the user belongs to" },
            email: { type: "string", format: "email" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            username: { type: "string" },
            password: { type: "string", format: "password", description: "The password for the user. Required on create for certain identity providers. Can be part of an update." },

        },
        required: ["email", "firstName", "lastName", "username"],
    }
}

function orgSchema() {
    return {
        type: "object",
        properties: {
            id: { type: "string", format: "uuid", description: "The unique identifier for the organization", readOnly: true },
            name: { type: "string" },
            status: { type: "string", enum: ["active", "inactive"] },
            description: { type: "string" },
            company: { type: "string" },
        },
        required: ["name", "status", "description"],
    }
}

function orgUserSchema() {
    return {
        type: "object",
        description: "A relation between an organization and a user",
        properties: {
            id: { type: "string", format: "uuid", description: "The unique identifier for the org-user relation", readOnly: true },
            orgId: { type: "string", format: "uuid", description: "The unique identifier for the organization the user belongs to" },
            userId: { type: "string", format: "uuid", description: "The unique identifier for the user" },
            role: { type: "string", enum: ["admin", "maintainer", "developer", "reporter"] },
        },
        required: ["orgId", "userId", "role"],
    }
}

function flowSchema(type: "json-schema" | "openapi" = "openapi") {
    return type === "openapi" ? {
        allOf: [
            { $ref: `${specRef(type)}/object` },
            {
                type: "object",
                properties: {
                    status: { type: "string", enum: ["active", "inactive"] },
                    channels: { type: "array", items: { $ref: `${specRef(type)}/channel` } },
                    documentation: { type: "array", items: { $ref: `${specRef(type)}/documentation` } },
                    resources: { type: "array", items: { $ref: `${specRef(type)}/resource` } },
                    tasks: { type: "array", items: { $ref: `${specRef(type)}/task` } },
                    tools: { type: "array", items: { $ref: `${specRef(type)}/tool` } },
                    trackers: { type: "array", items: { $ref: `${specRef(type)}/tracker` } },
                },
                required: ["status"],
            },
        ],
    }: {
        title: "Flow",
        type: "object",
        properties: {
            id: { type: "string", format: "uuid", description: "The unique identifier for the object", readOnly: true },
            orgId: { type: "string", format: "uuid", description: "The unique identifier for the organization the object belongs to.", readOnly: true },
            name: { type: "string" },
            description: { type: "string" },
            status: { type: "string", enum: ["active", "inactive"] },
            channels: { type: "array", items: { $ref: `${specRef(type)}/channel` } },
            documentation: { type: "array", items: { $ref: `${specRef(type)}/documentation` } },
            resources: { type: "array", items: { $ref: `${specRef(type)}/resource` } },
            tasks: { type: "array", items: { $ref: `${specRef(type)}/task` } },
            tools: { type: "array", items: { $ref: `${specRef(type)}/tool` } },
            trackers: { type: "array", items: { $ref: `${specRef(type)}/tracker` } },
        },
        required: ["name", "description", "status"],
    }
}

function skillSchema() {
    return {
        type: "object",
        properties: {
            orgId: { type: "string", format: "uuid", description: "The unique identifier for the organization the object belongs to" },
            name: { type: "string" },
            description: { type: "string" },
        },
        required: ["name", "description", "orgId"],

    }
}

function channelSchema(type: "json-schema" | "openapi" = "openapi") {
    const subtypes = ConfigFactory.getSubtypesForType("channel").filter((subtype) => !subtype.startsWith("mock"));
    const schema = {
        allOf: [
            { $ref: `${specRef(type)}/object` },
            {
                type: "object",
                properties: {
                    type: { type: "string", enum: subtypes },
                    variables: variablesRef(subtypes, type),
                },
                required: ["type", "variables"],
            },
        ],
    } as Record<string, any>;

    if (type === "json-schema") {
        schema.title = "Channel";
    }
    return schema;
}

function documentRepositorySchema(type: "json-schema" | "openapi" = "openapi") {
    const subtypes = ConfigFactory.getSubtypesForType("document_repository").filter((subtype) => !subtype.startsWith("mock"));
    const schema = {
        allOf: [
            { $ref: `${specRef(type)}/object` },
            {
                type: "object",
                properties: {
                    type: { type: "string", enum: subtypes },
                    documentChunkStrategy: { type: "string", enum: documentChunkStrategyTypes, description: "The strategy to use for chunking documents." },
                    variables: variablesRef(subtypes, type),
                },
                required: ["type", "variables"],
            },
        ],
    } as Record<string, any>;

    if (type === "json-schema") {
        schema.title = "DocumentRepository";
    }
    return schema;
}

function documentationSchema(type: "json-schema" | "openapi" = "openapi") {
    const subtypes = ConfigFactory.getSubtypesForType("documentation").filter((subtype) => !subtype.startsWith("mock"));
    const schema = {
        allOf: [
            { $ref: `${specRef(type)}/object` },
            {
                type: "object",
                properties: {
                    type: { type: "string", enum: subtypes },
                    repository: { type: "string", description: "The name of the document repository to use." },
                    documents: { type: "array", items: { type: "string" }, description: "The list of documents from the repository to use. Null or Empty means all" },
                    variables: variablesRef(subtypes, type),
                },
                required: ["type", "repository", "variables"],
            },
        ],
    } as Record<string, any>;

    if (type === "json-schema") {
        schema.title = "Documentation";
    }
    return schema;
}

function resourceSchema(type: "json-schema" | "openapi" = "openapi") {
    const subtypes = ConfigFactory.getSubtypesForType("resource").filter((subtype) => !subtype.startsWith("mock"));
    const schema = {
        allOf: [
            { $ref: `${specRef(type)}/object` },
            {
                type: "object",
                properties: {
                    type: { type: "string", enum: subtypes },
                    example: { type: "string", description: "An example value of an output for the resource." },
                    variables: variablesRef(subtypes, type),
                },
                required: ["type", "variables"],
            },
        ],
    } as Record<string, any>;

    if (type === "json-schema") {
        schema.title = "Resource";
    }
    return schema;
}

function taskSchema(type: "json-schema" | "openapi" = "openapi") {
    const subtypes = ConfigFactory.getSubtypesForType("task").filter((subtype) => !subtype.startsWith("mock"));
    const schema = {
        allOf: [
            { $ref: `${specRef(type)}/object` },
            {
                type: "object",
                properties: {
                    type: { type: "string", enum: subtypes },
                    requiredSkills: { type: "array", items: { type: "string" }, description: "The list of skills needed for this task." },
                    defaultChannel: { type: "string", description: "The default channel to use for communication." },
                    tracker: { type: "string", description: "The Name of the tracker to use for execution." },
                    documentation: { type: "array", items: { type: "string" }, description: "The list of documentation names to use." },
                    tools: { type: "array", items: { $ref: `${specRef(type)}/tool_reference` }, description: "The list of tools needed for this task." },
                    triggers: { type: "array", items: { type: "string" }, description: "The list of channels or resources to trigger the task." },
                    inputs: {
                        type: "object", description: "The map of inputs for this task. Keys can be used in task templates using handlebars syntax. I.E., and input of message may map to a channel name, and then in the task template, you can use {{message}}", additionalProperties: {
                            oneOf: [{
                                type: "string",
                            },
                            {
                                type: "array",
                                items: { type: "string" },
                            }]
                        }
                    },
                    outputs: { type: "array", items: { type: "string" }, description: "The list of outputs for this task." },
                    subtasks: { type: "array", items: { $ref: `${specRef(type)}/subtask` }, description: "The list of subtasks for this task." },
                    costLimit: { type: "number", description: "The cost limit for each execution of this task." },
                    variables: variablesRef(subtypes, type),
                },
                required: ["type", "requiredSkills", "defaultChannel", "tracker", "documentation", "tools", "triggers", "inputs", "outputs", "subtasks", "costLimit", "variables"],
            },
        ]
    } as Record<string, any>;

    if (type === "json-schema") {
        schema.title = "Task";
    }

    return schema;
}

function toolSchema(type: "json-schema" | "openapi" = "openapi") {
    const subtypes = ConfigFactory.getSubtypesForType("tool").filter((subtype) => !subtype.startsWith("mock"));
    const schema = {
        allOf: [
            { $ref: `${specRef(type)}/object` },
            {
                type: "object",
                properties: {
                    type: { type: "string", enum: subtypes },
                    channel: { type: "string", description: "The channel for the tool to use for dynamic user interaction" },
                    variables: variablesRef(subtypes, type),
                },
                required: ["type", "channel", "variables"],
            },
        ],
    } as Record<string, any>;

    if (type === "json-schema") {
        schema.title = "Tool";
    }

    return schema;
}

function trackerSchema(type: "json-schema" | "openapi" = "openapi") {
    const subtypes = ConfigFactory.getSubtypesForType("tracker").filter((subtype) => !subtype.startsWith("mock"));
    const schema = {
        allOf: [
            { $ref: `${specRef(type)}/object` },
            {
                type: "object",
                properties: {
                    type: { type: "string", enum: subtypes },
                    webhooksEnabled: { type: "boolean", description: "Whether or not webhooks are enabled for this tracker." },
                    pollingInterval: { type: "number", description: "The interval in seconds to poll for updates if webhooks are not enabled" },
                    variables: variablesRef(subtypes, type),
                },
                required: ["type", "webhooksEnabled", "pollingInterval", "variables"],
            },
        ],
    } as Record<string, any>;

    if (type === "json-schema") {
        schema.title = "Tracker";
    }

    return schema;
}

function workerSchema(type: "json-schema" | "openapi" = "openapi") {
    const subtypes = ConfigFactory.getSubtypesForType("worker").filter((subtype) => !subtype.startsWith("mock"));
    const channelUserConfig = {} as Record<string, any>;
    for (const channelType of channelTypes.filter((channelType) => !channelType.startsWith("mock"))) {
        channelUserConfig[channelType] = { type: "string" };
    }
    const schema = {
        allOf: [
            { $ref: `${specRef(type)}/object` },
            {
                type: "object",
                properties: {
                    channelUserConfig: {
                        type: "object",
                        description: "A map of channel types to channel user credential names",
                        properties: {
                            ...channelUserConfig,
                        },
                    },
                    skills: { type: "array", items: { type: "string" }, description: "The list of skills the worker has." },
                    wipLimit: { type: "number", description: "The number of tasks a worker can have in progress at a time." },
                    variables: variablesRef(subtypes),
                },
                required: ["channelUserConfig", "skills", "wipLimit", "variables"],
            },
        ],
    } as Record<string, any>;

    if (type === "json-schema") {
        schema.title = "Worker";
    }

    return schema;
}

function credentialSchema(subtypes: string[], root?: boolean, type: "json-schema" | "openapi" = "openapi", title?: string) {
    const schema = {
        allOf: [
            { $ref: `${specRef(type)}/credential_object` },
            {
                type: "object",
                properties: {
                    type: { type: "string", enum: root ? objectTypes : subtypes },
                    variables: credentialsRef(subtypes, type),
                },
                required: ["type", "variables"],
            },
        ],
    } as Record<string, any>;

    if (type === "json-schema") {
        schema.title = title || "Credential";
    }

    return schema;

}

function credentialsRef(subtypes: string[], type: "json-schema" | "openapi" = "openapi") {
    return {
        oneOf: subtypes.map((subtype) => {
            return { $ref: `${specRef(type)}/${snakeify(subtype)}_credential` }
        }),
    }
}

function variablesRef(subtypes: string[], type: "json-schema" | "openapi" = "openapi") {
    return {
        oneOf: subtypes.map((subtype) => {
            return { $ref: `${specRef(type)}/${snakeify(subtype)}_variables` }
        }),
    }
}

function specRef(type: "json-schema" | "openapi"): string {
    return type === "json-schema" ? "#/$defs" : "#/components/schemas";
}


const createRestEndpoint = (resource: string, objectType: string, operations?: string[]): Record<string, any> => {
    const paths = {} as Record<string, any>;

    if (!operations) {
        operations = ["list", "create", "read", "delete"];
    }

    const isFlowObject = flowObjectTypes.includes(objectType);
    const isOrgObject = objectType !== "user" && objectType !== "org";
    const baseParams = isFlowObject ? [
        {
            name: "orgId",
            in: "path",
            required: true,
            schema: {
                type: "string",
                format: "uuid",
            },
        },
        {
            name: "flowId",
            in: "path",
            required: true,
            schema: {
                type: "string",
                format: "uuid",
            },
        }
    ] : isOrgObject ? [
        {
            name: "orgId",
            in: "path",
            required: true,
            schema: {
                type: "string",
                format: "uuid",
            },
        },
    ] : [];

    const baseTags: string[] = [];
    const basePath = isFlowObject ? `/orgs/{orgId}/flows/{flowId}` : isOrgObject ? `/orgs/{orgId}` : "";


    const a = objectType !== "user" && ["a", "e", "i", "o", "u"].includes(objectType[0].toLowerCase()) ? "an" : "a";

    if (operations.includes("create")) {
        if (!paths[`${basePath}/${resource}`]) {
            paths[`${basePath}/${resource}`] = {};
        }
        paths[`${basePath}/${resource}`]["post"] = {
                summary: `${objectType !== "org_user_relation" ? "Upsert" : "Create"} ${a} ${objectType} ${(isFlowObject || isOrgObject && objectType !== "org_user_relation") ? `(names are unique per ${isFlowObject ? "flow" : "org"})` : ""}`,
                tags: [...baseTags, resource],
                parameters: [
                    ...baseParams,
                ],
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                $ref: `#/components/schemas/${objectType}`,
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: `The created ${objectType}`,
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: `#/components/schemas/${objectType}`,
                                },
                            },
                        },
                    },
                },
        };
    }

    if (operations.includes("list")) {
        if (!paths[`${basePath}/${resource}`]) {
            paths[`${basePath}/${resource}`] = {};
        }
        paths[`${basePath}/${resource}`]["get"] = {
            summary: `Get all ${objectType !== "documentation" ? objectType + "s" : objectType}`,
            tags: [...baseTags, resource],
            parameters: [
                ...baseParams,
            ],
            responses: {
                200: {
                    description: `A list of ${objectType !== "documentation" ? objectType + "s" : objectType}`,
                    content: {
                        "application/json": {
                            schema: {
                                type: "array",
                                items: {
                                    $ref: `#/components/schemas/${objectType}`,
                                },
                            },
                        },
                    },
                },
            },
        } as any;
    }

   
    if (operations.includes("read")) {
        if (!paths[`${basePath}/${resource}/{id}`]) {
            paths[`${basePath}/${resource}/{id}`] = {};
        }
        paths[`${basePath}/${resource}/{id}`]["get"] = {
            summary: `Get ${a} ${objectType} by ID`,
            tags: [...baseTags, resource],
            parameters: [
                ...baseParams,
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: {
                        type: "string",
                        format: "uuid",
                    },
                },
            ],
            responses: {
                200: {
                    description: `The ${objectType}`,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: `#/components/schemas/${objectType}`,
                            },
                        },
                    },
                },
            },
        };
    }
    if (operations.includes("update")) {
        if (!paths[`${basePath}/${resource}/{id}`]) {
            paths[`${basePath}/${resource}/{id}`] = {};
        }
        paths[`${basePath}/${resource}/{id}`]["put"] = {
            summary: `Update ${a} ${objectType} by ID`,
            tags: [...baseTags, resource],
            parameters: [
                ...baseParams,
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: {
                        type: "string",
                        format: "uuid",
                    },
                },
            ],
            requestBody: {
                content: {
                    "application/json": {
                        schema: {
                            $ref: `#/components/schemas/${objectType}`,
                        },
                    },
                },
            },
            responses: {
                200: {
                    description: `The updated ${objectType}`,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: `#/components/schemas/${objectType}`,
                            },
                        },
                    },
                },
            },
        }
    }

    if (operations.includes("delete")) {
        if (!paths[`${basePath}/${resource}/{id}`]) {
            paths[`${basePath}/${resource}/{id}`] = {};
        }
        paths[`${basePath}/${resource}/{id}`]["delete"] = {
            summary: `Delete ${a} ${objectType} by ID`,
            tags: [...baseTags, resource],
            parameters: [
                ...baseParams,
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: {
                        type: "string",
                        format: "uuid",
                    },
                },
            ],
            responses: {
                200: {
                    description: `The deleted ${objectType}`,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: `#/components/schemas/${objectType}`,
                            },
                        },
                    },
                },
            },
        };

    }
    return paths;
}
