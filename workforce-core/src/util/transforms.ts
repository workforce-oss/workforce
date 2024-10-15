import { CredentialConfig, ObjectSubtype, WorkerConfig, DocumentRepositoryConfig, DocumentRepositoryType, FlowConfig } from "../model.js";
import { ChannelType } from "../objects/channel/model.js";
import { DocumentationType } from "../objects/documentation/model.js";
import { ResourceType } from "../objects/resource/model.js";
import { TaskType } from "../objects/task/model.js";
import { ToolType } from "../objects/tool/model.js";
import { TrackerType } from "../objects/tracker/model.js";
import { WorkerType } from "../objects/worker/model.js";

export function formatCredentials(credentials: CredentialConfig[], orgId: string) {
    for (const credential of credentials) {
        credential.orgId = orgId;
        credential.subtype = credential.type as ObjectSubtype;
        credential.type = "credential";
    }
}

export function formatWorkers(workers: WorkerConfig[], orgId: string) {
	for (const worker of workers) {
        worker.orgId = orgId;
		worker.subtype = worker.type as WorkerType;
		worker.type = "worker";
	}
}

export function formatDocumentRepositories(repositories: DocumentRepositoryConfig[], orgId: string) {
	for (const repository of repositories) {
		repository.orgId = orgId;
		repository.subtype = repository.type as DocumentRepositoryType;
		repository.type = "document_repository";
	}
}

export function formatFlow(flow: FlowConfig, orgId: string) {
	flow.orgId = orgId;
	if (flow.tasks) {
		for (const task of flow.tasks) {
			task.orgId = orgId;
			task.subtype = task.type as TaskType;
			task.type = "task";
		}
	}
    if (flow.resources) {
        for (const resource of flow.resources) {
            resource.orgId = orgId;
            resource.subtype = resource.type as ResourceType;
            resource.type = "resource";
        }
    }
    if (flow.channels) {
        for (const channel of flow.channels) {
            channel.orgId = orgId;
            channel.subtype = channel.type as ChannelType;
            channel.type = "channel";
        }
    }
    if (flow.documentation) {
        for (const doc of flow.documentation) {
            doc.orgId = orgId;
            doc.subtype = doc.type as DocumentationType;
            doc.type = "documentation";
        }
    }
    if (flow.tools) {
        for (const tool of flow.tools) {
            tool.orgId = orgId;
            tool.subtype = tool.type as ToolType;
            tool.type = "tool";
        }
    }
    if (flow.trackers) {
        for (const tracker of flow.trackers) {
            tracker.orgId = orgId;
            tracker.subtype = tracker.type as TrackerType;
            tracker.type = "tracker";
        }
    }
}