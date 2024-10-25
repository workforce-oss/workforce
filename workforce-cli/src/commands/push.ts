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

    console.log("Pushing data to Workforce");
    console.log(`API URL: ${apiUrl}`);
    console.log(`Base Path: ${basePath}`);

    WorkforceAPIClient.init({
        accessToken,
        baseUrl: apiUrl,
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
            const response = await api.create(role, {orgId: role.orgId}).catch((e) => {
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
            const response = await api.create(skill, {orgId}).catch((e) => {
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

            const api = WorkforceAPIClient.CredentialAPI;
            console.log({
                name: credential.name,
                type: credential.type,
                orgId: credential.orgId,
            });
            const response = await api.create(credential, {orgId}).catch((e) => {
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

            const api = WorkforceAPIClient.WorkerAPI;

            const response = await api.create(worker, {orgId}).catch((e) => {
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

            const api = WorkforceAPIClient.DocumentRepositoryAPI;
            const response = await api.create(docRepo, {orgId}).catch((e) => {
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
            const errors = validateFlowSchema(flow);

            if (errors.length > 0) {
                for (const error of errors) {
                    console.log(error.message);
                }
                return;
            }

            const api = WorkforceAPIClient.FlowAPI;
            const response = await api.create(flow, {orgId}).catch((e) => {
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
