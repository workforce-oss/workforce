import { expect } from 'chai';
import { convertJsonSchemaToVariablesSchema } from '../../../src/objects/base/variables_schema_tools';
import _ from 'lodash';
import { describe } from 'mocha';

describe("Variables Schema Tools", () => {
    it("should create a variables schema from an OpenAPI schema", () => {
        const openApiSchema = {
            "openapi": "3.0.0",
            "info": {
                "title": "Test API",
                "version": "1.0.0"
            },
            "paths": {
                "/initSession": {
                    "post": {
                        "summary": "Initialize a session",
                        "requestBody": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "taskExecutionId": {
                                                "type": "string"
                                            },
                                            "orgId": {
                                                "type": "string"
                                            },
                                            "variables": {
                                                "$ref": "#/components/schemas/InitSessionConfig"
                                            }
                                        },
                                    }
                                }
                            }
                        }
                    }
                },
            },
            "components": {
                "schemas": {
                    "InitSessionConfig": {
                        "type": "object",
                        "properties": {
                            "taskExecutionId": {
                                "type": "string"
                            },
                            "workerId": {
                                "type": "string"
                            },
                            "channelId": {
                                "type": "string"
                            }
                        },
                        "required": ["taskExecutionId", "workerId", "channelId"]
                    }
                }
            }
        };

        const variablesSchema = convertJsonSchemaToVariablesSchema(openApiSchema["paths"]["/initSession"]["post"]["requestBody"]["content"]["application/json"]["schema"]["properties"]["variables"], openApiSchema);
        expect(variablesSchema.size).to.equal(3);
        expect(variablesSchema.get("taskExecutionId")).to.deep.equal({
            type: "string",
            description: undefined,
            required: true,
            advanced: undefined,
            default: undefined,
            multiline: undefined,
            sensitive: undefined,
            options: undefined,
            requiredFor: undefined,
            optionalFor: undefined,
            min: undefined,
            max: undefined,
            hidden: undefined,
        });
        expect(variablesSchema.get("workerId")).to.deep.equal({
            type: "string",
            description: undefined,
            required: true,
            advanced: undefined,
            default: undefined,
            multiline: undefined,
            sensitive: undefined,
            options: undefined,
            requiredFor: undefined,
            optionalFor: undefined,
            min: undefined,
            max: undefined,
            hidden: undefined,
        });
        expect(variablesSchema.get("channelId")).to.deep.equal({
            type: "string",
            description: undefined,
            required: true,
            advanced: undefined,
            default: undefined,
            multiline: undefined,
            sensitive: undefined,
            options: undefined,
            requiredFor: undefined,
            optionalFor: undefined,
            min: undefined,
            max: undefined,
            hidden: undefined,
        });

    });
});

