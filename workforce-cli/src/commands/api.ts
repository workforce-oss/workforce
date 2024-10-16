import { Auth } from "../auth/auth.js";
import { initApi, requireFlow, requireOrg } from "./base.js";

export async function getResource(type: string, id: string, options: {
    api?: string,
}) {
    const api = initApi(type, options.api);
    if (!api) {
        return;
    }

    const response = await api.get(id);
    if (Array.isArray(response)) {
        for (const error of response) {
            console.log(error.message);
        }
    } else {
        console.log("Flow Retrieved");
        console.log(JSON.stringify(response, null, 2));
    }
}

export async function listResources(type: string, options: {
    api?: string,
    orgId?: string,
    flow?: string,
}) {
    const authConfig = Auth.config();
    let orgId = options.orgId || authConfig.orgId;

    const orgValid = requireOrg(type, orgId);
    if (!orgValid) {
        return;
    }

    const flowValid = requireFlow(type, options.flow);
    if (!flowValid) {
        return;
    }
    
    const api = initApi(type, options.api);
    if (!api) {
        return;
    }

    if (type === "orgs") {
        const response = await api.list();
        for (const item of response) {
            console.log(`${item.id}: ${JSON.stringify(item, null, 2)}`);
        }
        return;
    }
    console.log(`Listing ${type} for org ${orgId}`);
    const response = await api.list({ orgId: orgId ?? "", flowId: options.flow ?? "" });
    for (const item of response) {
        console.log(`${item.id}: ${JSON.stringify(item, null, 2)}`);
    }
}

export async function deleteResource(type: string, id: string, options: {
    api: string,
}) {
    const api = initApi(type, options.api);
    if (!api) {
        return;
    }

    const response = await api.delete(id);
    if (Array.isArray(response)) {
        for (const error of response) {
            console.log(error.message);
        }
    } else {
        console.log("Flow Deleted");
    }
}