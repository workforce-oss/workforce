import { Resource, TaskExecution } from "workforce-core";
import { ChannelAPI, ChannelMessageAPI, ChannelSessionAPI, ChannelSubResourceCallOptions } from "./api/channel_api.js";
import { CredentialAPI } from "./api/credential_api.js";
import { DocumentRepositoryAPI } from "./api/document_repository_api.js";
import { DocumentationAPI } from "./api/documentation_api.js";
import { FlowAPI } from "./api/flow_api.js";
import { FlowSubResourceCallOptions } from "./api/flow_api.subresource.js";
import { HumanWorkerSocketAPI } from "./api/human_worker_socket_api.js";
import { NativeChatSocketAPI } from "./api/native_chat_socket_api.js";
import { OrgAPI } from "./api/org_api.js";
import { OrgSubResourceCallOptions } from "./api/org_api.subresource.js";
import { OrgUserAPI } from "./api/org_user_api.js";
import { ProspectAdminAPI } from "./api/prospect_admin_api.js";
import { ProspectAPI } from "./api/prospect_api.js";
import { ResourceAPI, ResourceSubResourceCallOptions, ResourceVersionAPI, ResourceWriteAPI } from "./api/resource_api.js";
import { SkillAPI } from "./api/skill_api.js";
import { StorageAPI } from "./api/storage_api.js";
import { TaskAPI } from "./api/task_api.js";
import { TaskExecutionAPI, TaskExecutionChannelMessageAPI, TaskExecutionSubResourceCallOptions, TaskExecutionToolRequestAPI, TaskExecutionWorkerChatSessionAPI, TaskExecutionWorkRequestAPI } from "./api/task_execution_api.js";
import { TaskExecutionWatchAPI } from "./api/task_execution_watch_api.js";
import { UserAPI } from "./api/user_api.js";
import { WorkerAPI, WorkerSubResourceCallOptions, WorkerWorkRequestAPI } from "./api/worker_api.js";
import { TrackerSubResourceCallOptions } from "./api/tracker_api.js";

export { RestApi } from "./api/base/rest_api.js";

export { NativeChatSocketAPI } from "./api/native_chat_socket_api.js";
export { HumanWorkerSocketAPI } from "./api/human_worker_socket_api.js";
export { TaskExecutionWatchAPI } from "./api/task_execution_watch_api.js";

export type { TaskExecutionAPI } from "./api/task_execution_api.js";

interface WorkforceAPITypes {
    "org": OrgAPI;
    "orgs": OrgAPI;
    "flow": FlowAPI;
    "flows": FlowAPI;
    "worker": WorkerAPI;
    "workers": WorkerAPI;
    "credential": CredentialAPI;
    "credentials": CredentialAPI;
    "user": UserAPI;
    "users": UserAPI;
    "org-user": OrgUserAPI;
    "org-users": OrgUserAPI;
    "document-repository": DocumentRepositoryAPI;
    "document-repositories": DocumentRepositoryAPI;
    "channel": ChannelAPI;
    "channels": ChannelAPI;
    "channel-session": ChannelSessionAPI;
    "channel-sessions": ChannelSessionAPI;
    "channel-message": ChannelMessageAPI;
    "channel-messages": ChannelMessageAPI;
    "task": TaskAPI;
    "tasks": TaskAPI;
    "task-execution": TaskExecutionAPI;
    "task-executions": TaskExecutionAPI;
    "resource": ResourceAPI;
    "resources": ResourceAPI;
    "resource-version": ResourceVersionAPI;
    "resource-versions": ResourceVersionAPI;
    "resource-write": ResourceWriteAPI;
    "resource-writes": ResourceWriteAPI;
    "documentation": DocumentationAPI;

}

export type WorkforceAPI =
    ChannelAPI |
    ChannelSessionAPI |
    ChannelMessageAPI |
    CredentialAPI |
    DocumentRepositoryAPI |
    DocumentationAPI |
    FlowAPI |
    OrgUserAPI |
    ResourceAPI |
    ResourceVersionAPI |
    ResourceWriteAPI |
    SkillAPI |
    TaskAPI |
    TaskExecutionAPI |
    TaskExecutionChannelMessageAPI |
    TaskExecutionToolRequestAPI |
    TaskExecutionWorkRequestAPI |
    TaskExecutionWorkerChatSessionAPI |
    UserAPI |
    WorkerAPI |
    WorkerWorkRequestAPI;

export type APICallOptions = 
    ChannelSubResourceCallOptions &
    FlowSubResourceCallOptions &
    OrgSubResourceCallOptions &
    ResourceSubResourceCallOptions &
    TaskExecutionSubResourceCallOptions &
    TrackerSubResourceCallOptions &
    WorkerSubResourceCallOptions;


export class WorkforceAPIClient {
    static accessToken?: string;
    static baseSocketUrl?: string;
    static baseUrl?: string;
    static basePath?: string;
    

    static unauthorizedCallBack?: () => void;

    static init(options: { accessToken?: string, baseUrl?: string, baseSocketUrl?: string, basePath?: string, unauthorizedCallBack?: () => void }) {
        WorkforceAPIClient.accessToken = options.accessToken;
        WorkforceAPIClient.baseUrl = options.baseUrl;
        WorkforceAPIClient.baseSocketUrl = options.baseSocketUrl;
        WorkforceAPIClient.basePath = options.basePath;
        WorkforceAPIClient.unauthorizedCallBack = options.unauthorizedCallBack;
    }

    static setAccessToken(accessToken: string) {
        WorkforceAPIClient.accessToken = accessToken;
    }

    static get WorkerAPI(): WorkerAPI {
        return WorkerAPI.getInstance({
            accessToken: WorkforceAPIClient.accessToken,
            baseUrl: WorkforceAPIClient.baseUrl,
            basePath: WorkforceAPIClient.basePath,
            unAuthorizedCallBack: WorkforceAPIClient.unauthorizedCallBack
        });
    }

    static get CredentialAPI(): CredentialAPI {
        return CredentialAPI.getInstance({
            accessToken: WorkforceAPIClient.accessToken,
            baseUrl: WorkforceAPIClient.baseUrl,
            basePath: WorkforceAPIClient.basePath,
            unAuthorizedCallBack: WorkforceAPIClient.unauthorizedCallBack
        });
    }

    static get DocumentRepositoryAPI(): DocumentRepositoryAPI {
        return DocumentRepositoryAPI.getInstance({
            accessToken: WorkforceAPIClient.accessToken,
            baseUrl: WorkforceAPIClient.baseUrl,
            basePath: WorkforceAPIClient.basePath,
            unAuthorizedCallBack: WorkforceAPIClient.unauthorizedCallBack,
        });
    }

    static get FlowAPI(): FlowAPI {
        return FlowAPI.getInstance({
            accessToken: WorkforceAPIClient.accessToken,
            baseUrl: WorkforceAPIClient.baseUrl,
            basePath: WorkforceAPIClient.basePath,
            unAuthorizedCallBack: WorkforceAPIClient.unauthorizedCallBack
        });
    }

    static get ChannelAPI(): ChannelAPI {
        return ChannelAPI.getInstance({
            accessToken: WorkforceAPIClient.accessToken,
            baseUrl: WorkforceAPIClient.baseUrl,
            basePath: WorkforceAPIClient.basePath,
            unAuthorizedCallBack: WorkforceAPIClient.unauthorizedCallBack
        });
    }

    static get DocumentationAPI(): DocumentationAPI {
        return DocumentationAPI.getInstance({
            accessToken: WorkforceAPIClient.accessToken,
            baseUrl: WorkforceAPIClient.baseUrl,
            basePath: WorkforceAPIClient.basePath,
            unAuthorizedCallBack: WorkforceAPIClient.unauthorizedCallBack
        });
    }

    static get ResourceAPI(): ResourceAPI {
        return ResourceAPI.getInstance({
            accessToken: WorkforceAPIClient.accessToken,
            baseUrl: WorkforceAPIClient.baseUrl,
            basePath: WorkforceAPIClient.basePath,
            unAuthorizedCallBack: WorkforceAPIClient.unauthorizedCallBack
        });
    }

    static get TaskAPI(): TaskAPI {
        return TaskAPI.getInstance({
            accessToken: WorkforceAPIClient.accessToken,
            baseUrl: WorkforceAPIClient.baseUrl,
            basePath: WorkforceAPIClient.basePath,
            unAuthorizedCallBack: WorkforceAPIClient.unauthorizedCallBack
        });
    }

    static HumanWorkerSocketAPI(path: string, anonymous?: boolean): HumanWorkerSocketAPI {
        return HumanWorkerSocketAPI.getInstance({
            accessToken: WorkforceAPIClient.accessToken,
            baseUrl: WorkforceAPIClient.baseSocketUrl,
            basePath: WorkforceAPIClient.basePath,
            path: path,
            anonymous: anonymous,
            unAuthorizedCallBack: WorkforceAPIClient.unauthorizedCallBack
        });
    }

    static NativeChatSocketAPI(path: string, anonymous?: boolean): NativeChatSocketAPI {
        return NativeChatSocketAPI.getInstance({
            accessToken: WorkforceAPIClient.accessToken,
            baseUrl: WorkforceAPIClient.baseSocketUrl,
            basePath: WorkforceAPIClient.basePath,
            path: path,
            anonymous: anonymous,
            unAuthorizedCallBack: WorkforceAPIClient.unauthorizedCallBack
        });
    }

    static get OrgAPI(): OrgAPI {
        return OrgAPI.getInstance({
            accessToken: WorkforceAPIClient.accessToken,
            baseUrl: WorkforceAPIClient.baseUrl,
            basePath: WorkforceAPIClient.basePath,
            unAuthorizedCallBack: WorkforceAPIClient.unauthorizedCallBack
        });
    }

    static get UserAPI(): UserAPI {
        return UserAPI.getInstance({
            accessToken: WorkforceAPIClient.accessToken,
            baseUrl: WorkforceAPIClient.baseUrl,
            basePath: WorkforceAPIClient.basePath,
            unAuthorizedCallBack: WorkforceAPIClient.unauthorizedCallBack
        });
    }

    static get OrgUserAPI(): OrgUserAPI {
        return OrgUserAPI.getInstance({
            accessToken: WorkforceAPIClient.accessToken,
            baseUrl: WorkforceAPIClient.baseUrl,
            basePath: WorkforceAPIClient.basePath,
            unAuthorizedCallBack: WorkforceAPIClient.unauthorizedCallBack
        });
    }

    static get ProspectAdminAPI(): ProspectAdminAPI {
        return ProspectAdminAPI.getInstance({
            accessToken: WorkforceAPIClient.accessToken,
            baseUrl: WorkforceAPIClient.baseUrl,
            unAuthorizedCallBack: WorkforceAPIClient.unauthorizedCallBack
        });
    }

    static get ProspectAPI(): ProspectAPI {
        return ProspectAPI.getInstance(WorkforceAPIClient.basePath, WorkforceAPIClient.baseUrl);
    }

    static get SkillAPI(): SkillAPI {
        return SkillAPI.getInstance({
            accessToken: WorkforceAPIClient.accessToken,
            baseUrl: WorkforceAPIClient.baseUrl,
            basePath: WorkforceAPIClient.basePath,
            unAuthorizedCallBack: WorkforceAPIClient.unauthorizedCallBack
        });
    }

    static get StorageAPI(): StorageAPI {
        return StorageAPI.getInstance({
            accessToken: WorkforceAPIClient.accessToken,
            baseUrl: WorkforceAPIClient.baseUrl,
            unAuthorizedCallBack: WorkforceAPIClient.unauthorizedCallBack
        });
    }

    static get TaskExecutionAPI(): TaskExecutionAPI {
        return TaskExecutionAPI.getInstance({
            accessToken: WorkforceAPIClient.accessToken,
            baseUrl: WorkforceAPIClient.baseUrl,
            basePath: WorkforceAPIClient.basePath,
            unAuthorizedCallBack: WorkforceAPIClient.unauthorizedCallBack
        });
    }

    static TaskExecutionWatchAPI(path: string): TaskExecutionWatchAPI {
        return TaskExecutionWatchAPI.getInstance({
            accessToken: WorkforceAPIClient.accessToken,
            baseUrl: WorkforceAPIClient.baseSocketUrl,
            basePath: WorkforceAPIClient.basePath,
            path: path,
            unAuthorizedCallBack: WorkforceAPIClient.unauthorizedCallBack
        });
    }
}
