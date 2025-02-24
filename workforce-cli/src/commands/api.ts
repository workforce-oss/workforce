import { APICallOptions } from "workforce-api-client";
import { Auth } from "../auth/auth.js";
import { initApi, requireFlow, requireOrg } from "./base.js";
import { ApiClient } from "../../../workforce-core/dist/objects/base/api_client.js";

export async function getResource(type: string, id: string, options: APICallOptions & {
    api?: string,
}) {
    const api = initApi(type, options.api);
    if (!api) {
        return;
    }

    if (type === "flow") {
        options.queryParams = {
            replaceIdsWithNames: "true",
        }
    }

    const response = await api.get(id, options);
    if (Array.isArray(response)) {
        for (const error of response) {
            console.log(error.message);
        }
    } else {
        console.log("Flow Retrieved");
        console.log(JSON.stringify(response, null, 2));
    }
}

export async function listResources(type: string, options: APICallOptions & {api: string}) {
    const authConfig = Auth.config();
    let orgId = options.orgId || authConfig.orgId;

    const orgValid = requireOrg(type, orgId);
    if (!orgValid) {
        return;
    }

    const flowValid = requireFlow(type, options.flowId);
    if (!flowValid) {
        return;
    }
    
    const api = initApi(type, options.api);
    if (!api) {
        return;
    }

    if (type === "flows") {
        options.queryParams = {
            replaceIdsWithNames: "true",
        }
    }

    if (type === "orgs") {
        const response = await api.list(options);
        for (const item of response) {
            console.log(`${(item as any).id}: ${JSON.stringify(item, null, 2)}`);
        }
        return;
    }
    console.log(`Listing ${type} for org ${orgId}`);
    const response = await api.list({ orgId: orgId ?? "", flowId: options.flowId ?? "" } as APICallOptions);
    for (const item of response) {
        console.log(`${(item as any).id}: ${JSON.stringify(item, null, 2)}`);
    }
}

export async function deleteResource(type: string, id: string, options: APICallOptions & {api: string}) {
    const api = initApi(type, options.api);
    if (!api) {
        return;
    }

    const response = await api.delete(id, options);
    if (Array.isArray(response)) {
        for (const error of response) {
            console.log(error.message);
        }
    } else {
        console.log("Flow Deleted");
    }
}