export interface VsCodeService {
    getWorkspaceSummary(folder: string, files: string[]): Promise<string>;
    createProject(folder: string): Promise<void>;
    getFileContent(file: string): Promise<string>;
    getFunction(file: string, functionName: string): Promise<string>;
    writeFile(file: string, content: string): Promise<void>;
    deleteFile(file: string): Promise<void>;

    addFunction(file: string, text: string, className?: string): Promise<void>;
    updateFunction(file: string, functionName: string, text: string): Promise<void>;
    deleteFunction(file: string, functionName: string): Promise<void>;

    addProperty(file: string, text: string, className?: string): Promise<void>;
    deleteProperty(file: string, propertyName: string): Promise<void>;

    executeCommand(command: string, folder: string): Promise<string>;
}