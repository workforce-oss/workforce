import { RestApi, WorkforceAPIClient } from "workforce-api-client";
import { Auth } from "../auth/auth.js";

export const resourceTypes = ["orgs", "flows", "workers", "credentials", "users", "org-users", "document-repositories", "channels", "channel-sessions", "channel-messages", "tasks", "task-executions", "resources", "resource-versions", "resource-writes", "documentation", "document-relations"];

export function initApi(type: string, baseUrl?: string): RestApi<any, any> | undefined {
    const authConfig = Auth.config();
    if (!authConfig?.auth?.accessToken) {
        console.error("Please login first.");
        return undefined;
    }

    const accessToken = authConfig.auth.accessToken;

    const apiUrl = baseUrl || authConfig.apiUrl;
    if (!apiUrl) {
        console.error("Please provide an API URL.");
        return 
    }

    const basePath = apiUrl.split("/").slice(3).join("/");

    WorkforceAPIClient.init({
        accessToken,
        baseUrl: apiUrl,
        basePath
    });

    return selectApi(type);
}

export function requireOrg(type: string, orgId?: string): boolean {
    switch (type) {
        case "orgs":
            return true;
        case "flows":
        case "workers":
        case "credentials":
        case "users":
        case "org-users":
        case "document-repositories":
        case "channels":
        case "channel-sessions":
        case "channel-messages":
        case "tasks":
        case "task-executions":
        case "resources":
        case "resource-versions":
        case "resource-writes":
        case "documentation":
            if (!orgId) {
                console.error("Org ID is required. Please provide an org ID or set a default org.");
                return false;
            }
            break;
        default:
            console.error("Invalid type. Please provide a valid type.");
            return false;
    }

    return true;
}

export function requireFlow(type: string, flowId?: string): boolean {
    switch (type) {
        case "channels":
        case "tasks":
        case "resources":
        case "documentation":
            if (!flowId) {
                console.error("Flow ID is required. Please provide a flow ID.");
                return false;
            }
            break;
        default:
            return true;
    }

    return true;
}

export function selectApi(type: string): RestApi<any, any> | undefined {
    switch (type) {
        case "org":
        case "orgs":
            return WorkforceAPIClient.OrgAPI;
        case "flow":
        case "flows":
            return WorkforceAPIClient.FlowAPI;
        case "worker":
        case "workers":
            return WorkforceAPIClient.WorkerAPI;
        case "credential":
        case "credentials":
            return WorkforceAPIClient.CredentialAPI;
        case "user":
        case "users":
            return WorkforceAPIClient.UserAPI;
        case "org-user":
        case "org-users":
            return WorkforceAPIClient.OrgUserAPI;
        case "document-repository":
        case "document-repositories":
            return WorkforceAPIClient.DocumentRepositoryAPI;
        case "channel":
        case "channels":
            return WorkforceAPIClient.ChannelAPI;
        case "channel-session":
        case "channel-sessions":
            return WorkforceAPIClient.ChannelSessionAPI;
        case "channel-message":
        case "channel-messages":
            return WorkforceAPIClient.ChannelMessageAPI;
        case "task":
        case "tasks":
            return WorkforceAPIClient.TaskAPI;
        case "task-execution":
        case "task-executions":
            return WorkforceAPIClient.TaskExecutionAPI;
        case "resource":
        case "resources":
            return WorkforceAPIClient.ResourceAPI;
        case "resource-version":
        case "resource-versions":
            return WorkforceAPIClient.ResourceVersionAPI;
        case "resource-write":
        case "resource-writes":
            return WorkforceAPIClient.ResourceWriteAPI;
        case "documentation":
            return WorkforceAPIClient.DocumentationAPI;
        default:
            console.error("Invalid type. Please provide a valid type.");
            return undefined;
    }
}