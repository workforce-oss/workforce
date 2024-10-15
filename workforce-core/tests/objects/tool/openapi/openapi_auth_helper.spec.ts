import { expect } from "chai";
import { OpenAPIAuthHelper } from "../../../../src/objects/tool/impl/openapi/openapi_auth_helper.js";
import { ToolType } from "../../../../src/objects/tool/model.js";
import { ObjectType } from "../../../../src/model.js";

describe("OpenAPI Auth Helper", () => {
    it("should select the correct auth type for basic auth", () => {
        const openapi = {
            components: {
                securitySchemes: {
                    scheme1: {
                        type: "http",
                        scheme: "basic",
                    },
                },
            },
            security: [
                {
                    scheme1: [],
                },
            ]

        };
        const config = {
            id: "test",
            orgId: "test",
            name: "test",
            description: "test",
            type: "tool" as ObjectType,
            subtype: "openapi-tool" as ToolType,
            variables: {
                username: "test",
                password: "test",
            },
        };
        const authType = OpenAPIAuthHelper.selectAuthType(openapi, config.variables);
        expect(authType).to.deep.equal({
            authType: "basic",
            authData: {}
        });
    });
    it("should select the correct auth type for bearer token auth", () => {
        const openapi = {
            components: {
                securitySchemes: {
                    scheme2: {
                        type: "http",
                        scheme: "bearer",
                    },
                },
            },
            security: [
                {
                    scheme2: [],
                },
            ]
        };
        const config = {
            id: "test",
            orgId: "test",
            name: "test",
            description: "test",
            type: "tool" as ObjectType,
            subtype: "openapi-tool" as ToolType,
            variables: {
                bearer_token: "test",
            },
        };
        const authType = OpenAPIAuthHelper.selectAuthType(openapi, config.variables);
        expect(authType).to.deep.equal({
            authType: "bearer_token",
            authData: {}
        });
    });
    it("should select the correct auth type for api key auth", () => {
        const openapi = {
            components: {
                securitySchemes: {
                    scheme3: {
                        type: "apiKey",
                        in: "header",
                        name: "test",
                    },
                },
            },
            security: [
                {
                    scheme3: [],
                },
            ]
        };
        const config = {
            id: "test",
            orgId: "test",
            name: "test",
            description: "test",
            type: "tool" as ObjectType,
            subtype: "openapi-tool" as ToolType,
            variables: {
                api_key: "test",
                api_key_header: "test_header"
            },
        };
        const authType = OpenAPIAuthHelper.selectAuthType(openapi, config.variables);
        expect(authType).to.deep.equal({
            "authType": "api_key",
            authData: {
                in: "header",
                name: "test",
            }
        });
    });
    it("should select the correct auth type for mTLS auth", () => {
        const openapi = {
            components: {
                securitySchemes: {
                    scheme4: {
                        type: "mutualTLS",
                    },
                },
            },
            security: [
                {
                    scheme4: [],
                },
            ]
        };
        const config = {
            id: "test",
            orgId: "test",
            name: "test",
            description: "test",
            type: "tool" as ObjectType,
            subtype: "openapi-tool" as ToolType,
            variables: {
                mtls_cert: "test",
                mtls_key: "test",
                mtls_ca: "test",
            },
        };
        const authType = OpenAPIAuthHelper.selectAuthType(openapi, config.variables);
        expect(authType).to.deep.equal({
            authType: "mtls",
            authData: {},
        });
    });
    it("should select the correct auth type for oidc auth", () => {
        const openapi = {
            components: {
                securitySchemes: {
                    scheme5: {
                        type: "openIdConnect",
                        openIdConnectUrl: "http://example.com"
                    },
                },
            },
            security: [
                {
                    scheme5: [],
                },
            ]
        };
        const config = {
            id: "test",
            orgId: "test",
            name: "test",
            description: "test",
            type: "tool" as ObjectType,
            subtype: "openapi-tool" as ToolType,
            variables: {
                client_id: "test",
                client_secret: "test",
            },
        };
        const authType = OpenAPIAuthHelper.selectAuthType(openapi, config.variables);
        expect(authType).to.deep.equal({
            authType: "oidc",
            authData: {
                "openIdConnectUrl": "http://example.com"
            }
        });
    });
    it("should select the correct auth type for oauth2_implicit auth", () => {
        const openapi = {
            components: {
                securitySchemes: {
                    scheme5: {
                        type: "oauth2",
                        flows: {
                            implicit: {
                                authorizationUrl: "test",
                            },
                        },
                    },
                },
            },
            security: [
                {
                    scheme5: [],
                },
            ]
        };
        const config = {
            id: "test",
            orgId: "test",
            name: "test",
            description: "test",
            type: "tool" as ObjectType,
            subtype: "openapi-tool" as ToolType,
            variables: {
                client_id: "test",
                client_secret: "test",
            },
        };
        const authType = OpenAPIAuthHelper.selectAuthType(openapi, config.variables);
        expect(authType).to.deep.equal({
            authType: "oauth2_implicit",
            authData: {}
        });
    });
    it("should select the correct auth type for oauth2_auth_code auth", () => {
        const openapi = {
            components: {
                securitySchemes: {
                    scheme5: {
                        type: "oauth2",
                        flows: {
                            authorizationCode: {
                                authorizationUrl: "test",
                                tokenUrl: "test",
                            },
                        },
                    },
                },
            },
            security: [
                {
                    scheme5: [],
                },
            ]
        };
        const config = {
            id: "test",
            orgId: "test",
            name: "test",
            description: "test",
            type: "tool" as ObjectType,
            subtype: "openapi-tool" as ToolType,
            variables: {
                client_id: "test",
                client_secret: "test",
            },
        };
        const authType = OpenAPIAuthHelper.selectAuthType(openapi, config.variables);
        expect(authType).to.deep.equal({
            authType: "oauth2_authorization_code",
            authData: {
                authorizationUrl: "test",
                tokenUrl: "test"
            }
        });
    });
    it("should select the correct auth type for oauth2_password auth", () => {
        const openapi = {
            components: {
                securitySchemes: {
                    scheme5: {
                        type: "oauth2",
                        flows: {
                            password: {
                                tokenUrl: "test",
                            },
                        },
                    },
                },
            },
            security: [
                {
                    scheme5: [],
                },
            ]
        };
        const config = {
            id: "test",
            orgId: "test",
            name: "test",
            description: "test",
            type: "tool" as ObjectType,
            subtype: "openapi-tool" as ToolType,
            variables: {
                client_id: "test",
                client_secret: "test",
                username: "test",
                password: "test",
            },
        };
        const authType = OpenAPIAuthHelper.selectAuthType(openapi, config.variables);
        expect(authType).to.deep.equal({
            authType: "oauth2_password",
            authData: {}
        });
    });
    it("should select the correct auth type for oauth2_client_credentials auth", () => {
        const openapi = {
            components: {
                securitySchemes: {
                    scheme5: {
                        type: "oauth2",
                        flows: {
                            clientCredentials: {
                                tokenUrl: "test",
                            },
                        },
                    },
                },
            },
            security: [
                {
                    scheme5: [],
                },
            ]
        };
        const config = {
            id: "test",
            orgId: "test",
            name: "test",
            description: "test",
            type: "tool" as ObjectType,
            subtype: "openapi-tool" as ToolType,
            variables: {
                client_id: "test",
                client_secret: "test",
            },
        };
        const authType = OpenAPIAuthHelper.selectAuthType(openapi, config.variables);
        expect(authType).to.deep.equal({
            authType: "oauth2_client_credentials",
            authData: {
                tokenUrl: "test"
            }
        });
    });
    it("should default to anonymous auth if no variables are provided", () => {
        const openapi = {
            components: {
                securitySchemes: {
                    scheme5: {
                        type: "http",
                        scheme: "basic",
                    },
                },
            },
            security: [
                {
                    scheme5: [],
                },
            ]
        };
        const config = {
            id: "test",
            orgId: "test",
            name: "test",
            description: "test",
            type: "tool" as ObjectType,
            subtype: "openapi-tool" as ToolType,
            variables: {},
        };
        const authType = OpenAPIAuthHelper.selectAuthType(openapi, config.variables);
        expect(authType).to.deep.equal({
            authType: "anonymous",
            authData: {}
        });
    });

});