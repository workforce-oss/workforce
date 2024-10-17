import * as fs from "fs";
import { WorkforceAPIClient } from "workforce-api-client";
import { ChannelType, CredentialConfig, DocumentRepositoryConfig, DocumentRepositoryType, DocumentationType, FlowConfig, ObjectSubtype, ResourceType, Skill, TaskType, ToolType, TrackerType, WorkerConfig, WorkerType, WorkforceOrg, WorkforceOrgUserRelation, WorkforceUser, validateFlowSchema } from "workforce-core/model";
import YAML from "yaml";
import { Auth } from "../auth/auth.js";
import { initApi } from "./base.js";
import { DocumentRepository } from "workforce-core";

export async function push(
	path: string,
	options: {
		api: string;
        orgId?: string;
	}
) {
	const authConfig = Auth.config();
	const accessToken = authConfig.auth?.accessToken;

	const data = parseData(path);

    const apiUrl = options.api || authConfig.apiUrl;
    if (!apiUrl) {
        console.error("Please provide an API URL.");
        return 
    }
    
    const basePath = apiUrl.split("/").slice(3).join("/");

    WorkforceAPIClient.init({
        accessToken,
        baseUrl: options.api,
        basePath
    });

    const orgId = options.orgId || authConfig.orgId;

    if (data.orgs && data.orgs.length > 0) {
        for (const org of data.orgs) {
            const api = WorkforceAPIClient.OrgAPI;
            const response = await api.create(org).catch((e) => {
                console.log(`Error creating org ${org.name}`);
                return undefined;
            });
            if (!response) {
                continue;
            }

            if (Array.isArray(response)) {
                for (const error of response) {
                    console.log(error.message);
                }
            } else {
                console.log("Org Pushed");
            }
        }
    }

    if (data.users && data.users.length > 0) {
        for (const user of data.users) {
            const api = WorkforceAPIClient.UserAPI;
            const response = await api.create(user).catch((e) => {
                console.log(`Error creating user ${user.username}`);
                return undefined;
            });
            if (!response) {
                continue;
            }
            if (Array.isArray(response)) {
                for (const error of response) {
                    console.log(error.message);
                }
            } else {
                console.log("User Pushed");
            }
        }
    }

    if (data.roles && data.roles.length > 0) {
        for (const role of data.roles) {
            const api = WorkforceAPIClient.OrgUserAPI;
            const response = await api.create(role).catch((e) => {
                console.log(`Error creating role ${role.role}`);
                return undefined;
            });
            if (!response) {
                continue;
            }

            if (Array.isArray(response)) {
                for (const error of response) {
                    console.log(error.message);
                }
            } else {
                console.log("Role Pushed");
            }
        }
    }

    if (data.skills && data.skills.length > 0) {
        for (const skill of data.skills) {
            if (!orgId) {
                console.log(`OrgId is required for skill ${skill.name}`);
                continue;
            }
            const api = WorkforceAPIClient.SkillAPI;
            skill.orgId = orgId;
            const response = await api.create(skill).catch((e) => {
                console.log(`Error creating skill ${skill.name}`);
                return undefined;
            });
            if (!response) {
                continue;
            }
            if (Array.isArray(response)) {
                for (const error of response) {
                    console.log(error);
                }
            } else {
                console.log("Skill Pushed");
            }
        }
    }

    if (data.credentials && data.credentials.length > 0) {
        for (const credential of data.credentials) {
            if (!orgId) {
                console.log(`OrgId is required for credential ${credential.name}`);
                continue;
            }
            credential.orgId = orgId;
            credential.subtype = credential.type as ObjectSubtype;
            credential.type = "credential";

            const api = WorkforceAPIClient.CredentialAPI;
            console.log({
                name: credential.name,
                type: credential.type,
                subtype: credential.subtype,
                orgId: credential.orgId,
            });
            const response = await api.create(credential).catch((e) => {
                console.log(`Error creating credential ${credential.name}`);
                return undefined;
            });
            if (!response) {
                continue;
            }
            if (Array.isArray(response)) {
                for (const error of response) {
                    console.log(error.message);
                }
            } else {
                console.log("Credential Pushed");
            }
        }
    }

    if (data.workers && data.workers.length > 0) {
        for (const worker of data.workers) {
            if (!orgId) {
                console.log(`OrgId is required for worker ${worker.name}`);
                continue;
            }
            worker.orgId = orgId;
            worker.subtype = worker.type as WorkerType;
            worker.type = "worker";

            const api = WorkforceAPIClient.WorkerAPI;

            const response = await api.create(worker).catch((e) => {
                console.log(`Error creating worker ${worker.name}`);
                return undefined;
            });

            if (!response) {
                continue;
            }

            if (Array.isArray(response)) {
                for (const error of response) {
                    console.log(error.message);
                }
                return;
            } else {
                console.log("Worker Pushed");
            }
        }
    }

    if (data.documentRepositories && data.documentRepositories.length > 0) {
        for (const docRepo of data.documentRepositories) {
            if (!orgId) {
                console.log(`OrgId is required for document repository ${docRepo.name}`);
                continue;
            }

            docRepo.orgId = orgId;
            docRepo.subtype = docRepo.type as DocumentRepositoryType;
            docRepo.type = "document_repository";
            const api = WorkforceAPIClient.DocumentRepositoryAPI;
            const response = await api.create(docRepo).catch((e) => {
                console.log(`Error creating document repository ${docRepo.name}`);
                return undefined;
            });
            if (!response) {
                continue;
            }
            if (Array.isArray(response)) {
                for (const error of response) {
                    console.log(error.message);
                }
            } else {
                console.log("Document Repository Pushed");
            }
        }
    }

    if (data.flows && data.flows.length > 0) {
        for (const flow of data.flows) {
            if (!orgId) {
                console.log(`OrgId is required for flow ${flow.name}`);
                continue;
            }
            flow.orgId = orgId;
            formatFlow(flow, orgId);
            const errors = validateFlowSchema(flow);

            if (errors.length > 0) {
                for (const error of errors) {
                    console.log(error.message);
                }
                return;
            }

            const api = WorkforceAPIClient.FlowAPI;
            const response = await api.create(flow).catch((e) => {
                console.log(`Error creating flow ${flow.name}`);
                return undefined;
            });
            if (!response) {
                continue;
            }
            if (Array.isArray(response)) {
                for (const error of response) {
                    console.log(error.message);
                }
            } else {
                console.log("Flow Pushed");
            }
        }
    }
}

function parseData(path: string): {
    orgs: WorkforceOrg[],
    users: WorkforceUser[],
    roles: WorkforceOrgUserRelation[],
    skills: Skill[],
    credentials: CredentialConfig[],
    workers: WorkerConfig[],
    documentRepositories: DocumentRepositoryConfig[],
    flows: FlowConfig[], 
     }  {
        const absolute = path.startsWith("/") || path.startsWith("~");
	const filePath =  absolute ? path : `${process.cwd()}/${path}`;
	const file = fs.readFileSync(filePath).toString();
    const sections = file.split("---");
    const data = {
        orgs: [],
        users: [],
        roles: [],
        skills: [],
        credentials: [],
        workers: [],
        documentRepositories: [],
        flows: [],
    };

    for (const section of sections) {
        const parsed = YAML.parse(section, {
            merge: true,
            schema: "core",
            prettyErrors: true,
        });
        if (!parsed) {
            continue;
        }
        if (parsed.orgs) {
            data.orgs = data.orgs.concat(parsed.orgs);
        }
        if (parsed.users) {
            data.users = data.users.concat(parsed.users);
        }
        if (parsed.roles) {
            data.roles = data.roles.concat(parsed.roles);
        }
        if (parsed.skills) {
            data.skills = data.skills.concat(parsed.skills);
        }
        if (parsed.credentials) {
            data.credentials = data.credentials.concat(parsed.credentials);
        }
        if (parsed.workers) {
            data.workers = data.workers.concat(parsed.workers);
        }
        if (parsed.documentRepositories) {
            data.documentRepositories = data.documentRepositories.concat(parsed.documentRepositories);
        }
        if (parsed.flows) {
            data.flows = data.flows.concat(parsed.flows);
        }
    }

    return data;
}

function formatFlow(flow: FlowConfig, orgId: string) {
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
