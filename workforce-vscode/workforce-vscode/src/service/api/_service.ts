import { ExecuteStepRequest, ExecutionPlan, ExecutionPlanResponse, ExecutionStep, ExecutionStepResponse, MachineState, Project, ProjectFile, ReferenceProject } from "lib";

export interface CodingService {
    ListProjects(): Promise<Project[]>;
    GetProject(projectSlug: string): Promise<{project: Project, machineState: MachineState} | undefined>;
    ListReferenceProjects(): Promise<ReferenceProject[]>;
    GetReferenceProject(projectSlug: string): Promise<ReferenceProject | undefined>;
    GetMachineState(projectLocation: string, currentFileLocation: string): Promise<MachineState>;
    CreateProject(project: Project): Promise<Project>;

    GetProjectFile(projectSlug: string, fileLocation: string): Promise<ProjectFile | undefined>;
    GetProjectFileFunctionText(projectSlug: string, fileLocation: string, functionName: string): Promise<string>;

    CreateExecutionPlan(executionPlan: ExecutionPlan): Promise<ExecutionPlanResponse>;
    ExecuteStep(step: ExecuteStepRequest): Promise<ExecutionStepResponse>;

    Sync(projectName: string): Promise<void>;
}