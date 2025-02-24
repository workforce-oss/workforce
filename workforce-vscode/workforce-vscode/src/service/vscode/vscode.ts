import * as vscode from 'vscode';
import { CodeFactsApi } from "../../util/code_facts";
import { VsCodeService } from "./_service";
import stringify from 'json-stringify-deterministic';

export class VsCodeServiceImpl implements VsCodeService {
    private channel: vscode.OutputChannel;
    private basePath?: string;

    constructor(channel: vscode.OutputChannel, basePath?: string) {
        this.channel = channel;
        this.basePath = basePath;
    }

    private getPathWithPrefix(folder: string): string {
        if (!this.basePath) {
            // get the workspace folder that match the folder
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                // no workspace folder
                return folder;
            } else {
                for (const workspaceFolder of workspaceFolders) {
                    if (workspaceFolder.uri.fsPath.endsWith(folder)) {
                        return workspaceFolder.uri.fsPath;
                    }
                }
            }

        }
        return this.basePath + '/' + folder;
    }


    public async getWorkspaceSummary(folder: string, projectFiles: string[]): Promise<string> {
        this.channel.appendLine(`Getting workspace summary for ${this.getPathWithPrefix(folder)}`)
        const files = projectFiles.map((file) => {
            return {
                fileSystemPath: `${this.getPathWithPrefix(`${folder}`)}/${file}`,
                projectFilePath: `${file}`
            };
        });
        try {
            this.channel.appendLine(JSON.stringify(files));
            const map = await CodeFactsApi.createDocumentDetailsMap(files).catch((err) => {
                this.channel.appendLine(`Error creating document details map: ${err}`);
                console.error(err);
                return new Map<string, string>();
            });
            let summary = '';
            map.forEach((value, key) => {
                summary = summary.concat(`${key}:\n${value}\n`);
            });

            const promblemSummary = await this.getProblemSummary(folder, files).catch((err) => {
                this.channel.appendLine(`Error getting problem summary: ${err}`);
                console.error(err);
                return '';
            });
            if (promblemSummary.length > 0) {
                summary = summary.concat(`Problems: \n${promblemSummary}`);
            }
            return await Promise.resolve(summary);
        } catch (err) {
            this.channel.appendLine(`Error getting workspace summary: ${err}`);
            return Promise.resolve('');
        }

    }
    public async getProblemSummary(folder: string, files: { fileSystemPath: string, projectFilePath: string }[]): Promise<string> {
        try {
            try {
                const problems = await CodeFactsApi.getProblems(files);
                let summary = '';
                const promises: Promise<void>[] = [];


                problems.forEach((value, key) => {
                    const fileSystemPath = `${this.getPathWithPrefix(folder)}/${key}`;
                    promises.push(new Promise<void>(async (resolve, reject) => {
                        try {
                            summary = summary.concat(`${key}:\n`);
                            for (const problem of value) {
                                const text = await this.getTextFromRange(fileSystemPath, problem.range);
                                summary = summary.concat(`\tERROR: ${problem.message}\n\tRange: ${JSON.stringify(problem.range)}\n\tRange Content: ${text}\n`);
                            }
                            resolve();
                        } catch (err) {
                            console.error(`getProblemSummary(), Error getting text from range: ${err}`);
                            this.channel.appendLine(`problemSummary() Error getting text from range: ${err}`);
                            reject(err);
                        }
                    }));
                });
                await Promise.all(promises);
                return summary;
            } catch (err) {
                this.channel.appendLine(`Error getting problems: ${err}`);
                console.error(`getProblemSummary(), Error getting problems: ${err}`);
                return Promise.resolve('');
            }
        } catch (err_1) {
            return await Promise.reject(err_1);
        }
    }

    getTextFromRange(filesystemPath: string, range: vscode.Range): Promise<string> {
        // get the index of the last character on the last line
        const lastline = range.end.line;
        // read the lines of the file
        return new Promise<string>((resolve, reject) => {
            try {
                vscode.workspace.openTextDocument(vscode.Uri.file(filesystemPath)).then((document) => {
                    const lines = document.getText().split(/\r?\n/g);
                    // now get the index of the last character on the last line
                    const lastchar = lines[lastline].length;
                    range = range.with({ start: range.start.with({ character: 0 }), end: range.end.with({ character: lastchar }) });
                    const text = document.getText(range);
                    resolve(text);
                }, (err) => {
                    this.channel.appendLine(`getTextfromRange() Error reading text for file ${filesystemPath}: ${err}`);
                    console.error(`Error reading text from range: ${err}`);
                    reject(err);
                });
            } catch (err) {
                console.error(`Error reading text from range: ${err}`);
                reject(err);
            }
        });
    }

    async createProject(folder: string): Promise<void> {
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(this.getPathWithPrefix(folder)));


        // await vscode.workspace.fs.createDirectory(vscode.Uri.file(folder));
        // const workspaceFolders = vscode.workspace.workspaceFolders;
        // vscode.workspace.updateWorkspaceFolders(workspaceFolders!.length, 0, { uri: vscode.Uri.file(folder) });
    }

    async moveProjectFiles(projectLocation: string, newLocation: string): Promise<void> {
        if (!projectLocation || !newLocation) {
            throw new Error('Project location or new location not set');
        }
        if (projectLocation === newLocation) {
            return;
        }
        // check if the new location exists
        try {
            await vscode.workspace.fs.stat(vscode.Uri.file(this.getPathWithPrefix(newLocation)));
            // if it exists, throw an error
            throw new vscode.FileSystemError('Destination already exists');
        } catch (err) {
            if (err instanceof vscode.FileSystemError) {
                // create the directory
                await vscode.workspace.fs.createDirectory(vscode.Uri.file(this.getPathWithPrefix(newLocation)));
            } else {
                throw err;
            }
        }
        const files = await vscode.workspace.fs.readDirectory(vscode.Uri.file(this.getPathWithPrefix(projectLocation)));
        for (const file of files) {
            const [name, type] = file;
            await vscode.workspace.fs.rename(vscode.Uri.file(this.getPathWithPrefix(`${projectLocation}/${name}`)), vscode.Uri.file(this.getPathWithPrefix(`${newLocation}/${name}`)));
        }
    }

    async getFileContent(file: string): Promise<string> {
        try {
            const document = await vscode.workspace.fs.readFile(vscode.Uri.file(this.getPathWithPrefix(file)));
            // open a tab with the file
            try {
                vscode.workspace.openTextDocument(vscode.Uri.file(file)).then((doc) => {
                    // check if the file is already open in an editor
                    if (!vscode.window.visibleTextEditors.some((editor) => editor.document.uri.toString() === doc.uri.toString())) {
                        vscode.window.showTextDocument(doc).then((editor) => {
                            if (editor.document.languageId === 'markdown') {
                                vscode.commands.executeCommand('markdown.showLockedPreviewToSide', vscode.Uri.file(file));
                            } else if (editor.document.languageId === 'typescriptreact') {
                                vscode.commands.executeCommand('previewjs.start', doc);
                            }
                        });
                    }
                });
            } catch (err) {
                console.error(`Error opening text document: ${err}`);
            }


            return document.toString();
        } catch (err) {
            console.error(`Error reading file: ${err}`);
            return '';
        }
    }

    async getFunction(file: string, functionName: string): Promise<string> {
        return CodeFactsApi.getFunctionText(this.getPathWithPrefix(file), functionName);
    }

    async addFunction(file: string, text: string, className?: string): Promise<void> {
        return CodeFactsApi.addFunctionText(this.getPathWithPrefix(file), text, className);
    }

    async updateFunction(file: string, functionName: string, text: string): Promise<void> {
        await CodeFactsApi.updateFunctionText(this.getPathWithPrefix(file), functionName, text, undefined, this.channel);
    }

    async deleteFunction(file: string, functionName: string): Promise<void> {
        return CodeFactsApi.deleteFunction(this.getPathWithPrefix(file), functionName);
    }

    async addProperty(file: string, text: string, className?: string): Promise<void> {
        return CodeFactsApi.addPropertyText(this.getPathWithPrefix(file), text, className);
    }

    async deleteProperty(file: string, propertyName: string): Promise<void> {
        return CodeFactsApi.deleteProperty(this.getPathWithPrefix(file), propertyName);
    }

    async writeFile(file: string, content: string): Promise<void> {
        const uri = vscode.Uri.file(this.getPathWithPrefix(file));
        const buffer = Buffer.from(content);

        // create directory if it doesn't exist
        const folder = file.split('/').slice(0, -1).join('/');
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(this.getPathWithPrefix(folder)));

        await vscode.workspace.fs.writeFile(uri, buffer);
        // open a tab with the file
        vscode.workspace.openTextDocument(uri).then((document) => {
            // check if the file is already open in an editor
            if (!vscode.window.visibleTextEditors.some((editor) => editor.document.uri.toString() === document.uri.toString())) {
                vscode.window.showTextDocument(document).then((editor) => {
                    if (editor.document.languageId === 'markdown') {
                        vscode.commands.executeCommand('markdown.showLockedPreviewToSide', uri);
                    }
                });
            }
        });


    }

    async deleteFile(file: string): Promise<void> {
        const uri = vscode.Uri.file(this.getPathWithPrefix(file));
        await vscode.workspace.fs.delete(uri);
    }

    async executeCommand(command: string, folder: string): Promise<string> {
        // execute a shell script
        const terminal = vscode.window.createTerminal("scratch");
        terminal.sendText('cd ' + this.getPathWithPrefix(folder), true);
        terminal.sendText(command, false);
        terminal.sendText('; exit 0', true);
        terminal.show(true);

        const completionPromise = new Promise<string>((resolve, reject) => {
            vscode.window.onDidCloseTerminal((t) => {
                resolve('Command executed');
            });
        });
        return await completionPromise;
    }
}