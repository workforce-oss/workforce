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
        varsFile?: string;
        dryRun?: boolean;
    }
) {
    // if path is a file, use parseFileData
    // else use parseDir
    // then pushData
    // if there is a varsFile, create a map of key value pairs
    if (!path) {
        console.error("Please provide a path to the data");
        return;
    }

    if (options.varsFile && !fs.existsSync(options.varsFile)) {
        console.error("Vars file does not exist");
        return;
    }

    const vars = createVarsMap(options.varsFile);
    const isDir = fs.lstatSync(path).isDirectory();
    if (isDir) {
        const data = parseDir(path, vars);
        await pushData(options, data);
    } else {
        const data = parseFileData(path, vars);
        await pushData(options, data);
    }
}

async function pushData(
    options: { api: string, orgId?: string, dryRun?: boolean },
    data: {
        orgs: WorkforceOrg[],
        users: WorkforceUser[],
        roles: WorkforceOrgUserRelation[],
        skills: Skill[],
        credentials: CredentialConfig[],
        workers: WorkerConfig[],
        documentRepositories: DocumentRepositoryConfig[],
        flows: FlowConfig[],
    }) {
    if (options.dryRun) {
        console.log("Dry Run Mode");
        console.log("Data to be pushed:");
        console.log(YAML.stringify(data));
        return;
    }
    const authConfig = Auth.config();
    const accessToken = authConfig.auth?.accessToken;

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
            const response = await api.create(role, { orgId: role.orgId }).catch((e) => {
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
            const response = await api.create(skill, { orgId }).catch((e) => {
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
            const response = await api.create(credential, { orgId }).catch((e) => {
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

            const response = await api.create(worker, { orgId }).catch((e) => {
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
            const response = await api.create(docRepo, { orgId }).catch((e) => {
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
            const response = await api.create(flow, { orgId }).catch((e) => {
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

function parseDir(path: string, vars?: Map<string, string>): {
    orgs: WorkforceOrg[],
    users: WorkforceUser[],
    roles: WorkforceOrgUserRelation[],
    skills: Skill[],
    credentials: CredentialConfig[],
    workers: WorkerConfig[],
    documentRepositories: DocumentRepositoryConfig[],
    flows: FlowConfig[],
} {
    const absolute = path.startsWith("/") || path.startsWith("~");
    const basePath = absolute ? path : `${process.cwd()}/${path}`;
    const data: {
        orgs: WorkforceOrg[],
        users: WorkforceUser[],
        roles: WorkforceOrgUserRelation[],
        skills: Skill[],
        credentials: CredentialConfig[],
        workers: WorkerConfig[],
        documentRepositories: DocumentRepositoryConfig[],
        flows: FlowConfig[],
    } = {
        orgs: [],
        users: [],
        roles: [],
        skills: [],
        credentials: [],
        workers: [],
        documentRepositories: [],
        flows: [],
    };
    // We will try different directory types and then parse files recursively

    // 1. orgs
    const orgsPath = `${basePath}/orgs`;
    parseRecursive(orgsPath, data.orgs, vars);
    // 2. users
    const usersPath = `${basePath}/users`;
    parseRecursive(usersPath, data.users, vars);
    // 3. roles
    const rolesPath = `${basePath}/roles`;
    parseRecursive(rolesPath, data.roles, vars);
    // 4. skills
    const skillsPath = `${basePath}/skills`;
    parseRecursive(skillsPath, data.skills, vars);
    // 5. credentials
    const credentialsPath = `${basePath}/credentials`;
    parseRecursive(credentialsPath, data.credentials, vars);
    // 6. workers
    const workersPath = `${basePath}/workers`;
    parseRecursive(workersPath, data.workers, vars);
    // 7. documentRepositories
    const documentRepositoriesPath = `${basePath}/documentRepositories`;
    parseRecursive(documentRepositoriesPath, data.documentRepositories, vars);
    // 8. flows
    const flowsPath = `${basePath}/flows`;
    parseFlowsDir(basePath, data.flows, vars);

    return data;
}

function createVarsMap(varsFile?: string): Map<string, string> | undefined {
    // vars file has a set of key value pairs
    // SLACK_APP_TOKEN=""
    // It replaces values in any file that look like {{SLACK_APP_TOKEN}}
    // lets store the keys as {{SLACK_APP_TOKEN}} and values without quotes

    if (!varsFile) {
        return undefined;
    }

    const absolute = varsFile.startsWith("/") || varsFile.startsWith("~");
    const varsPath = absolute ? varsFile : `${process.cwd()}/${varsFile}`;

    if (!fs.existsSync(varsPath)) {
        console.error("Vars file does not exist");
        return undefined;
    }

    const varsMap = new Map<string, string>();


    const data = fs.readFileSync(varsPath).toString();
    const lines = data.split("\n");
    // multiple equals signs are allowed, but the first one is the separator
    for (const line of lines) {
        const parts = line.split("=");
        if (parts.length < 2) {
            continue;
        }
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim();
        varsMap.set(`\{\{${key}\}\}`, value);
    }
    return varsMap;
}


function parseFlowsDir(basePath: string, flows: FlowConfig[], vars?: Map<string, string>) {
    const flowsPath = `${basePath}/flows`;
    // There should be one flow per subdirectory
    const flowDirs = fs.readdirSync(flowsPath, { withFileTypes: true });
    for (const dir of flowDirs) {
        if (dir.isDirectory()) {
            const flowPath = `${flowsPath}/${dir.name}`;
            const flow = parseFlowDir(flowPath, vars);
            flows.push(flow);
        }
    }
}

function parseFlowDir(flowPath: string, vars?: Map<string, string>): FlowConfig {
    // create an empty flow object
    const flow: FlowConfig = {
        name: "",
        description: "",
        status: "inactive",
        orgId: "",
        channels: [],
        documentation: [],
        resources: [],
        tools: [],
        trackers: [],
        tasks: [],
    };
    // initial data is flow.yaml
    const flowFile = `${flowPath}/flow.yaml`;
    const data = fs.readFileSync(flowFile).toString();

    const flowBase = YAML.parse(data, {
        merge: true,
        schema: "core",
        prettyErrors: true,
    });
    flow.name = flowBase.name;
    flow.description = flowBase.description;
    flow.status = flowBase.status;

    // parse channels
    parseRecursive(`${flowPath}/channels`, flow.channels!, vars);
    // parse documentation
    parseRecursive(`${flowPath}/documentation`, flow.documentation!, vars);
    // parse resources
    parseRecursive(`${flowPath}/resources`, flow.resources!, vars);
    // parse tools
    parseRecursive(`${flowPath}/tools`, flow.tools!, vars);
    // parse trackers
    parseRecursive(`${flowPath}/trackers`, flow.trackers!, vars);
    // parse tasks
    parseRecursive(`${flowPath}/tasks`, flow.tasks!, vars);

    return flow;
}

function parseRecursive<T>(path: string, objs: T[], vars?: Map<string, string>) {
    // first check if the path exists
    if (!fs.existsSync(path)) {
        return objs;
    }
    const files = fs.readdirSync(path, { recursive: true });
    for (const file of files) {
        // if the file is a directory, skip it
        if (fs.lstatSync(`${path}/${file}`).isDirectory()) {
            continue;
        }
        let data = fs.readFileSync(`${path}/${file}`).toString();
        // replace vars in the file
        if (vars) {
            for (const [key, value] of vars) {
                data = data.replace(key, value);
            }
        }
        const obj = YAML.parse(data, {
            merge: true,
            schema: "core",
            prettyErrors: true,
        });
        objs.push(obj);
    }
}

function parseFileData(path: string, vars?: Map<string, string>): {
    orgs: WorkforceOrg[],
    users: WorkforceUser[],
    roles: WorkforceOrgUserRelation[],
    skills: Skill[],
    credentials: CredentialConfig[],
    workers: WorkerConfig[],
    documentRepositories: DocumentRepositoryConfig[],
    flows: FlowConfig[],
} {
    const absolute = path.startsWith("/") || path.startsWith("~");
    const filePath = absolute ? path : `${process.cwd()}/${path}`;
    const file = fs.readFileSync(filePath).toString();
    // replace vars in the file
    if (vars) {
        for (const [key, value] of vars) {
            file.replace(key, value);
        }
    }
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
