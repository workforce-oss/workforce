import { BaseConfig, ChannelConfig, CredentialConfig, DocumentationConfig, ResourceConfig, TaskConfig, ToolConfig, TrackerConfig, WorkerConfig } from "workforce-core/model";


export class CustomNodeData<T extends BaseConfig> {
    inputs?: string[];
    outputs?: string[];
    config: T;
    constructor(config: T) {
        this.config = config;
    }
    setProperty(key: string, value: any) {
        if (this.config.hasOwnProperty(key)) {
            Object.assign(this.config, { [key]: value });
        }
    };
    addInputProperty(key: string, value: string) {
        if (!this.config.hasOwnProperty("inputs")) {
            throw new Error("Cannot add input to node without inputs");
        }
        if (!(this.config as TaskConfig).inputs) {
            (this.config as TaskConfig).inputs = {};
        }
        Object.assign((this.config as TaskConfig).inputs, { [key]: value });
    }
    renameTaskInputProperty(oldKey: string, newKey: string) {
        if (!this.config.hasOwnProperty("inputs")) {
            throw new Error("Cannot rename input to node without inputs");
        }
        if (!(this.config as TaskConfig).inputs) {
            (this.config as TaskConfig).inputs = {};
        }
        const value = (this.config as TaskConfig).inputs[oldKey];
        delete (this.config as TaskConfig).inputs[oldKey];
        Object.assign((this.config as TaskConfig).inputs, { [newKey]: value });
    }
    deleteInputProperty(key: string) {
        if (!this.config.hasOwnProperty("inputs")) {
            throw new Error("Cannot delete input from node without inputs");
        }
        if (!(this.config as TaskConfig).inputs) {
            (this.config as TaskConfig).inputs = {};
        }
        delete (this.config as TaskConfig).inputs[key];
    }

    modifyInputProperty(key: string, value: string) {
        if (!this.config.hasOwnProperty("inputs")) {
            throw new Error("Cannot modify input from node without inputs");
        }
        if (!(this.config as TaskConfig).inputs) {
            (this.config as TaskConfig).inputs = {};
        }
        Object.assign((this.config as TaskConfig).inputs, { [key]: value });
    }

    addOutput(output: string) {
        if (!this.config.hasOwnProperty("outputs")) {
            throw new Error("Cannot add output to node without outputs");
        }
        if (!(this.config as TaskConfig).outputs) {
            (this.config as TaskConfig).outputs = [];
        }
        (this.config as TaskConfig).outputs.push(output);
    }

    deleteOutput(output: string) {
        if (!this.config.hasOwnProperty("outputs")) {
            throw new Error("Cannot delete output from node without outputs");
        }
        if (!(this.config as TaskConfig).outputs) {
            (this.config as TaskConfig).outputs = [];
        }
        const index = (this.config as TaskConfig).outputs.indexOf(output);
        if (index > -1) {
            (this.config as TaskConfig).outputs.splice(index, 1);
        }
    }


}

export class NodeDataFactory {
    public static create<T extends BaseConfig>(config: T): CustomNodeData<T> {
        switch (config.type) {
            case "channel":
                return this.createChannel(config as ChannelConfig) as CustomNodeData<T>;
            // case "credential":
            //     return this.createCredential(config as CredentialConfig) as CustomNodeData<T>;
            case "documentation":
                return this.createDocumentation(config as DocumentationConfig) as CustomNodeData<T>;
            case "resource":
                return this.createResource(config as ResourceConfig) as CustomNodeData<T>;
            case "task":
                return this.createTask(config as TaskConfig) as CustomNodeData<T>;
            case "tool":
                return this.createTool(config as ToolConfig) as CustomNodeData<T>;
            case "tracker":
                return this.createTracker(config as TrackerConfig) as CustomNodeData<T>;
            case "worker":
                return this.createWorker(config as WorkerConfig) as CustomNodeData<T>;
        }

    }

    public static createChannel(config: ChannelConfig): CustomNodeData<ChannelConfig> {
        const data = new CustomNodeData<ChannelConfig>(config);
        data.inputs = [
            "in",
        ];
        data.outputs = [
            "ref"
        ];
        return data;
    }

    public static createCredential(config: CredentialConfig): CustomNodeData<CredentialConfig> {
        const data = new CustomNodeData<CredentialConfig>(config);
        data.inputs = [];
        data.outputs = [
            "data"
        ];
        return data;
    }

    public static createDocumentation(config: DocumentationConfig): CustomNodeData<DocumentationConfig> {
        const data = new CustomNodeData<DocumentationConfig>(config);
        data.inputs = [];
        data.outputs = [
            "ref"
        ];
        return data;
    }

    static createResource(config: ResourceConfig): CustomNodeData<ResourceConfig> {
        const data = new CustomNodeData<ResourceConfig>(config);
        data.inputs = [
            "in",
        ];
        data.outputs = [
            "data"
        ];
        return data;
    }

    static createTask(config: TaskConfig): CustomNodeData<TaskConfig> {
        const data = new CustomNodeData<TaskConfig>(config);
        data.inputs = [
            "documentation",
            "defaultChannel",
            "tracker",
            "tools",
            "triggers",
        ];
        data.outputs = [
            "outputs",
            "subtasks",
        ];
        return data;
    }

    static createTool(config: ToolConfig): CustomNodeData<ToolConfig> {
        const data = new CustomNodeData<ToolConfig>(config);
        data.inputs = [
            "channel",
        ];
        data.outputs = [
            "ref",
            "output",
        ];
        return data;
    }

    static createTracker(config: TrackerConfig): CustomNodeData<TrackerConfig> {
        const data = new CustomNodeData<TrackerConfig>(config);
        data.inputs = [
            "in",
        ];
        data.outputs = [
            "ticket"
        ];
        return data;
    }

    static createWorker(config: WorkerConfig): CustomNodeData<WorkerConfig> {
        const data = new CustomNodeData<WorkerConfig>(config);
        data.inputs = [
        ];
        data.outputs = [
        ];
        return data;
    }
}