// This file offers utilities to work with OpenAPI documents.
import _ from "lodash";
import { AuthData } from "../objects/tool/impl/openapi/openapi_types.js";
import { OpenAPIAuthHelper } from "../objects/tool/impl/openapi/openapi_auth_helper.js";
import { Logger } from "../logging/logger.js";
import https from "https";
import { jsonParse } from "./json.js";
import { ToolCall } from "../model.js";


export interface FunctionDocuments {
    functions: FunctionDocument[];
}

export interface FunctionDocument {
    name: string;
    description?: string;
    summary?: string;
    parameters?: FunctionParameters;
}

export interface FunctionParameters {
    type: string;
    items?: FunctionParameters;
    required?: string[];
    description?: string;
    properties?: Record<string, FunctionParameters>;
}

export interface FunctionCall {
    name: string;
    // an object with keys that match keys in FunctionParameters.properties
    // these may be in path, query, or body
    arguments: Record<string, unknown>;
}

export interface APICall {
    path: string;
    verb: string;
    body: Record<string, unknown> | string;
    queryParams: Record<string, string>;
    headers?: Record<string, string>;
}

const WorkForceConfigProperty = "x-workforce-config-property";

// This finds a reference in an OpenAPI document and returns the referenced object.
// Refs look like this: #/components/schemas/MySchema
// This references a nested object in the document.
export function resolveRef(ref: string, obj: Record<string, unknown>): Record<string, unknown> {
    try {
        const parts = ref.split("/");
        let current = obj;
        for (const part of parts) {
            if (part === "#") {
                continue;
            }
            if (current[part] === undefined || current[part] === null) {
                throw new Error(`resolveRef() could not find part ${part}`);
            }
            current = current[part] as Record<string, unknown>;
        }
        return current;
    } catch (error) {
        console.error(`resolveRef() error=`, error);
        return {};
    }
}

// Deeply resolve all refs in an object.
export function resolveRefs(obj: Record<string, unknown>, parent: Record<string, unknown>): Record<string, unknown> {
    if (isRef(obj)) {
        obj = resolveRef(obj.$ref as string, parent);
    }
    if (typeof obj === "object" && obj !== null) {
        for (const key in obj) {
            obj[key] = resolveRefs(obj[key] as Record<string, unknown>, parent);
        }
    }
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            obj[i] = resolveRefs(obj[i] as Record<string, unknown>, parent);
        }
    }

    return obj;
}

export function isRef(obj: Record<string, unknown>): boolean {
    return obj.$ref !== undefined;
}

export function getPaths(document: Record<string, unknown>): Record<string, unknown> {
    const cpy = _.cloneDeep(document);
    const resolved = resolveRefs(document, cpy);
    return resolveRef("#/paths", resolved);
}

// Create a snake cased string of verb_path.
export function getFunctionName(path: string, verb: string): string {
    const parts = path.split(/\/|:/);
    let name = verb
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part === "") {
            continue;
        }
        if (part.startsWith("{")) {
            const partName = part.substring(1, part.length - 1);
            name += "_by_" + partName;
            if (i < parts.length - 1) {
                name += "_with"
            }
            continue;
        }
        name += "_" + part;
    }
    return name
}



export function getMatchingPath(functionCall: ToolCall, openApiDocument: Record<string, unknown>): string {
    const paths = getPaths(openApiDocument);
    const functionPath = getPathFromFunctionName(functionCall.name);
    // iterate over keys
    for (const path of Object.keys(paths)) {
        if (pathIsMatch(path, functionPath)) {
            return path;
        }
    }
    throw new Error(`Could not find path for function call ${functionCall.name}`);
}

export function pathIsMatch(openAPIPath: string, functionPath: string): boolean {
    // spliit on / or :
    const openAPIParts = openAPIPath.split(/\/|:/);
    const functionParts = functionPath.split("/");
    const openAPIIndex = 1;
    let functionIndex = 1;

    if (openAPIParts.length !== functionParts.length) {
        return false;
    }

    for (let i = openAPIIndex; i < openAPIParts.length; i++) {
        const openAPIPart = openAPIParts[i];
        const functionPart = functionParts[functionIndex];
        if (openAPIPart === functionPart) {
            functionIndex++;
            continue;
        }
        // if (openAPIPart.startsWith("{") && openAPIPart.endsWith("}")) {
        //     continue;
        // }
        return false;
    }
    return true;
}

export function getPathFromFunctionName(functionName: string): string {
    const parts = functionName.split("_");
    let path = "";
    let lastPartWasBy = false;
    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        if (part === "with") {
            continue;
        }
        if (part === "by") {
            lastPartWasBy = true;
            continue;
        } else if (lastPartWasBy) {
            path += "/{" + part + "}";
            lastPartWasBy = false;
            continue;
        }
        path += "/" + part;
    }
    return path;
}

export function getVerbFromFunctionName(functionName: string): string {
    const parts = functionName.split("_");
    return parts[0];
}


export function templatePath(path: string, functionCall: FunctionCall): string {
    let newPath = path;
    for (const key in functionCall.arguments) {
        newPath = newPath.replace(`{${key}}`, functionCall.arguments[key] as string);
    }
    return newPath;
}

export function isHttpVerb(verb: string): boolean {
    return ["get", "post", "put", "delete", "patch"].includes(verb.toLowerCase());
}

export function getFunctionsForPath(args: {path: string, pathObj: Record<string, unknown>, targetVerb?: string}): FunctionDocument[] {
    const { path, pathObj, targetVerb } = args;
    const pathParameters = pathObj.parameters as Record<string, string | FunctionParameters>[];
    const pathProperties: Record<string, FunctionParameters> = {};
    const pathRequired: string[] = [];
    const functionDocuments: FunctionDocument[] = [];
    if (pathParameters) {
        for (const parameter of pathParameters) {
            if (parameter.in === "query") {
                const schema = parameter.schema;
                pathProperties[parameter.name as string] = schema as FunctionParameters;
                if (parameter.required) {
                    pathRequired.push(parameter.name as string);
                }
            }
            if (parameter.in === "path") {
                const schema = parameter.schema;
                pathProperties[parameter.name as string] = schema as FunctionParameters;
                if (parameter.required) {
                    pathRequired.push(parameter.name as string);
                }
            }
        }
    }
    for (const verb in pathObj) {
        if (!isHttpVerb(verb)) {
            continue;
        }
        if (targetVerb && verb.toLowerCase() !== targetVerb.toLowerCase()) {
            continue;
        }
        const verbObj = pathObj[verb] as Record<string, unknown>;
        const functionName = getFunctionName(path, verb);
        const functionDocument: FunctionDocument = {
            name: functionName,
            parameters: {
                type: "object",
                required: [],
            }
        };
        if (pathProperties) {
            functionDocument.parameters!.properties = pathProperties;
        }
        if (pathRequired) {
            functionDocument.parameters!.required = pathRequired;
        }

        if (verbObj.description) {
            functionDocument.description = verbObj.description as string;
        }
        if (verbObj.summary) {
            functionDocument.summary = verbObj.summary as string;
        }
        if (verbObj.requestBody) {
            const requestBody = verbObj.requestBody as Record<string, Record<string, unknown>>;
            for (const contentType in requestBody.content) {
                if (contentType !== "application/json") {
                    continue;
                }
                const content = requestBody.content[contentType] as Record<string, unknown>;
                if (content.schema) {
                    const schema = content.schema as FunctionParameters;
                    let properties = functionDocument.parameters?.properties ?? {};
                    if (schema.properties) {
                        properties = { ...properties, ...schema.properties, ...pathProperties };
                    }
                    let required = functionDocument.parameters?.required ?? [];
                    if (schema.required) {
                        required = [...required, ...schema.required, ...pathRequired];
                    }

                    functionDocument.parameters = {
                        type: "object",
                        required: required,
                        properties: properties,
                    };
                }
            }
        }
        if (verbObj.parameters) {
            const parameters = verbObj.parameters as Record<string, FunctionParameters | string | boolean>[];
            for (const parameter of parameters) {
               
                if (parameter.in === "query" || parameter.in === "path" || parameter.in === "header") {
                    // Check contains a key for WorkForceConfigProperty, if it is set to true, then skip
                    if (parameter[WorkForceConfigProperty] === true) {
                        continue;
                    }
                    const schema = parameter.schema;
                    const properties = functionDocument.parameters?.properties ?? {};
                    properties[parameter.name as string] = schema as FunctionParameters;
                    let required = functionDocument.parameters?.required ?? [];
                    if (parameter.required) {
                        required = [...required, parameter.name as string];
                    }
                    functionDocument.parameters = {
                        type: "object",
                        required: required,
                        properties: properties,
                    };
                }
            }
        }
        functionDocuments.push(functionDocument);
    }
    return functionDocuments;
}


export function getFunctions(document: Record<string, unknown>): FunctionDocument[] {
    const paths = getPaths(document);
    const functions: FunctionDocument[] = [];
    for (const path in paths) {
        const pathObj = paths[path] as Record<string, unknown>;
        const functionDocuments = getFunctionsForPath({path, pathObj});
        functions.push(...functionDocuments);
    }

    return functions;
}

export function convertToAPICall(functionCall: ToolCall, openApiDocument: Record<string, unknown>, logger?: Logger): APICall {
    logger?.debug(`convertToAPICall() functionCall=${JSON.stringify(functionCall)}`);
    logger?.debug(`convertToAPICall() getVerbFromFunctionName=${getVerbFromFunctionName(functionCall.name)}`);
    const verb = getVerbFromFunctionName(functionCall.name);
    logger?.debug(`convertToAPICall() verb=${verb}`);

    const paths = getPaths(openApiDocument);

    const apiPath = getMatchingPath(functionCall, openApiDocument);
    logger?.debug(`convertToAPICall() apiPath=${apiPath}`);
    
    const pathObj = paths[apiPath] as Record<string, unknown>;

    if (pathObj[verb] === undefined) {
        throw new Error(`Could not find verb ${verb} in path ${apiPath}`);
    }

    const verbObj = pathObj[verb] as Record<string, unknown>;

    const apiCall: APICall = {
        path: apiPath,
        verb: verb,
        body: "",
        queryParams: {},
    };

    if (pathObj.parameters) {
        const pathParameters = pathObj.parameters as Record<string, unknown>[];
        for (const parameter of pathParameters) {
            if (parameter.in === "query") {
                if (functionCall.arguments[parameter.name as string] === undefined) {
                    continue;
                }
                apiCall.queryParams[parameter.name as string] = functionCall.arguments[parameter.name as string] as string;
            }
            if (parameter.in === "path") {
                logger?.debug(`convertToAPICall() templatePath=${apiCall.path}, ${JSON.stringify(functionCall)}`);
                apiCall.path = templatePath(apiCall.path, functionCall);
                logger?.debug(`convertToAPICall() apiCall.path=${apiCall.path}`);
            }
        }
    }

    if (verbObj.parameters) {
        const parameters = verbObj.parameters as Record<string, unknown>[];
        for (const parameter of parameters) {
            if (parameter.in === "query") {
                if (functionCall.arguments[parameter.name as string] === undefined) {
                    continue;
                }
                apiCall.queryParams[parameter.name as string] = functionCall.arguments[parameter.name as string] as string;
            }
            if (parameter.in === "path") {
                logger?.debug(`convertToAPICall() templatePath=${apiCall.path}, ${JSON.stringify(functionCall)}`);
                apiCall.path = templatePath(apiCall.path, functionCall);
                logger?.debug(`convertToAPICall() apiCall.path=${apiCall.path}`);
            }
            if (parameter.in === "header") {
                if (!apiCall.headers) {
                    apiCall.headers = {};
                }
                apiCall.headers[parameter.name as string] = functionCall.arguments[parameter.name as string] as string;
            }
        }
    }

    if (verbObj.requestBody) {
        const requestBody = verbObj.requestBody as Record<string, Record<string, unknown>>;
        for (const contentType in requestBody.content) {
            if (contentType !== "application/json") {
                continue;
            }
            const content = requestBody.content[contentType] as Record<string, unknown>;
            if (content.schema) {
                const schema = content.schema as Record<string, Record<string, unknown>>;
                for (const key in functionCall.arguments) {
                    if (schema.properties[key] === undefined) {
                        continue;
                    }
                    if (!apiCall.body) {
                        apiCall.body = {};
                    }
                    (apiCall.body as Record<string, unknown>)[key] = functionCall.arguments[key];
                }
            }
        }
    }

    return apiCall;
}

export async function performAPICall(args: {
    orgId: string,
    apiCall: APICall,
    openApiDocument: Record<string, unknown>,
    taskExecutionId: string,
    variables: Record<string, unknown>,
    channelThreadId?: string,
    logger?: Logger,
    additionalQueryParams?: Record<string, string>,
    oauth2CallBackHandler?: (auth: AuthData) => Promise<boolean>,
}): Promise<Record<string, unknown> | { error: string }> {
    const { orgId, apiCall, openApiDocument, taskExecutionId, variables, channelThreadId, logger, oauth2CallBackHandler } = args;

    if (!openApiDocument) {
        throw new Error("No OpenAPI document provided.");
    }

    const servers = openApiDocument.servers as Record<string, unknown>[] | undefined;

    if (!servers || servers.length === 0) {
        throw new Error("No servers defined in schema.");
    }
    const url = servers[0].url as string | undefined;
    if (!url) {
        throw new Error("No url provided.");
    }

    const method = apiCall.verb.toUpperCase();
    let auth = OpenAPIAuthHelper.getAuthFromCache(`${servers[0].url as string}_${taskExecutionId}`);


    if (!auth) {
        auth = await OpenAPIAuthHelper.getAuth(openApiDocument, variables);
    }
    if (!oauth2CallBackHandler && (auth.authType === "oauth2_authorization_code" || auth.authType === "oidc")) {
        throw new Error("OAuth2 Authorization Code and OIDC are not supported for this operation.");
    } else if (oauth2CallBackHandler && (auth.authType === "oauth2_authorization_code" || auth.authType === "oidc")) {
        const success = await oauth2CallBackHandler(auth);
        if (!success) {
            return { "error": "Failed to authenticate" };
        }
    }
    
    OpenAPIAuthHelper.setAuthToCache(`${servers[0].url as string}_${taskExecutionId}`, auth);
    

    const headers = getHeaders({ openApiDocument, auth, variables, logger });
    headers["x-workforce-org-id"] = orgId;
    if (taskExecutionId) {
        headers["X-Session-Id"] = taskExecutionId;
        headers["X-Task-Execution-Id"] = taskExecutionId;
    }
    if (channelThreadId) {
        headers["x-workforce-channel-thread-id"] = channelThreadId;
    }

    if (apiCall.headers) {
        for (const [key, value] of Object.entries(apiCall.headers)) {
            headers[key] = value;
        }
    }

    const bodyString = JSON.stringify(apiCall.body);
    logger?.debug(
        `execute() url=${url} method=${method} headers=${JSON.stringify(
            headers
        )} body=${bodyString}`
    );

    const urlWithQueryParams = new URL(url + apiCall.path);
    for (const [key, value] of Object.entries(apiCall.queryParams)) {
        urlWithQueryParams.searchParams.append(key, value);
    }

    if (args.additionalQueryParams) {
        for (const [key, value] of Object.entries(args.additionalQueryParams)) {
            urlWithQueryParams.searchParams.append(key, value);
        }
    }

    if (apiCall.body) {
        headers["Content-Type"] = "application/json";
    }

    const requestInit = {
        method,
        headers,
        body: method === "GET" ? null : bodyString,
    } as Record<string, unknown>;

    if (auth.ca && auth.cert && auth.key) {
        requestInit.agent = new https.Agent({
            cert: auth.cert,
            key: auth.key,
            ca: auth.ca,
        });
    }

    requestInit.signal = AbortSignal.timeout(30000);

    logger?.debug(`execute() urlWithQueryParams=${urlWithQueryParams} requestInit=${JSON.stringify(requestInit)}`);

    return fetch(urlWithQueryParams, requestInit)
        .then((response) => {
            if (!response.ok) {
                if (response.status === 401) {
                    OpenAPIAuthHelper.clearAuthFromCache(`${servers[0].url as string}_${taskExecutionId}`);
                }
                return {
                    error: `HTTP error: ${response.status}`,
                }
            }
            logger?.debug(`execute() response=${JSON.stringify(response)}`);
            return response.json();
        })
        .then((json: Record<string, unknown>) => {
            logger?.debug(`execute() json=${JSON.stringify(json)}`);
            if (json.error) {
                return {
                    error: json.error,
                }
            }

            return json;
        })
        .catch((error: Record<string, unknown>) => {
            logger?.error(`execute() error=${JSON.stringify(error)}`);
            return {
                error: error.message as string,
            }
        }) as Promise<Record<string, unknown> | { error: string }>;
}

function getHeaders(args: { openApiDocument: Record<string, unknown>, auth: AuthData, variables: Record<string, unknown>, logger?: Logger }): Record<string, string> {
    const { auth, variables, logger } = args;
    const headers: Record<string, string> = {};
    if (auth?.header && auth.headerValue) {
        headers[auth.header] = auth.headerValue;
    }
    headers["Content-Type"] = "application/json";
    if (variables.custom_headers) {
        try {
            const customHeaders = jsonParse<Record<string, unknown>>(variables.custom_headers as string);
            if (!customHeaders) {
                return headers;
            }
            for (const [key, value] of Object.entries(customHeaders)) {
                headers[key] = value as string;
            }
        } catch (err) {
            logger?.error(`Error parsing custom headers:`, err);
        }
    }



    return headers;
}