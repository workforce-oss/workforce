import { Configuration } from "../config/configuration.js";
import { IdentityBroker } from "../identity/broker.js";
import { Logger } from "../logging/logger.js";
import { ChannelBroker } from "../objects/channel/broker.js";
import { DocumentRepositoryBroker } from "../objects/document_repository/broker.js";
import { ResourceBroker } from "../objects/resource/broker.js";
import { TaskBroker } from "../objects/task/broker.js";
import { ToolBroker } from "../objects/tool/broker.js";
import { TrackerBroker } from "../objects/tracker/broker.js";
import { WorkerBroker } from "../objects/worker/broker.js";
import { BrokerMode } from "./impl/subject_factory.js";

export class BrokerManager {
    private static _channelBroker?: ChannelBroker;

    public static get channelBroker(): ChannelBroker {
        if (!this._channelBroker) {
            throw new Error("Channel broker not initialized");
        }
        return this._channelBroker;
    }

    private static _documentRepositoryBroker?: DocumentRepositoryBroker;
    public static get documentRepositoryBroker(): DocumentRepositoryBroker {
        if (!this._documentRepositoryBroker) {
            throw new Error("Document repository broker not initialized");
        }
        return this._documentRepositoryBroker;
    }

    private static _identityBroker?: IdentityBroker;
    public static get identityBroker(): IdentityBroker {
        if (!this._identityBroker) {
            throw new Error("Identity broker not initialized");
        }
        return this._identityBroker;
    }

    private static _resourceBroker?: ResourceBroker;

    public static get resourceBroker(): ResourceBroker {
        if (!this._resourceBroker) {
            throw new Error("Resource broker not initialized");
        }
        return this._resourceBroker;
    }

    private static _trackerBroker?: TrackerBroker;

    public static get trackerBroker(): TrackerBroker {
        if (!this._trackerBroker) {
            throw new Error("Tracker broker not initialized");
        }
        return this._trackerBroker;
    }

    private static _workerBroker?: WorkerBroker;

    public static get workerBroker(): WorkerBroker {
        if (!this._workerBroker) {
            throw new Error("Worker broker not initialized");
        }
        return this._workerBroker;
    }

    private static _taskBroker?: TaskBroker;

    public static get taskBroker(): TaskBroker {
        if (!this._taskBroker) {
            throw new Error("Task broker not initialized");
        }
        return this._taskBroker;
    }

    private static _toolBroker?: ToolBroker;

    public static get toolBroker(): ToolBroker {
        if (!this._toolBroker) {
            throw new Error("Tool broker not initialized");
        }
        return this._toolBroker;
    }

    public static async reset(options?: {mode?: BrokerMode}) {
        const mode = options?.mode ?? (Configuration.BrokerMode || "in-memory") as BrokerMode;
        if (this._channelBroker) {
            await this._channelBroker.destroy();
        }
        if (this._documentRepositoryBroker) {
            await this._documentRepositoryBroker.destroy();
        }

        if (this._identityBroker) {
            await this._identityBroker.destroy();
        }

        if (this._resourceBroker) {
            await this._resourceBroker.destroy();
        }
        if (this._trackerBroker) {
            await this._trackerBroker.destroy();
        }
        if (this._toolBroker) {
            await this._toolBroker.destroy();
        }
        if (this._workerBroker) {
            await this._workerBroker.destroy();
        }
        if (this._taskBroker) {
            await this._taskBroker.destroy();
        }

        this._channelBroker = await ChannelBroker.create({ mode });
        this._documentRepositoryBroker = await DocumentRepositoryBroker.create({ mode });
        this._identityBroker = IdentityBroker.create();
        this._resourceBroker = await ResourceBroker.create({ mode });
        this._trackerBroker = await TrackerBroker.create({ mode });
        this._toolBroker = await ToolBroker.create({ mode });
        this._workerBroker = await WorkerBroker.create({ mode });
        this._taskBroker = await TaskBroker.create({ mode });
    }

    public static async init(options?: { mode?: BrokerMode }): Promise<void> {
        Logger.getInstance("BrokerManager").debug(`init() called with options ${JSON.stringify(options)}`);
        const mode = options?.mode ?? (Configuration.BrokerMode || "in-memory") as BrokerMode;
        Logger.getInstance("BrokerManager").debug(`init() creating brokers with mode: ${mode}`)

        if (!this._channelBroker) {
            this._channelBroker = await ChannelBroker.create({ mode });
        }
        if (!this._documentRepositoryBroker) {
            this._documentRepositoryBroker = await DocumentRepositoryBroker.create({ mode });
        }
        if (!this._identityBroker) {
            this._identityBroker = IdentityBroker.create();
        }
        if (!this._resourceBroker) {
            this._resourceBroker = await ResourceBroker.create({ mode });
        }
        if (!this._trackerBroker) {
            this._trackerBroker = await TrackerBroker.create({ mode });
        }
        if (!this._toolBroker) {
            this._toolBroker = await ToolBroker.create({ mode });
        }
        if (!this._workerBroker) {
            this._workerBroker = await WorkerBroker.create({ mode })
        }
        if (!this._taskBroker) {
            this._taskBroker = await TaskBroker.create({ mode });    
        }        
    }
}

