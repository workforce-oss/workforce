import { ExecuteStepRequest, ExecutionPlan, ExecutionPlanResponse, ExecutionStep, ExecutionStepResponse, MachineState, Project, ProjectFile, ProjectFileType, ReferenceProject } from "lib";

export interface CodingService {
    ListProjects(): Promise<Project[]>;
    GetProject(projectSlug: string): Promise<{project: Project, machineState: MachineState} | undefined>;
    ListReferenceProjects(): Promise<ReferenceProject[]>;
    GetReferenceProject(projectSlug: string): Promise<ReferenceProject | undefined>;
    GetMachineState(projectLocation: string, currentFileLocation: string): Promise<MachineState>;
    CreateProject(project: Project): Promise<Project>;
    ConvertToReferenceProject(projectSlug: string, name: string, location: string, description: string, projectFileTypes: ProjectFileType[]): Promise<ReferenceProject>;

    GetProjectFile(projectSlug: string, fileLocation: string): Promise<ProjectFile | undefined>;
    GetProjectFileFunctionText(projectSlug: string, fileLocation: string, functionName: string): Promise<string>;

    CreateExecutionPlan(executionPlan: ExecutionPlan): Promise<ExecutionPlanResponse>;
    ExecuteStep(step: ExecuteStepRequest): Promise<ExecutionStepResponse>;

    Sync(projectName: string): Promise<void>;
}