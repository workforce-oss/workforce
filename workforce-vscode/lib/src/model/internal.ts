export type Index = {
    caches: string[]
    projects: Project[]
    referenceProjects: ReferenceProject[]
}

export type ProjectFile = {
    location: string
    projectFileType: string
    description: string
    content: string
}

export type ProjectFileFunction = {
    comments?: string
    content: string
}

export type ProjectFileType = {
    name: string
    description: string
    priority: number
}

export type Project = {
    name: string    
    slug: string
    description: string
    location: string
    projectType: string
    language: string
    referenceProjectLocation: string
    projectFiles: ProjectFile[]
    caches: string[]
}

export type ReferenceProject = {
    name: string
    slug: string
    location: string
    projectType: string
    language: string
    description: string
    
    projectFileTypes: ProjectFileType[]
    projectFiles: ProjectFile[]
    initScript?: string
    dependencyScript?: string
    dependencyFile?: string
}

export const executionStepActionTypes = [
    "create_file",
    "create_function",
    "create_property",
    "update_file",
    "update_function",
    "update_property",
    "delete_file",
    "delete_function",
    "delete_property",
] as const

export type ExecutionStepActionType = typeof executionStepActionTypes[number]

export type ExecutionStep = {
    order: number
    actionDescription: string
    fileDescription: string
    projectFileLocation: string
    projectFileType: string
    action: ExecutionStepActionType
    details: {
        name?: string,
        className?: string
        text: string,
    }
}

export type ExecutionPlan = {
    projectLocation: string
    description: string
    steps: ExecutionStep[]
}

export type FileDetails = {
    location: string
    content: string
}

export type MachineState = {
    summary: string
    // currentFile: ProjectFile
    referenceFile: ProjectFile
}