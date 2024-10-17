import { randomUUID } from "crypto";
import { ChannelDb } from "../../src/objects/channel/db.js";
import { ChannelConfig } from "../../src/objects/channel/model.js";
import { FlowDb } from "../../src/objects/flow/db.js";
import { FlowConfig } from "../../src/objects/flow/model.js";
import { TaskDb } from "../../src/objects/task/db.js";
import { TaskConfig } from "../../src/objects/task/model.js";
import { ResourceDb } from "../../src/objects/resource/db.js";
import { ResourceConfig, ResourceObject } from "../../src/objects/resource/model.js";
import { ToolDb } from "../../src/objects/tool/db.js";
import { ToolConfig } from "../../src/objects/tool/model.js";
import { TrackerConfig } from "../../src/objects/tracker/model.js";
import { TrackerDb } from "../../src/objects/tracker/db.js";
import { WorkerDb } from "../../src/objects/worker/db.js";
import { WorkerConfig } from "../../src/objects/worker/model.js";
import { TaskExecutionDb } from "../../src/objects/task/db.task_execution.js";
import { ChannelSessionDb } from "../../src/objects/channel/db.session.js";
import { ChannelMessageDb } from "../../src/objects/channel/db.message.js";
import { Sequelize } from "sequelize-typescript";
import { Outbox } from "../../src/objects/base/outbox.js";
import { ToolRequestDb } from "../../src/objects/tool/db.tool_request.js";
import { TicketRequestDb } from "../../src/objects/tracker/db.ticket_request.js";
import { WorkRequestDb } from "../../src/objects/worker/db.work_request.js";
import { ResourceVersionDb } from "../../src/objects/resource/db.resource_version.js";
import { ResourceWriteDb } from "../../src/objects/resource/db.resource_write.js";
import { CredentialDb } from "../../src/objects/credential/db.js";
import { WorkerChatSessionDb } from "../../src/objects/worker/db.worker_chat_session.js";
import { WorkerChatMessageDb } from "../../src/objects/worker/db.worker_chat_message.js";
import { DocumentationDb } from "../../src/objects/documentation/db.js";
import { DocumentRepositoryDb } from "../../src/objects/document_repository/db.js";
import { DocumentDb } from "../../src/objects/document_repository/db.document.js";
import { DocumentationConfig } from "../../src/objects/documentation/model.js";
import { DocumentRepositoryConfig } from "../../src/model.js";
import { DocumentRelationDb } from "../../src/objects/documentation/db.document_relation.js";
import { UserDb } from "../../src/identity/db.user.js";
import { OrgDb } from "../../src/identity/db.org.js";
import { SpaceDb } from "../../src/identity/db.space.js";
import { TaskExecutionUserDb } from "../../src/objects/task/db.task_execution_users.js";
import { OrgUserRelationDb } from "../../src/identity/db.org_user.js";
import { SpaceUserRelationDb } from "../../src/identity/db.space_user.js";

// export const dockerConnectionString = "postgres://testuser:password@localhost:5492/app";
export const dockerConnectionString = "sqlite::memory:";

export function newDb(): Sequelize {
    return new Sequelize(dockerConnectionString, {
        models: [
            Outbox,
            CredentialDb,
            FlowDb,
            ChannelDb,
            ChannelSessionDb,
            ChannelMessageDb,
            DocumentationDb,
            DocumentRelationDb,
            DocumentRepositoryDb,
            DocumentDb,
            ResourceDb,
            ResourceVersionDb,
            ResourceWriteDb,
            TaskDb,
            TaskExecutionDb,
            TaskExecutionUserDb,
            ToolDb,
            ToolRequestDb,
            TrackerDb,
            TicketRequestDb,
            WorkerDb,
            WorkRequestDb,
            WorkerChatSessionDb,
            WorkerChatMessageDb,
            UserDb,
            OrgDb,
            OrgUserRelationDb,
            SpaceDb,
            SpaceUserRelationDb,
        ],
        logging: false,

    });
}

export async function createOrg(orgId: string): Promise<OrgDb> {
    const orgDb = await OrgDb.create({
        id: orgId,
        name: "test-org",
        description: "test",
        status: "active",
    });
    return orgDb;
}

export async function createUser(userId: string, orgId: string, roles?: string[]): Promise<UserDb> {
    const userDb = await UserDb.create({
        id: userId,
        username: "test-user",
        email: "test@example.com",
        firstName: "test",
        lastName: "user",
    });
    if (roles) {
        for (const role of roles) {
            await OrgUserRelationDb.create({
                orgId: orgId,
                userId: userId,
                role: role,
            });
        }
    } else {
        await OrgUserRelationDb.create({
            orgId: orgId,
            userId: userId,
            role: "admin",
        });
    }
    return userDb;
}

export function createBasicFlowConfig(orgId: string): FlowConfig {
    return {
        name: "test-flow",
        description: "test",
        orgId: orgId,
        status: "active",
    };
}

export async function createBasicCredential(orgId: string): Promise<CredentialDb> {
    const credentialDb = await CredentialDb.create({
        name: `test-credential-${orgId}`,
        description: "test",
        type: "credential",
        subtype: "mock",
        orgId: orgId,
    });
    return credentialDb;
}

export async function createBasicFlow(orgId: string): Promise<FlowDb> {
    const flowConfig = createBasicFlowConfig(orgId);

    const flowDb = await new FlowDb().loadModel(flowConfig);
    await flowDb.save();
    flowConfig.id = flowDb.id;
    return flowDb;
}

export function createBasicChannelConfig(orgId: string, flowId: string, variables?: Record<string, any>): ChannelConfig {
    return {
        name: "test-channel",
        description: "test",
        type: "channel",
        subtype: "mock",
        orgId: orgId,
        flowId: flowId,
        variables: variables ?? {
            output: "mock-channel-output",
        },
    };
}

export async function createBasicDocumentationConfig(orgId: string, name: string): Promise<DocumentationConfig> {
    const documentRepositoryConfig: DocumentRepositoryConfig = {
        name: "test-document-repository",
        description: "test",
        type: "document_repository",
        subtype: "internal-document-repository",
        orgId: orgId,
        variables: {}
    };
    const documentatRepositoryDb = new DocumentRepositoryDb().loadModel(documentRepositoryConfig);
    await documentatRepositoryDb.save();

    const documentDb = await DocumentDb.create({
        repositoryId: documentatRepositoryDb.id,
        name: name,
        format: "markdown",
        location: "test",
        status: "indexed"
    });

    return {
        name: name,
        repository: "test-document-repository",
        description: "test",
        type: "documentation",
        subtype: "default-documentation",
        orgId: orgId,
        documents: [documentDb.name],
    };
}

export async function createBasicChannel(orgId: string, flowId: string, variables?: Record<string, any>): Promise<ChannelDb> {
    const channelConfig = createBasicChannelConfig(orgId, flowId, variables);

    const channelDb = new ChannelDb().loadModel(channelConfig);
    await channelDb.save();
    channelConfig.id = channelDb.id;
    return channelDb;
}

export async function createChannelSession(channelId: string, taskExecutionId: string): Promise<ChannelSessionDb> {
    const channelSessionDb = await ChannelSessionDb.create({
        channelId: channelId,
        status: "started",
        taskExecutionId,
    });
    return channelSessionDb;
}

export async function createChannelMessage(channelId: string, taskExecutionId: string): Promise<ChannelMessageDb> {
    const channelMessageDb = await ChannelMessageDb.create({
        channelId: channelId,
        taskExecutionId,
        status: "success",
    });
    return channelMessageDb;
}

export function createBasicTaskConfig(orgId: string, flowId: string, variables?: Record<string, any>, name?: string): TaskConfig {
    return {
        name: name ?? "test-task",
        description: "test",
        type: "task",
        subtype: "mock",
        orgId: orgId,
        flowId: flowId,
        documentation: [],
        inputs: {},
        outputs: [],
        triggers: [],
        variables: variables ?? {
            prompt_template: "test-prompt",
            system_message_template: "test-system-message",
        },
    };
}

export async function createBasicTask(orgId: string, flowId: string, variables?: Record<string, any>, name?: string, includeFlow?: boolean): Promise<TaskDb> {
    const taskConfig = createBasicTaskConfig(orgId, flowId, variables, name);
    const taskDb = new TaskDb().loadModel(taskConfig);
    await taskDb.save();
    taskConfig.id = taskDb.id;

    if (includeFlow) {
        return await TaskDb.findByPk(taskDb.id, {
            include: [
                {
                    model: FlowDb,
                    attributes: ["id", "name", "description"],
                }]
        }) ?? taskDb;
    }

    return taskDb;
}

export async function createTaskExecution(orgId: string, taskId: string): Promise<TaskExecutionDb> {
    const taskExecutionId = randomUUID();
    const taskExecutionDb = await TaskExecutionDb.create({
        id: taskExecutionId,
        orgId: orgId,
        taskId: taskId,
        users: [new TaskExecutionUserDb({ userId: randomUUID(), taskExecutionId: taskExecutionId })],
        status: "success",
        timestamp: Date.now(),
    });
    return taskExecutionDb;
}

export function createBasicResourceConfig(orgId: string, flowId: string, variables?: Record<string, any>): ResourceConfig {
    return {
        name: "test-resource",
        description: "test",
        type: "resource",
        subtype: "mock",
        orgId: orgId,
        flowId: flowId,
        variables: variables ?? {
            output: {
                content: "mock-resource-output-content",
                name: "mock-resource-output-name",
            } as ResourceObject,
        },
    };
}

export async function createBasicResource(orgId: string, flowId: string, variables?: Record<string, any>): Promise<ResourceDb> {
    const resourceConfig = createBasicResourceConfig(orgId, flowId, variables);
    const resourceDb = new ResourceDb().loadModel(resourceConfig);
    await resourceDb.save();
    resourceConfig.id = resourceDb.id;
    return resourceDb;
}

export function createBasicToolConfig(orgId: string, flowId: string, variables?: Record<string, any>): ToolConfig {
    return {
        name: "test-tool",
        description: "test",
        type: "tool",
        subtype: "mock",
        orgId: orgId,
        flowId: flowId,
        variables: variables ?? {
            output: "mock-tool-output",
        },
    };
}

export async function createBasicTool(orgId: string, flowId: string, variables?: Record<string, any>): Promise<ToolDb> {
    const toolConfig = createBasicToolConfig(orgId, flowId, variables);
    const toolDb = new ToolDb().loadModel(toolConfig);
    await toolDb.save();
    toolConfig.id = toolDb.id;
    return toolDb;
}

export function createBasicTrackerConfig(orgId: string, flowId: string, variables?: Record<string, any>): TrackerConfig {
    return {
        name: "test-tracker",
        description: "test",
        type: "tracker",
        subtype: "mock",
        orgId: orgId,
        flowId: flowId,
        variables: variables ?? {
            output: "mock-tracker-output",
        },
    };
}

export async function createBasicTracker(orgId: string, flowId: string, variables?: Record<string, any>): Promise<TrackerDb> {
    const trackerConfig = createBasicTrackerConfig(orgId, flowId, variables);
    const trackerDb = new TrackerDb().loadModel(trackerConfig);
    await trackerDb.save();
    trackerConfig.id = trackerDb.id;
    return trackerDb;
}

export function createBasicWorkerConfig(orgId: string, variables?: Record<string, any>): WorkerConfig {
    return {
        name: "test-worker",
        description: "test",
        type: "worker",
        subtype: "mock",
        orgId: orgId,
        wipLimit: 10,
        skills: [],
        variables: variables ?? {
            output: "mock-worker-output",
        },
    };
}

export async function createBasicWorker(orgId: string, variables?: Record<string, any>): Promise<WorkerDb> {
    const workerConfig = createBasicWorkerConfig(orgId, variables);
    const workerDb = new WorkerDb().loadModel(workerConfig);
    await workerDb.save();
    workerConfig.id = workerDb.id;
    return workerDb;
}
