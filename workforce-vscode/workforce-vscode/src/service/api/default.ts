import { Project, ReferenceProject, ExecutionPlan, ExecuteStepRequest, ExecutionStepResponse, Index, MachineState, ProjectFile, ExecutionPlanResponse, ExecutionStepActionType, ProjectFileType } from "lib";
import { VsCodeService } from "../vscode/_service";
import { CodingService } from "./_service";

export class DefaultCodingService implements CodingService {
    private VsCodeService: VsCodeService;
    private index: Index;
    private indexUpdateCallback: (action: ExecutionStepActionType | "create-project" | "convert-to-reference-project", projectFile: ProjectFile | Project | ReferenceProject, index: Index) => void;
    private initalDependeniesRan: Set<string> = new Set();

    constructor(VsCodeService: VsCodeService, index: Index, indexUpdateCallback: (action: ExecutionStepActionType | "create-project" | "convert-to-reference-project", projectFile: ProjectFile | Project | ReferenceProject, index: Index) => void) {
        this.VsCodeService = VsCodeService;
        this.index = index;
        this.indexUpdateCallback = indexUpdateCallback;
    }

    SetIndex(index: Index): void {
        this.index = index;
    }

    GetIndex(): Index {
        return this.index;
    }

    async ListProjects(): Promise<Project[]> {
        return this.index.projects.map(project => {
            return {
                name: project.name,
                slug: project.slug,
                description: project.description,
                location: project.location,
                projectType: project.projectType,
                language: project.language,
                referenceProjectLocation: project.referenceProjectLocation,
            } as Project;
        });
    }
    async GetProject(projectSlug: string): Promise<{ project: Project, machineState: MachineState } | undefined> {
        const project = this.index.projects.find(project => project.slug === projectSlug);
        if (!project) {
            return Promise.reject(`Project ${projectSlug} not found`);
        }
        const machineState = await this.GetMachineState(project.location, "");
        return {
            project: project,
            machineState: machineState,
        };
    }

    async CreateProject(project: Project): Promise<Project> {
        if (!project.projectFiles) {
            project.projectFiles = [];
        }
        if (!project.slug) {
            project.slug = slugify(project.name);
        }
        await this.VsCodeService.createProject(project.location);
        this.index.projects.push({
            ...project
        });
        const referenceProject = await this.GetReferenceProject(project.referenceProjectLocation);
        if (referenceProject && referenceProject.initScript) {
            await this.VsCodeService.executeCommand(referenceProject.initScript, `${project.location}`);
        }

        this.indexUpdateCallback("create-project", project, this.index);

        return project;
    }

    async ConvertToReferenceProject(projectSlug: string, name: string, location: string, description: string, projectFileTypes: ProjectFileType[]): Promise<ReferenceProject> {
        const project = this.index.projects.find(project => project.slug === projectSlug);
        if (!project) {
            return Promise.reject(`Project ${projectSlug} not found`);
        }
        const referenceProject: ReferenceProject = {
            name: name,
            description: description,
            slug: slugify(name),
            location: location,
            projectType: project.projectType,
            language: project.language,
            projectFiles: project.projectFiles,
            projectFileTypes: projectFileTypes,
        };
        this.index.referenceProjects.push(referenceProject);

        // move files to new location
        await this.VsCodeService.moveProjectFiles(project.location, location);
        // remove project
        this.index.projects = this.index.projects.filter(project => project.slug !== projectSlug);
        // update index
        this.indexUpdateCallback("convert-to-reference-project", referenceProject, this.index);
        return referenceProject;
    }

    async ListReferenceProjects(): Promise<ReferenceProject[]> {
        return this.index.referenceProjects || [];
    }
    async GetReferenceProject(projectSlug: string): Promise<ReferenceProject | undefined> {
        return this.index.referenceProjects.find(referenceProject => referenceProject.slug === projectSlug);
    }

    async GetProjectFile(projectSlug: string, fileLocation: string): Promise<ProjectFile | undefined> {
        const project = this.index.projects.find(project => project.slug === projectSlug);
        if (!project) {
            return Promise.reject(`Project ${projectSlug} not found`);
        }
        const projectFile = project.projectFiles.find(projectFile => projectFile.location === fileLocation);
        if (!projectFile) {
            return Promise.reject(`Project file ${fileLocation} not found`);
        }
        // add content
        const projectFileContent = await this.VsCodeService.getFileContent(`${project.location}/${projectFile.location}`);
        return {
            location: projectFile.location,
            content: projectFileContent,
            projectFileType: projectFile.projectFileType,
            description: projectFile.description,
        };
    }

    async GetProjectFileFunctionText(projectSlug: string, fileLocation: string, functionName: string): Promise<string> {
        const project = this.index.projects.find(project => project.slug === projectSlug);
        if (!project) {
            return Promise.reject(`Project ${projectSlug} not found`);
        }
        return this.VsCodeService.getFunction(`${project.location}/${fileLocation}`, functionName);
    }

    private async getReferenceFileDatailsForProjectFile(projectFile: ProjectFile, referenceProjectLocation: string): Promise<ProjectFile | undefined> {
        const referenceProject = this.index.referenceProjects.find(referenceProject => referenceProject.location === referenceProjectLocation);
        if (!referenceProject) {
            console.error(`Reference project ${referenceProjectLocation} not found`);
            return undefined;
        }
        const referenceProjectFile = referenceProject.projectFiles.find(referenceProjectFile => referenceProjectFile.projectFileType === projectFile.projectFileType);
        if (!referenceProjectFile) {
            console.error(`Reference project file ${projectFile.projectFileType} not found`);
            return undefined;
        }

        const referenceProjectFileContent = await this.VsCodeService.getFileContent(`${referenceProject.location}/${referenceProjectFile.location}`);
        return {
            location: referenceProjectFile.location,
            content: referenceProjectFileContent,
            projectFileType: referenceProjectFile.projectFileType,
            description: referenceProjectFile.description,
        };
    }

    async GetMachineState(projectLocation: string, currentFileLocation?: string, currentFileType?: string): Promise<MachineState> {

        const project = this.index.projects.find(project => project.location === projectLocation);
        if (!project) {
            return Promise.reject(`Project ${projectLocation} not found`);
        }
        if (!currentFileLocation) {
            const summary = await this.VsCodeService.getWorkspaceSummary(projectLocation, project.projectFiles.map(projectFile => projectFile.location));
            return {
                summary: summary,
                // currentFile: {
                //     location: "",
                //     content: "",
                //     projectFileType: "",
                //     description: "",
                // },
                referenceFile: {
                    location: "",
                    content: "",
                    projectFileType: "",
                    description: "",
                },
            };
        }
        if (!project.projectFiles) {
            project.projectFiles = [];
        }


        const projectFile = project.projectFiles.find(projectFile => projectFile.location === currentFileLocation);
        if (!projectFile) {
            const summary = await this.VsCodeService.getWorkspaceSummary(project.location, project.projectFiles.map(projectFile => projectFile.location));
            const referenceProjectFile = await this.getReferenceFileDatailsForProjectFile({
                location: currentFileLocation,
                projectFileType: currentFileType || "",
                description: "",
                content: "",
            }, project.referenceProjectLocation);
            return {
                summary: summary,
                // currentFile: {
                //     location: "",
                //     content: "",
                //     projectFileType: "",
                //     description: "",
                // },
                referenceFile: referenceProjectFile || {
                    location: "",
                    content: "",
                    projectFileType: "",
                    description: "",
                },
            };
        }
        const projectFileContent = await this.VsCodeService.getFileContent(`${project.location}/${projectFile.location}`);

        const referenceProjectFile = await this.getReferenceFileDatailsForProjectFile(projectFile, project.referenceProjectLocation);
        const referenceProjectFileContent = referenceProjectFile ? await this.VsCodeService.getFileContent(`${project.referenceProjectLocation}/${referenceProjectFile.location}`) : "";

        const summary = await this.VsCodeService.getWorkspaceSummary(project.location, project.projectFiles.map(projectFile => projectFile.location));

        return {
            summary: summary,
            // currentFile: {
            //     location: projectFile.location,
            //     content: projectFileContent,
            //     projectFileType: projectFile.projectFileType,
            //     description: projectFile.description,
            // },
            referenceFile: {
                location: referenceProjectFile?.location || "",
                content: referenceProjectFileContent,
                projectFileType: referenceProjectFile?.projectFileType || "",
                description: referenceProjectFile?.description || "",
            },
        };
    }

    async CreateExecutionPlan(executionPlan: ExecutionPlan): Promise<ExecutionPlanResponse> {
        if (!this.index.projects) {
            return Promise.reject("No projects found");
        }
        const project = this.index.projects.find(project => project.location === executionPlan.projectLocation);
        if (!project) {
            return Promise.reject(`Project ${executionPlan.projectLocation} not found`);
        }
        // if (!this.index.referenceProjects) {
        //     return Promise.reject("No reference projects found");
        // }
        const referenceProject = this.index.referenceProjects.find(referenceProject => referenceProject.location === project.referenceProjectLocation);
        // if (!referenceProject) {
        //     return Promise.reject(`Reference project ${project.referenceProjectLocation} not found`);
        // }

        if (!executionPlan.steps || executionPlan.steps.length === 0) {
            return Promise.reject("No steps found in execution plan");
        }

        const firstFileLocation = executionPlan.steps[0].projectFileLocation;
        const machineState = await this.GetMachineState(project.location, firstFileLocation, executionPlan.steps[0].projectFileType);

        const referenceFiles = referenceProject?.projectFiles.filter(referenceProjectFile => executionPlan.steps.some(step => step.projectFileLocation === referenceProjectFile.location));

        return {
            files: project.projectFiles,
            referenceFiles: referenceFiles || [],
            machineState: machineState,
        }
    }

    async ExecuteStep(step: ExecuteStepRequest): Promise<ExecutionStepResponse> {
        if (!step.projectLocation || step.projectLocation === "undefined") {
            return Promise.reject("Project location undefined. Request format invalid.");
        }
        if (!step.step.projectFileLocation || step.step.projectFileLocation === "undefined") {
            return Promise.reject("Project file location not provided. Request format invalid.");
        }

        const project = this.index.projects.find(project => project.location === step.projectLocation);

        const referenceProject = this.index.referenceProjects.find(referenceProject => referenceProject.location === project?.referenceProjectLocation);
        if (referenceProject && referenceProject.dependencyScript && !this.initalDependeniesRan.has(step.projectLocation)) {
            await this.VsCodeService.executeCommand(referenceProject.dependencyScript, `${step.projectLocation}`);
            this.initalDependeniesRan.add(step.projectLocation);
        }


        const fileLocation = `${step.projectLocation}/${step.step.projectFileLocation}`;
        if (step.step.action === "update_file" || step.step.action === "create_file") {
            if (step.step.details.text) {
                await this.VsCodeService.writeFile(fileLocation, step.step.details.text).catch(err => {
                    return Promise.reject(`Failed to write file ${fileLocation}: ${err}`);
                });

                if (referenceProject && referenceProject.dependencyScript && step.step.projectFileLocation === referenceProject.dependencyFile) {
                    await this.VsCodeService.executeCommand(referenceProject.dependencyScript, `${step.projectLocation}`);
                }
            }
        } else if (step.step.action === "delete_file") {
            await this.VsCodeService.deleteFile(fileLocation).catch(err => {
                return Promise.reject(`Failed to delete file ${fileLocation}: ${err}`);
            });
        } else if (step.step.action === "create_function") {
            await this.VsCodeService.addFunction(fileLocation, step.step.details.text, step.step.details.className).catch(err => {
                return Promise.reject(`Failed to add function to file ${fileLocation}: ${err}`);
            });
        } else if (step.step.action === "update_function") {
            await this.VsCodeService.updateFunction(fileLocation, step.step.details.name!, step.step.details.text).catch(err => {
                return Promise.reject(`Failed to update function in file ${fileLocation}: ${err}`);
            });
        } else if (step.step.action === "delete_function") {
            await this.VsCodeService.deleteFunction(fileLocation, step.step.details.name!).catch(err => {
                return Promise.reject(`Failed to delete function from file ${fileLocation}: ${err}`);
            });
        } else if (step.step.action === "create_property") {
            await this.VsCodeService.addProperty(fileLocation, step.step.details.text, step.step.details.className).catch(err => {
                return Promise.reject(`Failed to add property to file ${fileLocation}: ${err}`);
            });
        } else if (step.step.action === "delete_property") {
            await this.VsCodeService.deleteProperty(fileLocation, step.step.details.name!).catch(err => {
                return Promise.reject(`Failed to delete property from file ${fileLocation}: ${err}`);
            });
        }

        if (step.step.action === "create_file") {
            this.index.projects.find(project => project.location === step.projectLocation)?.projectFiles.push({
                location: step.step.projectFileLocation,
                projectFileType: step.step.projectFileType,
                description: step.step.fileDescription,
                content: ""
            });
        } else if (step.step.action === "delete_file") {
            const project = this.index.projects.find(project => project.location === step.projectLocation);
            if (project) {
                project.projectFiles = project.projectFiles.filter(projectFile => projectFile.location !== step.step.projectFileLocation);
            }
        }
        this.indexUpdateCallback(step.step.action, {
            location: step.step.projectFileLocation,
            projectFileType: step.step.projectFileType,
            description: step.step.fileDescription,
            content: ""
        }, this.index);

        const machineState = await this.GetMachineState(step.projectLocation, step.nextFileLocation, step.step.projectFileType).catch(err => {
            console.error(`Failed to get machine state for project ${step.projectLocation}: ${err}`);
        });
        return {
            result: "Step executed successfully",
            machineState: machineState || {
                referenceFile: {
                    location: "",
                    content: "",
                    projectFileType: "",
                    description: "",
                },
                summary: "",
            },
        }
    }
    Sync(projectLocation: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
}

function slugify(name: string): string {
    return name.toLowerCase().replace(/ /g, "-");
}
