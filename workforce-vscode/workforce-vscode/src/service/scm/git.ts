import * as vscode from 'vscode';

export class GitProvider {

    public workspaceRoot?: string;
    private channel: vscode.OutputChannel;

    constructor(channel: vscode.OutputChannel, workspaceRoot?: string, ) {
        this.workspaceRoot = workspaceRoot;
        this.channel = channel;
    }

    public async setWorkspaceRoot(args: { workspaceRoot: string }): Promise<void> {
        const { workspaceRoot } = args;
        this.workspaceRoot = workspaceRoot;
    }

    public async checkoutBranch(args: { branch: string, repoUrl: string }): Promise<string | undefined> {
        const { branch, repoUrl } = args;

        const fsPath = await this.cloneRepo({ repoUrl });

        if (!fsPath) {
            throw new Error('Failed to get repo');
        }

        const gitExt = vscode.extensions.getExtension('vscode.git');
        if (!gitExt) {
            throw new Error('Git extension not found');
        }

        const git = gitExt.exports.getAPI(1);

        // checkout the branch
        const repository = git.repositories.find((r: any) => r.rootUri.fsPath === fsPath);

        if (!repository) {
            throw new Error('Repository not found');
        }

        const success = await vscode.commands.executeCommand('git.checkout', repository, branch);

        if (!success) {
            throw new Error('Failed to checkout branch');
        }

        const pullSuccess = await vscode.commands.executeCommand('git.pull', repository);

        if (!pullSuccess) {
            throw new Error('Failed to pull latest changes');
        }

        return fsPath;
    }

    public async commitAndPush(args: { repoUrl: string, branch: string, message: string }): Promise<string | undefined> {
        const { repoUrl, branch, message } = args;

        const fsPath = await this.cloneRepo({ repoUrl });

        if (!fsPath) {
            throw new Error('Failed to get repo');
        }

        const gitExt = vscode.extensions.getExtension('vscode.git');
        if (!gitExt) {
            throw new Error('Git extension not found');
        }

        const git = gitExt.exports.getAPI(1);

        // add, commit and push the changes
        const repository = git.repositories.find((r: any) => r.rootUri.fsPath === fsPath);

        if (!repository) {
            throw new Error('Repository not found');
        }

        let actualBranch = branch;
        // if branchname does not already end with a timestamp, add one
        // do this by cheecking if the last 13 characters are numbers
        if (!/\d{13}$/.test(branch)) {
            actualBranch = `${branch}-${new Date().getTime()}`;
        }

        await vscode.commands.executeCommand('git.stageAll', repository);
        await vscode.commands.executeCommand('git.commit', repository, message);
        await vscode.commands.executeCommand('git.checkout', repository, actualBranch);
        await vscode.commands.executeCommand('git.pushTo', repository, 'origin', actualBranch);

        return actualBranch;
    }

    public async stageAll(args: { repoUrl: string }): Promise<void> {
        const { repoUrl } = args;

        const repoName = this.getRepoNameFromUrl(repoUrl);
        if (!repoName) {
            throw new Error('Invalid repo url');
        }

        const fsPath = await this.cloneRepo({ repoUrl, });

        if (!fsPath) {
            throw new Error('Failed to get repo');
        }

        const gitExt = vscode.extensions.getExtension('vscode.git');
        if (!gitExt) {
            throw new Error('Git extension not found');
        }

        const git = gitExt.exports.getAPI(1);

        // stage all changes
        const repository = git.repositories.find((r: any) => r.rootUri.fsPath === fsPath);

        if (!repository) {
            throw new Error('Repository not found');
        }

        await vscode.commands.executeCommand('git.stageAll', repository);
    }

    public async pull(args: { repoUrl: string, branchName: string }): Promise<void> {
        const { repoUrl, branchName } = args;

        const fsPath = await this.cloneRepo({ repoUrl });

        if (!fsPath) {
            throw new Error('Failed to get repo');
        }

        const gitExt = vscode.extensions.getExtension('vscode.git');
        if (!gitExt) {
            throw new Error('Git extension not found');
        }

        const git = gitExt.exports.getAPI(1);

        // pull the latest changes
        const repository = git.repositories.find((r: any) => r.rootUri.fsPath === fsPath);

        if (!repository) {
            throw new Error('Repository not found');
        }

        await vscode.commands.executeCommand('git.pullRef', repository, branchName);
    }

    public async commit(args: { repoUrl: string, message: string }): Promise<string | undefined> {
        const { repoUrl, message } = args;

        const repoName = this.getRepoNameFromUrl(repoUrl);
        if (!repoName) {
            throw new Error('Invalid repo url');
        }

        const fsPath = await this.cloneRepo({ repoUrl });

        if (!fsPath) {
            throw new Error('Failed to get repo');
        }

        const gitExt = vscode.extensions.getExtension('vscode.git');
        if (!gitExt) {
            throw new Error('Git extension not found');
        }

        const git = gitExt.exports.getAPI(1);

        // commit the changes
        const repository = git.repositories.find((r: any) => r.rootUri.fsPath === fsPath);

        if (!repository) {
            throw new Error('Repository not found');
        }

        await vscode.commands.executeCommand('git.commit', repository, message);

        return fsPath;
    }

    public async push(args: { repoUrl: string, branchName: string }): Promise<void> {
        const { repoUrl, branchName } = args;

        const fsPath = await this.cloneRepo({ repoUrl });

        if (!fsPath) {
            throw new Error('Failed to get repo');
        }

        const gitExt = vscode.extensions.getExtension('vscode.git');
        if (!gitExt) {
            throw new Error('Git extension not found');
        }

        const git = gitExt.exports.getAPI(1);

        // push the changes
        const repository = git.repositories.find((r: any) => r.rootUri.fsPath === fsPath);

        if (!repository) {
            throw new Error('Repository not found');
        }

        await vscode.commands.executeCommand('git.pushTo', repository, 'origin', branchName);
    }

    async cloneRepo(args: { repoUrl: string }): Promise<string | undefined> {
        const { repoUrl } = args;
        this.channel.appendLine(`Cloning repo: ${repoUrl}`);

        const repoName = this.getRepoNameFromUrl(repoUrl);
        this.channel.appendLine(`Repo name: ${repoName}`);
        
        if (!repoName) {
            throw new Error('Invalid repo url');
        }

        const folderName = this.getFolderNameFromRepoName(repoName);
        const orgName = this.getOrgNameFromRepoName(repoName);

        let fsPath = this.workspaceFsPath(folderName);
        if (fsPath) {
            this.channel.appendLine(`Repo already exists at: ${fsPath}`);
            return fsPath;
        }

        fsPath = `${this.workspaceRoot}/${orgName}/${folderName}`;
        this.channel.appendLine(`Checking file system path: ${fsPath}`);
        
        // Use raw fs to check if the folder exists
        const fs = require('fs');
        if (fs.existsSync(fsPath)) {
            this.channel.appendLine(`Repo already exists at: ${fsPath}, adding to workspace`);
            vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.length : 0, 0, { uri: vscode.Uri.file(fsPath) });
            return fsPath;
        }

        this.channel.appendLine(`Cloning repo: ${repoUrl} to: ${fsPath}`);
        

        if (!this.workspaceRoot) {
            throw new Error('Workspace root not set');
        }

        // use the command palette to clone the repo
        await vscode.commands.executeCommand('git.clone', repoUrl, this.workspaceRoot + '/' + orgName);

        // rely on the git extension to clone the repo and open it

        // // add the repo to the workspace
        // const repoWorkspaceUri = vscode.Uri.file(this.workspaceRoot + '/' + repoName);
        // vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.length : 0, 0, { uri: repoWorkspaceUri });

        return this.workspaceFsPath(folderName);
    }

    private workspaceFsPath(repoName: string): string | undefined {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            for (const workspaceFolder of workspaceFolders) {
                this.channel.appendLine(`Checking workspace folder: ${workspaceFolder.uri.fsPath} for repo: ${repoName}`);
                if (workspaceFolder.uri.fsPath.endsWith(repoName)) {
                    return workspaceFolder.uri.fsPath;
                } else if (workspaceFolder.uri.fsPath.endsWith(repoName, workspaceFolder.uri.fsPath.length - 3)) {
                    return workspaceFolder.uri.fsPath;
                }
            }
        }

        return undefined;
    }

    private getRepoNameFromUrl(repoUrl: string): string | undefined {
        const parts = repoUrl.split('/');
        // last 2 parts are the repo name
        if (parts.length < 2) {
            return undefined;
        }
        return parts[parts.length - 2] + '/' + parts[parts.length - 1].replace('.git', '');
    }

    private getFolderNameFromRepoName(repoName: string): string {
        const parts = repoName.split('/');
        return parts[parts.length - 1];
    }

    private getOrgNameFromRepoName(repoName: string): string {
        const parts = repoName.split('/');
        return parts[parts.length - 2];
    }
}