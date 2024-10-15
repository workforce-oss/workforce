import { VariablesSchema } from "../../base/variables_schema.js";
import { VariableSchemaElement } from "../../base/variables_schema_model.js";
import { ChannelUserCredential } from "../model.js";

export class ChannelUserCredentialConfigFactory {
	static defaultConfigFor(orgId: string, subtype: string): ChannelUserCredential {
		return {
			id: crypto.randomUUID(),
			type: "channel_user_credential",
			subtype: subtype as unknown as ChannelUserCredential["subtype"],
			name: "Channel User Credential",
			description: "Channel User Credential",
			orgId: orgId,
		};
	}

	static variablesSchemaFor(config: ChannelUserCredential): VariablesSchema {
		const schema = new Map<string, VariableSchemaElement>();
		schema.set("token", { description: "channel token", type: "string", required: true, sensitive: true });
		return new VariablesSchema(schema, config.type, config.subtype);
	}
}
