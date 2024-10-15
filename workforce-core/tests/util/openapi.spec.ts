import { expect } from "chai";

import { FunctionCall, convertToAPICall, getFunctionName, getFunctions, getMatchingPath, getPathFromFunctionName, getPaths, getVerbFromFunctionName, isRef, pathIsMatch, resolveRef, resolveRefs, templatePath } from "../../src/util/openapi.js";
import _ from "lodash";
describe("OpenAPI Utils", () => {
    it("should resolve a ref", () => {
        const document = {
            components: {
                schemas: {
                    MySchema: {
                        type: "object",
                        properties: {
                            name: {
                                type: "string",
                            },
                        },
                    },
                },
            },
        };
        const ref = "#/components/schemas/MySchema";
        const resolved = resolveRef(ref, document);
        expect(resolved).to.deep.equal({
            type: "object",
            properties: {
                name: {
                    type: "string",
                },
            },
        });
    });
    it("should deeply resolve refs", () => {
        const document = {
            components: {
                schemas: {
                    MySchema: {
                        type: "object",
                        properties: {
                            otherObjects: {
                                type: "array",
                                items: {
                                    $ref: "#/components/schemas/OtherSchema",
                                },
                            },
                        }
                    },
                    OtherSchema: {
                        type: "object",
                        properties: {
                            name: {
                                type: "string",
                            },
                        },
                    },
                },

            },
        };
        const ref = "#/components/schemas/MySchema";
        const cpy = _.cloneDeep(document);
        const resolved = resolveRefs(document, cpy);
        const result = resolveRef(ref, resolved);
        expect(result).to.deep.equal({
            type: "object",
            properties: {
                otherObjects: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: {
                                type: "string",
                            },
                        },
                    },
                },
            }
        });
    });
    it("should detect a ref", () => {
        const ref = "#/components/schemas/MySchema";
        const obj = {
            $ref: ref,
        };
        expect(isRef(obj)).to.be.true;
    });
    it("should not detect a ref", () => {
        const obj = {
            name: "test",
        };
        expect(isRef(obj)).to.be.false;
    });
    it("should get paths", () => {
        const document = {
            paths: {
                "/test": {
                    get: {
                        summary: "test",
                    },
                },
            },
        };
        const paths = getPaths(document);
        expect(paths).to.deep.equal({
            "/test": {
                get: {
                    summary: "test",
                },
            },
        });
    });
    it("should create a function name", () => {
        const path = "/test/{id}";
        const verb = "get";
        const name = "test";
        const functionName = getFunctionName(path, verb);
        expect(functionName).to.equal("get_test_by_id");
    });
    it("should get the matching path object", () => {
        const document = {
            paths: {
                "/test/{id}": {
                    get: {
                        summary: "test",
                    },
                },
            },
        };
        const functionCall: FunctionCall = {
            name: "get_test_by_id",
            arguments: {
                id: "testId",
            },
        };
        const path = getMatchingPath(functionCall, document);
        expect(path).to.deep.equal("/test/{id}");
    });
    it("should detect a path match", () => {
        const openAPIPath = "/test/{id}/test2/{id2}/test3";
        const functionPath = "/test/{id}/test2/{id2}/test3";
        const isMatch = pathIsMatch(openAPIPath, functionPath);
        expect(isMatch).to.be.true;

    });
    it("should not detect a path match", () => {
        const openAPIPath = "/test/{id}/test2/{id2}/test3";
        const functionPath = "/test/{id}/test2/{id2}/test4";
        const isMatch = pathIsMatch(openAPIPath, functionPath);
        expect(isMatch).to.be.false;
    });
    it("should get a path from a function name", () => {
        const functionName = "get_test_test2";
        const openAPIPath = getPathFromFunctionName(functionName);
        expect(openAPIPath).to.equal("/test/test2");
    });
    it("should handle a path with a colon", () => {
        const trueOpenAPIPath = "/test/test2/test3/{test4}:batch";
        const trueFunctionName = getFunctionName(trueOpenAPIPath, "get");
        expect(trueFunctionName).to.equal("get_test_test2_test3_by_test4_with_batch");

        const openAPIPath = getPathFromFunctionName(trueFunctionName);
        expect(openAPIPath).to.equal("/test/test2/test3/{test4}/batch");

        const match = pathIsMatch(trueOpenAPIPath, "/test/test2/test3/{test4}/batch");
        expect(match).to.be.true;
    });
    it("should get a verb from a function name", () => {
        const functionName = "get_test_test2";
        const verb = getVerbFromFunctionName(functionName);
        expect(verb).to.equal("get");
    });
    it("should template a path", () => {
        const path = "/test/{id}/test2/{id2}/test3";
        const functionCall: FunctionCall = {
            name: "get_test_by_id_with_test2_by_id2_with_test3",
            arguments: {
                id: "testId",
                id2: "testId2",
            },
        };
        const templatedPath = templatePath(path, functionCall);
        expect(templatedPath).to.equal("/test/testId/test2/testId2/test3");
    });
    it("should get function documents for an openapi document", () => {
        const document = {
            paths: {
                "/test/{id}": {
                    parameters: [
                        {
                            name: "id",
                            in: "path",
                            required: true,
                            schema: {
                                type: "string",
                            },
                        },
                        { name: "details", in: "query", schema: { type: "boolean" } },
                    ],
                    get: {
                        description: "test_description",
                        requestBody: {
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            name: {
                                                type: "string",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        };
        const functionDocuments = getFunctions(document);
        expect(functionDocuments).to.deep.equal([
            {
                name: "get_test_by_id",
                description: "test_description",
                parameters: {
                    type: "object",
                    required: ["id"],
                    properties: {
                        id: {
                            type: "string",
                        },
                        details: {
                            type: "boolean",
                        },
                        name: {
                            type: "string",
                        },
                    },
                }
            },
        ]);
    });
    it("should create an appropriate api call for a function call", () => {
        const document = {
            paths: {
                "/test/{id}": {

                    get: {
                        parameters: [
                            {
                                name: "id",
                                in: "path",
                                required: true,
                                schema: {
                                    type: "string",
                                },
                            },
                            { name: "details", in: "query", schema: { type: "boolean" } },
                        ],
                        description: "test_description",
                        requestBody: {
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            name: {
                                                type: "string",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        };
        const functionCall: FunctionCall = {
            name: "get_test_by_id",
            arguments: {
                id: "testId",
                details: true,
                name: "testName",
            },
        };
        const apiCall = convertToAPICall(functionCall, document);
        expect(apiCall).to.deep.equal({
            path: "/test/testId",
            verb: "get",
            body: {
                name: "testName",
            },
            queryParams: {
                details: true,
            }
        });
    });
    it("should do various things for a real openapi document", () => {
        const document = {
            "openapi": "3.0.1",
            "info": {
                "title": "OpenAPI definition",
                "version": "v0"
            },
            "servers": [
                {
                    "url": "http://localhost:9990",
                    "description": "Generated server url"
                }
            ],
            "paths": {
                "/symbols": {
                    "post": {
                        "tags": [
                            "symbol-controller"
                        ],
                        "operationId": "getSymbols",
                        "requestBody": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "$ref": "#/components/schemas/GetSymbolsRequest"
                                    }
                                }
                            },
                            "required": true
                        },
                        "responses": {
                            "200": {
                                "description": "OK",
                                "content": {
                                    "*/*": {
                                        "schema": {
                                            "$ref": "#/components/schemas/GetSymbolsResponse"
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "/api/projects": {
                    "get": {
                      "summary": "List Projects",
                    },
                    "post": {
                      "summary": "Create Project",
                      "description": "Create a new project",
                    }
                  },
                "/api/projects/{slug}": {
                    "get": {
                        "summary": "Get Project",
                        "description": "Retrieves a project including details",
                        "parameters": [
                            {
                                "name": "slug",
                                "in": "path",
                                "required": true,
                                "schema": {
                                    "type": "string"
                                }
                            }
                        ]                     
                    }
                },
                "/api/projects/{slug}/project-file": {
                    "get": {
                        "summary": "Get Project File with Content",
                        "description": "Retrieves a project file by location with content",
                        "parameters": [
                            {
                                "name": "slug",
                                "in": "path",
                                "required": true,
                                "schema": {
                                    "type": "string"
                                }
                            },
                            {
                                "name": "location",
                                "in": "query",
                                "required": true,
                                "schema": {
                                    "type": "string"
                                }
                            }
                        ]                      
                    }
                }
            },
            "components": {
                "schemas": {
                    "GetSymbolsRequest": {
                        "type": "object",
                        "properties": {
                            "files": {
                                "type": "array",
                                "items": {
                                    "$ref": "#/components/schemas/SimpleFile"
                                }
                            }
                        }
                    },
                    "SimpleFile": {
                        "type": "object",
                        "properties": {
                            "location": {
                                "type": "string"
                            },
                            "content": {
                                "type": "string"
                            }
                        }
                    },
                    "CodingFile": {
                        "type": "object",
                        "properties": {
                            "location": {
                                "type": "string"
                            },
                            "classes": {
                                "type": "array",
                                "items": {
                                    "$ref": "#/components/schemas/JavaClass"
                                }
                            },
                            "methods": {
                                "type": "array",
                                "items": {
                                    "$ref": "#/components/schemas/JavaMethod"
                                }
                            },
                            "properties": {
                                "type": "array",
                                "items": {
                                    "$ref": "#/components/schemas/JavaProperty"
                                }
                            }
                        }
                    },
                    "GetSymbolsResponse": {
                        "type": "object",
                        "properties": {
                            "files": {
                                "type": "array",
                                "items": {
                                    "$ref": "#/components/schemas/CodingFile"
                                }
                            }
                        }
                    },
                    "JavaClass": {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string"
                            },
                            "description": {
                                "type": "string"
                            },
                            "properties": {
                                "type": "array",
                                "items": {
                                    "$ref": "#/components/schemas/JavaProperty"
                                }
                            },
                            "methods": {
                                "type": "array",
                                "items": {
                                    "$ref": "#/components/schemas/JavaMethod"
                                }
                            }
                        }
                    },
                    "JavaMethod": {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string"
                            },
                            "description": {
                                "type": "string"
                            },
                            "returnType": {
                                "type": "string"
                            },
                            "parameters": {
                                "type": "array",
                                "items": {
                                    "$ref": "#/components/schemas/JavaParameter"
                                }
                            },
                            "static": {
                                "type": "boolean"
                            }
                        }
                    },
                    "JavaParameter": {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string"
                            },
                            "description": {
                                "type": "string"
                            },
                            "type": {
                                "type": "string"
                            }
                        }
                    },
                    "JavaProperty": {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string"
                            },
                            "description": {
                                "type": "string"
                            },
                            "type": {
                                "type": "string"
                            },
                            "static": {
                                "type": "boolean"
                            }
                        }
                    }
                }
            }
        };

        const functionDocuments = getFunctions(document);
        expect(functionDocuments).to.deep.equal([
            {
                name: "post_symbols",
                parameters: {
                    type: "object",
                    required: [],
                    properties: {
                        files: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    location: {
                                        type: "string",
                                    },
                                    content: {
                                        type: "string",
                                    },
                                },
                            },
                        },
                    },
                },
            },
            {
                name: "get_api_projects",
                summary: "List Projects",
                parameters: {
                    type: "object",
                    required: [],
                    properties: {},
                },
            },
            {
                name: "post_api_projects",
                description: "Create a new project",
                summary: "Create Project",
                parameters: {
                    type: "object",
                    required: [],
                    properties: {},
                },
            },
            {
                name: "get_api_projects_by_slug",
                description: "Retrieves a project including details",
                summary: "Get Project",
                parameters: {
                    type: "object",
                    required: ["slug"],
                    properties: {
                        slug: {
                            type: "string",
                        },
                    },
                },
            },
        {
            name: "get_api_projects_by_slug_with_project-file",
            description: "Retrieves a project file by location with content",
            summary: "Get Project File with Content",
            parameters: {
                type: "object",
                required: ["slug", "location"],
                properties: {
                    slug: {
                        type: "string",
                    },
                    location: {
                        type: "string",
                    },
                },
            },
        }
        ]);

        const functionCall: FunctionCall = {
            name: "post_symbols",
            arguments: {
                files: [
                    {
                        location: "test",
                        content: "test",
                    },
                ],
            },
        };
        const apiCall = convertToAPICall(functionCall, document);
        expect(apiCall).to.deep.equal({
            path: "/symbols",
            verb: "post",
            body: {
                files: [
                    {
                        location: "test",
                        content: "test",
                    },
                ],
            },
            queryParams: {},
        });

        const path = getMatchingPath(functionCall, document);
        expect(path).to.deep.equal("/symbols");

        const openAPIPath = getPathFromFunctionName(functionCall.name);
        expect(openAPIPath).to.equal("/symbols");

        const verb = getVerbFromFunctionName(functionCall.name);
        expect(verb).to.equal("post");

        const templatedPath = templatePath(openAPIPath, functionCall);
        expect(templatedPath).to.equal("/symbols");

        const functionName = getFunctionName(openAPIPath, verb);
        expect(functionName).to.equal("post_symbols");


        // "name": "get_api_projects_by_slug_with_project-file",
        // "arguments": {
        //   "location": "src/main/java/com/testbed/accountapi/controller/AccountController.java",
        //   "slug": "account-api"
        // },
        const functionCall2: FunctionCall = {
            name: "get_api_projects_by_slug_with_project-file",
            arguments: {
                location: "src/main/java/com/testbed/accountapi/controller/AccountController.java",
                slug: "account-api",
            },
        };

        const apiCall2 = convertToAPICall(functionCall2, document);
        expect(apiCall2).to.deep.equal({
            path: "/api/projects/account-api/project-file",
            verb: "get",
            body: "",
            queryParams: {
                location: "src/main/java/com/testbed/accountapi/controller/AccountController.java",
            },
        });

        const path2 = getMatchingPath(functionCall2, document);
        expect(path2).to.deep.equal("/api/projects/{slug}/project-file");

        const openAPIPath2 = getPathFromFunctionName(functionCall2.name);
        expect(openAPIPath2).to.equal("/api/projects/{slug}/project-file");

        const verb2 = getVerbFromFunctionName(functionCall2.name);
        expect(verb2).to.equal("get");

        const templatedPath2 = templatePath(openAPIPath2, functionCall2);
        expect(templatedPath2).to.equal("/api/projects/account-api/project-file");

        const functionName2 = getFunctionName(openAPIPath2, verb2);
        expect(functionName2).to.equal("get_api_projects_by_slug_with_project-file");

        const functionCall3: FunctionCall = {
            name: "get_api_projects",
            arguments: {},
        };

        const apiCall3 = convertToAPICall(functionCall3, document);
        expect(apiCall3).to.deep.equal({
            path: "/api/projects",
            verb: "get",
            body: "",
            queryParams: {},
        });

        const path3 = getMatchingPath(functionCall3, document);
        expect(path3).to.deep.equal("/api/projects");

        const openAPIPath3 = getPathFromFunctionName(functionCall3.name);
        expect(openAPIPath3).to.equal("/api/projects");

        const verb3 = getVerbFromFunctionName(functionCall3.name);
        expect(verb3).to.equal("get");

        const templatedPath3 = templatePath(openAPIPath3, functionCall3);
        expect(templatedPath3).to.equal("/api/projects");

        const functionName3 = getFunctionName(openAPIPath3, verb3);
        expect(functionName3).to.equal("get_api_projects");

    });

    it("should do various things for a real openapi document", () => {
        const document = {
            "openapi": "3.0.0",
            "info": {
                "title": "Test My Budget API",
                "description": "API for Test My Budget",
                "version": "1.0.0"
            },
            "servers": [
                {
                    "url": "http://localhost:3009",
                    "description": "Local server"
                }
            ],
            "paths": {
                "/currentFinancialState": {
                    "get": {
                        "summary": "Get current financial state",
                        "description": "Get current financial state",
                        "parameters": [
                            {
                                "name": "state",
                                "in": "query",
                                "description": "The ID of the person whose financial state is being queried",
                                "required": false,
                                "schema": {
                                    "type": "string",
                                    "enum": ["current"]
                                }
                            }
                        ],
                        "responses": {
                            "200": {
                                "description": "Successful operation",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                           "type": "object"
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "/simulation": {
                    "post": {
                        "summary": "Simulate events",
                        "description": "Simulate events",
                        "requestBody": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "$ref": "#/components/schemas/Simulation"
                                    }
                                }
                            },
                            "required": true
                        },
                        "responses": {
                            "200": {
                                "description": "Successful operation",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object"
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "/statQuery": {
                    "post": {
                        "summary": "Query statistics",
                        "description": "Query statistics",
                        "requestBody": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "$ref": "#/components/schemas/StatQuery"
                                    }
                                }
                            },
                            "required": true
                        },
                        "responses": {
                            "200": {
                                "description": "Successful operation",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "$ref": "#/components/schemas/StatQuery"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
        
            },
            "components": {
                "schemas": {
                    "Simulation": {
                        "type": "object",
                        "properties": {
                            "homePurchases": {
                                "type": "array",
                                "items": {
                                    "$ref": "#/components/schemas/HomePurchaseEvent"
                                },
                                "description": "Any home purchases to simulate"
                            },
                            "employmentBeginnings": {
                                "type": "array",
                                "items": {
                                    "$ref": "#/components/schemas/EmploymentBeginEvent"
                                },
                                "description": "The employment beginnings to simulate"
                            },
                            "employmentEndings": {
                                "type": "array",
                                "items": {
                                    "$ref": "#/components/schemas/EmploymentEndEvent"
                                },
                                "description": "The employment endings to simulate"
                            },
                            "personalExpenseEvents": {
                                "type": "array",
                                "items": {
                                    "$ref": "#/components/schemas/PersonalExpenseEvent"
                                },
                                "description": "The personal expense events to simulate"
                            }
                        },
                        "required": []
                    },
                    "HomePurchaseEvent": {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string",
                                "description": "The name of the home"
                            },
                            "purchaseDate": {
                                "type": "string",
                                "format": "date",
                                "description": "The date on which the home is purchased"
                            },
                            "purchasePrice": {
                                "type": "number",
                                "description": "The price of the home"
                            },
                            "downPayment": {
                                "type": "number",
                                "description": "The down payment on the home"
                            },
                            "interestRate": {
                                "type": "number",
                                "description": "The interest rate on the mortgage"
                            },
                            "term": {
                                "type": "number",
                                "description": "The term of the mortgage in years"
                            },
                            "postalcode": {
                                "type": "string",
                                "description": "The postal code of the home"
                            },
                            "paymentSourceAccountId": {
                                "type": "string",
                                "description": "The account from which the down payment is withdrawn"
                            }
                        },
                        "required": [
                            "name",
                            "purchaseDate",
                            "purchasePrice",
                            "downPayment",
                            "interestRate",
                            "term",
                            "postalcode",
                            "paymentSourceAccountId"
                        ]
                    },
                    "EmploymentBeginEvent": {
                        "type": "object",
                        "properties": {
                            "personId": {
                                "type": "string",
                                "description": "The ID of the person who is beginning employment"
                            },
                            "employer": {
                                "type": "string",
                                "description": "The name of the employer"
                            },
                            "startDate": {
                                "type": "string",
                                "format": "date",
                                "description": "The date on which employment begins"
                            },
                            "salary": {
                                "type": "number",
                                "description": "The annual salary of the employee"
                            },
                            "hourlyWage": {
                                "type": "number",
                                "description": "The hourly wage of the employee"
                            },
                            "hoursPerWeek": {
                                "type": "number",
                                "description": "The number of hours per week the employee works"
                            },
                            "_401kMatch": {
                                "type": "number",
                                "description": "The percentage of the employee's salary that the employer matches in the employee's 401k"
                            },
                            "_401kSalaryPercentage": {
                                "type": "number",
                                "description": "The percentage of the employee's salary that the employee contributes to their 401k"
                            },
                            "stateCode": {
                                "type": "string",
                                "description": "The two-letter state code of the state in which the employee works"
                            }
                        },
                        "required": [
                            "personId",
                            "salary",
                            "employer",
                            "startDate",
                            "stateCode"
                        ]
                    },
                    "EmploymentEndEvent": {
                        "type": "object",
                        "properties": {
                            "date": {
                                "type": "string",
                                "format": "date",
                                "description": "The date on which the employment ends"
                            },
                            "employmentId": {
                                "type": "string",
                                "description": "The id of the employment that ends"
                            }
                        },
                        "required": [
                            "date",
                            "employmentId"
                        ]
                    },
                    "PersonalExpenseEvent": {
                        "type": "object",
                        "properties": {
                            "amount": {
                                "type": "number",
                                "description": "The amount of the expense"
                            },
                            "date": {
                                "type": "string",
                                "format": "date",
                                "description": "The date on which the expense occurs"
                            },
                            "name": {
                                "type": "string",
                                "description": "The name of the expense"
                            },
                            "personId": {
                                "type": "string",
                                "description": "The ID of the person who is incurring the expense"
                            },
                            "associatedAccountId": {
                                "type": "string",
                                "description": "The ID of the account from which the expense is paid"
                            },
                            "monthly": {
                                "type": "boolean",
                                "description": "Whether the expense is paid monthly or one-time"
                            },
                            "endDate": {
                                "type": "string",
                                "format": "date",
                                "description": "The date on which the expense ends if it is a monthly expense"
                            }
                        },
                        "required": [
                            "amount",
                            "date",
                            "name",
                            "personId"
                        ]
                    },
                    "StatQuery": {
                        "type": "object",
                        "properties": {
                            "personId": {
                                "type": "string",
                                "description": "The ID of the person whose statistics are being queried"
                            },
                            "startDate": {
                                "type": "string",
                                "format": "date",
                                "description": "The start date of the query"
                            },
                            "endDate": {
                                "type": "string",
                                "format": "date",
                                "description": "The end date of the query"
                            }
                        },
                        "required": [
                            "personId",
                            "startDate",
                            "endDate"
                        ]
                    }
                }
            }
        };

        const functionDocuments = getFunctions(document);

        const functionCall: FunctionCall = {
            name: "get_currentFinancialState",
            arguments: {}
        };

        const apiCall = convertToAPICall(functionCall, document);

        expect(apiCall).to.deep.equal({
            path: "/currentFinancialState",
            verb: "get",
            body: "",
            queryParams: {},
        });

        const path = getMatchingPath(functionCall, document);
        expect(path).to.deep.equal("/currentFinancialState");

        const openAPIPath = getPathFromFunctionName(functionCall.name);
        expect(openAPIPath).to.equal("/currentFinancialState");

        const verb = getVerbFromFunctionName(functionCall.name);
        expect(verb).to.equal("get");

        const templatedPath = templatePath(openAPIPath, functionCall);
        expect(templatedPath).to.equal("/currentFinancialState");

        const functionName = getFunctionName(openAPIPath, verb);
        expect(functionName).to.equal("get_currentFinancialState");

    });


});