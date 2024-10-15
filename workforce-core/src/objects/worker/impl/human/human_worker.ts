import { Subject } from "rxjs";
import { Logger } from "../../../../logging/logger.js";
import { ToolCall } from "../../../base/model.js";
import { VariablesSchema } from "../../../base/variables_schema.js";
import { ChannelBroker } from "../../../channel/broker.js";
import { DocumentRepository } from "../../../document_repository/base.js";
import { ToolResponse } from "../../../tool/model.js";
import { Worker } from "../../base.js";
import { ChatMessage, ChatSession, WorkRequest, WorkerConfig } from "../../model.js";
import { HumanAPIServer } from "./human_api_service.js";
import { HumanWorkerMetadata } from "./human_worker_metadata.js";

export class HumanWorker extends Worker {
	logger = Logger.getInstance("HumanWorker");

	private apiService: HumanAPIServer;
	constructor(config: WorkerConfig) {
		super(config, () => undefined);
		this.logger.info(`Creating HumanWorker with config: ${JSON.stringify(config)}`);
		const apiService = new HumanAPIServer(config);
		this.apiService = apiService;

		this.toolResponseCallback =  (response: ToolResponse | { success: boolean; message: string | Record<string, unknown> }) => apiService.toolResponseCallback(response);
	}

	public static defaultConfig(orgId: string): WorkerConfig {
		return HumanWorkerMetadata.defaultConfig(orgId);
	}

	public async work(workRequest: WorkRequest): Promise<void> {
		const toolSchemas = await this.loadTools(workRequest.tools?.map((tool) => tool.id!) ?? []).catch((error) => {
			this.logger.error(`Error loading tools: ${error}`);
			return {};
		});

		this.apiService.workRequestCallback(workRequest, toolSchemas);
		await super.work(workRequest);
	}

	public onWorkComplete(request: WorkRequest): void {
		super.onWorkComplete(request);
		this.loadTools(request.tools?.map((tool) => tool.id!) ?? []).then((toolSchemas) => {
			this.apiService.workRequestCallback(request, toolSchemas);
		}).catch((error) => {
			this.logger.error(`Error loading tools: ${error}`);
		});
	}

	public inference(
		args: {
			chatSession: ChatSession;
			workRequest: WorkRequest;
			toolSchemas: Record<string, ToolCall[]>;
			messageOutputSubject: Subject<ChatMessage>;
			channelBroker?: ChannelBroker;
			singleMessage?: boolean;
			intermediateCallback?: (message: ChatMessage) => Promise<void>;
		},
	): Promise<void> {
		const { chatSession, workRequest, toolSchemas, messageOutputSubject, intermediateCallback } = args;
		const functions = [];
		if (workRequest.completionFunction) {
			functions.push(workRequest.completionFunction);
		}
		for (const functionList of Object.values(toolSchemas)) {
			functions.push(...functionList);
		}
		if (workRequest.documentation) {
			functions.push(DocumentRepository.functionSchema());
		}
		this.logger.debug(
			`inference() singleMessage: ${false}, explainFunctions: ${false}, functions: ${functions.length}`
		)

		// update the state of the work request
		this.apiService.workRequestCallback(workRequest, toolSchemas);
		this.apiService.inference(
			chatSession,
			intermediateCallback,
			messageOutputSubject,
		)

		return Promise.resolve();
	}

	static variablesSchema(): VariablesSchema {
		return HumanWorkerMetadata.variablesSchema();
	}

	public async destroy(): Promise<void> {
		return await this.apiService.destroy();
	}
}
