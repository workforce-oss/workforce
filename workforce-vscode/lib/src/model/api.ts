import { ExecutionPlan, ExecutionStep, MachineState, Project, ProjectFile, ReferenceProject } from "./internal.js"

export const APIHeaderAPIToken = "X-API-Token"

export const requestMessageTypes = [
    "GetProjectRequest",
    "ListProjectsRequest",
    "CreateProjectRequest",
    "GetReferenceProjectRequest",
    "GetProjectFileRequest",
    "GetProjectFileFunctionTextRequest",
    "ListReferenceProjectsRequest",
    "ExecutionPlanRequest",
    "ExecuteStepRequest",
    "HealthCheckRequest",
    "CommitAndPushRequest",
    "CheckOutBranchRequest"
] as const

export const responseMessageTypes = [
    "GetProjectResponse",
    "ListProjectsResponse",
    "CreateProjectResponse",
    "GetReferenceProjectResponse",
    "GetProjectFileResponse",
    "GetProjectFileFunctionTextResponse",
    "ListReferenceProjectsResponse",
    "ExecutionPlanResponse",
    "ExecutionStepResponse",
    "HealthCheckResponse",
    "CommitAndPushResponse",
    "CheckOutBranchResponse",
    "Error"
] as const

export type ResponseMessageType = typeof responseMessageTypes[number]
export type RequestMessageType = typeof requestMessageTypes[number]

export type MessageType = RequestMessageType | ResponseMessageType

export type Error = {
    message: string
}

export type SocketMessage = {
    type: MessageType
    correlationId: string
    payload?: GetRequest | GetProjectFileRequest | GetProjectFileFunctionTextRequest | Project | ExecutionPlan | ExecuteStepRequest | ExecutionStepResponse | ExecutionPlanResponse | GetProjectResponse | ListProjectsResponse | CreateProjectRequest | CreateProjectResponse | GetProjectFileResponse | GetProjectFileFunctionTextResponse | GetReferenceProjectResponse | ListReferenceProjectsResponse | HealthCheckResponse | CommitAndPushRequest | CommitAndPushResponse | CheckOutBranchRequest | CheckOutBranchResponse | Error
}

export type GetRequest = {
    slug: string
}

export type GetProjectFileRequest = {
    slug: string
    fileLocation: string
}

export type GetProjectFileFunctionTextRequest = {
    slug: string
    fileLocation: string
    functionName: string
}

export type ExecuteStepRequest = {
    step: ExecutionStep
    projectLocation: string
    nextFileLocation: string
}

export type GetProjectResponse = {
    project: Project
    machineState: MachineState
}

export type ListProjectsResponse  = {
    projects: Project[]
}

export type CreateProjectRequest = {
    project: Project
}

export type CommitAndPushRequest = {
    message: string
    branch: string
    projectLocation: string
    repoUrl: string
}

export type CheckOutBranchRequest = {
    branch: string
    repoUrl: string
}

export type CommitAndPushResponse = {
    actualBranch: string
}

export type CheckOutBranchResponse = {
    message: string
}

export type CreateProjectResponse = {
    project: Project
}

export type GetProjectFileResponse = {
    projectFile: ProjectFile
}

export type GetProjectFileFunctionTextResponse = {
    text: string
}

export type GetReferenceProjectResponse = {
    referenceProject: ReferenceProject
    machineState: MachineState
}

export type ListReferenceProjectsResponse = {
    referenceProjects: ReferenceProject[]
}

export type ExecutionPlanResponse = {
    files: ProjectFile[]
    referenceFiles: ProjectFile[]
    machineState: MachineState
}

export type ExecutionStepResponse = {
    result: string
    machineState: MachineState
}

export type HealthCheckResponse = {
    status: string
}

