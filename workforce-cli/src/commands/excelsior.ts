import { Auth } from "../auth/auth.js";
import { initApi } from "./base.js";

export async function excelsiorLinks(options: {
    flow?: string,
    api?: string,
    orgId?: string
}) {

    const authConfig = Auth.config();
    let orgId = options.orgId || authConfig.orgId;

    const excelsiorHost = "http://localhost:8085/excelsior";

    if (!orgId) {
        console.error("Org ID is required. Please provide an org ID or set a default org.");
        return;
    }

    const api = initApi("channels", options.api);
    if (!api) {
        return;
    }

    const flowData = [];

    if (!options.flow) {
        const flowApi = initApi("flows", options.api);
        if (!flowApi) {
            return;
        }
        const response = await flowApi.list({ orgId });
        for (const item of response) {
            flowData.push({
                id: item.id,
                name: item.name
        });
        }
    } else {
        flowData.push({
            id: options.flow,
            name: ""
        });
    }

    if (flowData.length === 0) {
        console.error("No flows found.");
        return;
    }

    for (const flow of flowData) {

        const response = await api.list({ orgId, flowId: flow.id });

        for (const item of response) {
            console.log(`${flow.name}: ${excelsiorHost}?orgId=${orgId}&channelId=${item.id}`);
        }
    }

    return;
}