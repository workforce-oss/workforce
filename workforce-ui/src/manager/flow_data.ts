import { CredentialConfig, FlowConfig } from "workforce-core/model";

export class FlowData {
	flow: FlowConfig;
	credentials?: CredentialConfig[];
}