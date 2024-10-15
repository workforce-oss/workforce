import { AIWorker } from "../impl/ai/ai_worker.js";
import { MockWorker } from "../impl/mock/mock_worker.js";
import { WorkerConfig } from "../model.js";
import { Worker } from "../base.js";
import { HumanWorker } from "../impl/human/human_worker.js";

export class WorkerFactory {
	static create(config: WorkerConfig,): Worker {
		switch (config.subtype) {
			case "mock":
				return new MockWorker(config);
			case "ai-worker":
				return new AIWorker(config);
			case "human-worker":
				return new HumanWorker(config);
			default:
				throw new Error(`WorkerFactory.create() unknown worker type ${config.subtype as string}`);
		}
	}
}