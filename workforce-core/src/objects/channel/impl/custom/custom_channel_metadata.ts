import { CustomObject } from "../../../base/model.js";
import { ChannelConfig } from "../../model.js";

export class CustomChannelMetadata {
    public static defaultConfig(customObject: CustomObject): ChannelConfig {
        
        const config: ChannelConfig = {
            id: crypto.randomUUID(),
            name: "Custom Channel",
            description: "Custom Channel",
            type: "custom-channel",
            orgId: customObject.orgId,
            variables: {} as Record<string, unknown>,
        }
        if (customObject.variablesSchema?.properties) {
            for (const key of Object.keys(customObject.variablesSchema.properties) ?? []) {
                if (customObject.variablesSchema.properties[key].default) {
                    config.variables![key] = customObject.variablesSchema.properties[key].default;
                }
             }    
        }

        return config;
    }
}