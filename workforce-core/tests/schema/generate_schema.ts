import { convertVariablesSchemaToJsonSchema } from "../../src/objects/base/variables_schema_tools.js";
import { snakeify } from "../../src/util/snake.js";
import { objectSubtypes, objectTypes } from "../../src/objects/base/factory/types.js";
import { ConfigFactory } from "../../src/objects/base/factory/config_factory.js";
import { VariablesSchemaFactory } from "../../src/objects/base/factory/variable_schema_factory.js";
import fs from "fs";
import { BaseConfig } from "../../src/objects/base/model.js";
import { documentChunkStrategyTypes } from "../../src/objects/document_repository/model.js";
import { channelTypes } from "../../src/objects/channel/model.js";
import { OrgDb } from "../../src/index.js";

describe("Generate API Schema", () => {
    it("should generate the schema", async () => {
        const schema = {
            openapi: "3.0.3",
            info: {
                title: "Workforce API",
                version: "1.0.0",
            },
            paths: {} as Record<string, any>,
            components: {
                schemas: {} as Record<string, any>,
            },
        }

        const createRestEndpoint = (resource: string, objectType: string) => {
            schema.paths[`/${resource}`] = {
                get: {
                    summary: `Get all ${objectType}s`,
                    responses: {
                        200: {
                            description: `A list of ${objectType}s`,
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
                },
                post: {
                    summary: `Create a new ${objectType}`,
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
                },
            };

            schema.paths[`/${resource}/{id}`] = {
                get: {
                    summary: `Get a ${objectType} by ID`,
                    parameters: [
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
                },
                put: {
                    summary: `Update a ${objectType} by ID`,
                    parameters: [
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
                },
                delete: {
                    summary: `Delete a ${objectType} by ID`,
                    parameters: [
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
                },
            };

        }


        const BaseConfigSchema = {
            type: "object",
            properties: {
                id: { type: "string", format: "uuid", description: "The unique identifier for the object" },
                orgId: { type: "string", format: "uuid", description: "The unique identifier for the organization the object belongs to. Required for flows, workers, document-repositories, and skills." },
                name: { type: "string" },
                description: { type: "string" },
            },
            required: ["name", "description"],
        }

        schema.components.schemas.object = BaseConfigSchema;

        const componentVariableSchemas = {} as Record<string, any>;
        const componentCredentialSchemas = {} as Record<string, any>;
        const componentTypeSchemas = {} as Record<string, any>;

        schema.components.schemas.tool_reference = {
            type: "object",
            properties: {
                name: { type: "string" },
                id: { type: "string", format: "uuid" },
                output: { type: "string" },
            },
            required: ["name"],
        }

        schema.components.schemas.subtask = {
            type: "object",
            properties: {
                name: { type: "string" },
                id: { type: "string", format: "uuid" },
                async: { type: "boolean" },
            },
            required: ["name"],
        }

        for (const objectType of objectTypes) {

            const subtypes = objectType === "credential" ? objectSubtypes.filter((subtype) => subtype !== "mock") :
                ConfigFactory.getSubtypesForType(objectType).filter((subtype) => subtype !== "mock");

            subtypes.sort();

            const propertySchema = {
                type: "object",
                properties: {
                    type: {
                        type: "string",
                        description: `The type of the ${objectType}`,
                        enum: subtypes,
                    },
                } as Record<string, any>,
                required: ["type"],
            }


            // Create all variables schemas, and credential schemas, but ignore this step for credentials as they inherit sensitive variables
            const variablesSchemas = {} as Record<string, any>;
            if (objectType !== "credential") {
                for (const subtype of subtypes) {
                    // These are the non-sensitive variables
                    const variablesSchema = VariablesSchemaFactory.for({
                        type: objectType,
                        subtype,
                    } as BaseConfig);

                    const jsonSchema = convertVariablesSchemaToJsonSchema(variablesSchema);
                    variablesSchemas[subtype] = jsonSchema;

                    // schema.components.schemas[`${snakeify(subtype)}_variables`] = jsonSchema;
                    componentVariableSchemas[`${snakeify(subtype)}_variables`] = jsonSchema;

                    // These are the sensitive variables
                    const credentialSchema = VariablesSchemaFactory.for({
                        type: "credential",
                        subtype,
                    } as BaseConfig);
                    const credentialJsonSchema = convertVariablesSchemaToJsonSchema(credentialSchema);
                    credentialJsonSchema.description = `The sensitive variables for the ${subtype} ${objectType}`;
                    // We will need to add these as oneOf to Credential Schema much later
                    componentCredentialSchemas[`${snakeify(subtype)}_credential`] = credentialJsonSchema;
                    // schema.components.schemas[snakeify(subtype) + "_credential"] = convertVariablesSchemaToJsonSchema(credentialSchema);
                }
            }

            // add credential property to all objects except for task and documentation
            if (objectType !== "task" && objectType !== "documentation") {
                propertySchema.properties = {
                    ...propertySchema.properties,
                    credential: { type: "string", },
                }
                propertySchema.required = ["type", "credential"];
            }

            if (objectType === "document_repository") {
                propertySchema.properties = {
                    ...propertySchema.properties,
                    documentChunkStrategy: { type: "string", enum: documentChunkStrategyTypes, description: "The strategy to use for chunking documents." },
                }

                propertySchema.required.push("orgId");
            }

            if (objectType === "documentation") {
                propertySchema.properties = {
                    ...propertySchema.properties,
                    repository: { type: "string", description: "The name of the document repository to use." },
                    documents: { type: "array", items: { type: "string" }, description: "The list of documents from the repository to use. Null or Empty means all" },
                }
                propertySchema.required.push("repository");
            }

            if (objectType === "resource") {
                propertySchema.properties = {
                    ...propertySchema.properties,
                    example: { type: "string", description: "An example value of an output for the resource." },
                }
            }


            if (objectType === "task") {
                propertySchema.properties = {
                    ...propertySchema.properties,
                    requiredSkills: { type: "array", items: { type: "string" }, description: "The list of skills needed for this task." },
                    defaultChannel: { type: "string", description: "The default channel to use for communication." },
                    tracker: { type: "string", description: "The Name of the tracker to use for execution." },
                    documentation: { type: "array", items: { type: "string" }, description: "The list of documentation names to use." },
                    tools: { type: "array", items: { $ref: "#/components/schemas/tool_reference" }, description: "The list of tools needed for this task." },
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
                    subtasks: { type: "array", items: { $ref: "#/components/schemas/subtask" }, description: "The list of subtasks for this task." },
                    costLimit: { type: "number", description: "The cost limit for each execution of this task." },
                }
            }

            if (objectType === "tool") {
                propertySchema.properties = {
                    ...propertySchema.properties,
                    channel: { type: "string", description: "The channel for the tool to use for dynamic user interaction" },
                }
            }

            if (objectType === "tracker") {
                propertySchema.properties = {
                    ...propertySchema.properties,
                    webhooksEnabled: { type: "boolean", description: "Whether or not webhooks are enabled for this tracker." },
                    pollingInterval: { type: "number", description: "The interval in seconds to poll for updates if webhooks are not enabled" },
                }
            }

            const channelUserConfig = {} as Record<string, any>;
            for (const channelType of channelTypes.filter((channelType) => channelType !== "mock")) {
                channelUserConfig[channelType] = { type: "string" };
            }

            if (objectType === "worker") {
                propertySchema.properties = {
                    ...propertySchema.properties,
                    channelUserConfig: {
                        type: "object",
                        description: "A map of channel types to channel user credential names",
                        properties: channelUserConfig,
                    },
                    skills: { type: "array", items: { type: "string" }, description: "The list of skills the worker has." },
                    wipLimit: { type: "number", description: "The number of tasks a worker can have in progress at a time." },
                }
            }

            propertySchema.required.push("variables");
            propertySchema.properties = {
                ...propertySchema.properties,
                variables: {
                    oneOf: subtypes.map((subtype) => {
                        return { $ref: `#/components/schemas/${snakeify(subtype)}${objectType === "credential" ? "_credential" : "_variables"}` }
                    }),
                },
            }

            componentTypeSchemas[objectType] = propertySchema;
        }

        const flowSchema = {
            flow: {
                allOf: [
                    { $ref: "#/components/schemas/object" },
                    {
                        type: "object",
                        properties: {
                            status: { type: "string", enum: ["active", "inactive"] },
                            channels: { type: "array", items: { $ref: "#/components/schemas/channel" } },
                            documentation: { type: "array", items: { $ref: "#/components/schemas/documentation" } },
                            resources: { type: "array", items: { $ref: "#/components/schemas/resource" } },
                            tasks: { type: "array", items: { $ref: "#/components/schemas/task" } },
                            tools: { type: "array", items: { $ref: "#/components/schemas/tool" } },
                            trackers: { type: "array", items: { $ref: "#/components/schemas/tracker" } },
                        },
                        required: ["status"],
                    },
                ],
            }
        }

        const skillSchema = {
            skill: {
                type: "object",
                properties: {
                    orgId: { type: "string", format: "uuid", description: "The unique identifier for the organization the object belongs to" },
                    name: { type: "string" },
                    description: { type: "string" },
                },
                required: ["name", "description", "orgId"],
            }
        }

        createRestEndpoint("flows", "flow");
        createRestEndpoint("workers", "worker");
        createRestEndpoint("document-repositories", "document_repository");
        createRestEndpoint("skills", "skill");
        createRestEndpoint("credentials", "credential");
        

        schema.components.schemas = {
            ...flowSchema,
            ...skillSchema,
            ...componentTypeSchemas,
            ...schema.components.schemas,
            ...componentVariableSchemas,
            ...componentCredentialSchemas,
        }

        // write the schema to a file
        console.log(JSON.stringify(schema, null, 2));
        fs.writeFileSync("schema.json", JSON.stringify(schema, null, 2));
    });
});
