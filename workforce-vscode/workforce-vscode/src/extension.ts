// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DefaultCodingService } from './service/api/default';
import { VsCodeServiceImpl } from './service/vscode/vscode';
import { WorkforceSocketService } from './service/workforce-socket/service';
// eslint-disable-next-line @typescript-eslint/naming-convention
import { Index } from 'lib';
import _ from 'lodash';
import { Auth } from './auth/auth';
import { ChatViewProvider } from './view/chat';
import { GitProvider } from './service/scm/git';
import { WorkforceStateProvider } from './service/state/provider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

var codingService: DefaultCodingService | undefined = undefined;
var socketService: WorkforceSocketService | undefined = undefined;


export function activate(context: vscode.ExtensionContext) {
	//Create an output channel
	const channel = vscode.window.createOutputChannel('workforce');
	// Create workspace folder if it doesn't exist
	const chatEnabled = vscode.workspace.getConfiguration('workforce-vscode').get('chatEnabled') as boolean;
	const authEnabled = vscode.workspace.getConfiguration('workforce-vscode').get('authEnabled') as boolean;
	const workspaceRoot = vscode.workspace.getConfiguration('workforce-vscode').get('workspaceRoot') as string;

	console.log('Chat enabled:', chatEnabled);
	const scmProvider = new GitProvider(channel, workspaceRoot);
	const stateProvider = new WorkforceStateProvider(context);

	// security.workspace.trust.enabled: false
	if (!chatEnabled) {
		vscode.workspace.getConfiguration().update('security.workspace.trust.enabled', false, vscode.ConfigurationTarget.Global);
	}

	if (authEnabled) {
		const issuerUrl = vscode.workspace.getConfiguration('workforce-vscode').get('authIssuerUrl') as string;
		Auth.init(issuerUrl, 'workforce-ui', context);
	}

	// Update the coding Index
	try {
		updateIndex(channel, scmProvider);
	} catch (error: any) {
		channel.appendLine(error);
	}

	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration('workforce-vscode.workspaceRoot')) {
			const workspaceRoot = vscode.workspace.getConfiguration('workforce-vscode').get('workspaceRoot') as string;
			scmProvider.setWorkspaceRoot({ workspaceRoot });
		}
	}));

	channel.appendLine('Configuration subscriptions set up');


	if (chatEnabled) {
		const viewProvider = new ChatViewProvider(context.extensionUri, stateProvider, channel);
		context.subscriptions.push(
			vscode.window.registerWebviewViewProvider('workforce.chat', viewProvider, {
				webviewOptions: {
					retainContextWhenHidden: true,
				},
			})
		);

		Auth.instance?.setLogoutCallBack(() => {
			viewProvider.update();
		});

		channel.appendLine('Chat view provider registered');

		// Subscribe to Uri changes
		context.subscriptions.push(vscode.window.registerUriHandler({
			handleUri(uri: vscode.Uri) {
				channel.appendLine(`Uri: ${uri.toString()}`);
				channel.appendLine(`Authority: ${uri.authority}`);
				channel.appendLine(`Path: ${uri.path}`);
				if (uri.path === '/auth') {
					Auth.instance?.handleRedirect(`${uri.scheme}://${uri.authority}${uri.path}?${uri.query}`, channel).then(() => {
						// try {
						// 	updateIndex(channel, scmProvider);
						// } catch (error: any) {
						// 	channel.appendLine(error);
						// }
						viewProvider.update();
						channel.appendLine('Reloaded webview');
						resumeTask(stateProvider, scmProvider, channel);
					}).catch((error) => {
						channel.appendLine(error);
					});
				} else if (uri.path === '/session') {
					// query contains a session id that our chat should attach to
					const queryParts = uri.query.split('&');
					for (const part of queryParts) {
						const [key, value] = part.split('=');
						if (key === 'session_id') {
							viewProvider.update();
						}
					}
				} else if (uri.path === '/task-execution') {
					// create a popup asking if the user wants to start the task
					const messageItems: vscode.MessageItem[] = [{ title: 'Start Task' }, { title: 'Cancel', isCloseAffordance: true }];
					channel.appendLine('Task execution');
					vscode.window.showInformationMessage('Do you want to start the task?', { modal: true }, ...messageItems).then((selected) => {
						channel.appendLine(`Selected: ${selected?.title}`);
						if (selected?.title === 'Start Task') {
							const queryParts = uri.query.split('&');
							let taskExecutionId = undefined;
							let repoUrl = undefined;
							let channelId = undefined;
							let orgId = undefined;
							let threadId = undefined;
							for (const part of queryParts) {
								const [key, value] = part.split('=');
								if (key === 'task_execution_id') {
									channel.appendLine(`Task execution id: ${value}`);
									taskExecutionId = value;
								} else if (key === 'repo_url') {
									channel.appendLine(`Repo url: ${value}`);
									// we need to decode the repo url
									repoUrl = decodeURIComponent(value);
								} else if (key === 'channel_id') {
									channel.appendLine(`Channel id: ${value}`);
									channelId = value;
								} else if (key === 'org_id') {
									channel.appendLine(`Org id: ${value}`);
									orgId = value;
								} else if (key === 'thread_id') {
									channel.appendLine(`Thread id: ${value}`);
									threadId = value;
								}
							}

							stateProvider.updateTask({ threadId, taskExecutionId, channelId, orgId, repoUrl }).then(() => {
								if (taskExecutionId && repoUrl) {
									beginTask(repoUrl, scmProvider, channel).then(() => {
										channel.appendLine(`Task execution started: taskExecution=${taskExecutionId} repo=${repoUrl} channel=${channelId} org=${orgId}`);
										viewProvider.update();
									}).catch((error) => {
										channel.appendLine(error);
									});
								} else {
									channel.appendLine('Invalid task execution, missing task_execution_id or repo_url');
								}
							}).catch((error) => {
								channel.appendLine(error);
							});
						}
					});
				}
			},
		}));

		channel.appendLine('Uri handler registered');

		context.subscriptions.push(vscode.commands.registerCommand('workforce.logout', () => {
			channel.appendLine('Logging out');
			Auth.logout().then(() => {
				channel.appendLine('Logged out');
			}).catch((error) => {
				channel.appendLine(error);
			});
		}));
	} else {
		channel.appendLine('Chat disabled');
	}

	context.subscriptions.push(vscode.commands.registerCommand('workforce.resume', () => {
		resumeTask(stateProvider, scmProvider, channel);
	}));
	stateProvider.getCurrentTask().then((task) => {
		if (task) {
			channel.appendLine(`Task found: ${task.taskExecutionId}`);
			const messageItems: vscode.MessageItem[] = [{ title: 'Continue Task' }, { title: 'Cancel', isCloseAffordance: true }];
			vscode.window.showInformationMessage('Ongoing Workforce task detected, would you like to continue?', { modal: true }, ...messageItems).then((selected) => {
				channel.appendLine(`Selected: ${selected?.title}`);
				if (selected?.title === 'Continue Task') {
					resumeTask(stateProvider, scmProvider, channel);
				}
			});
		}
	}).catch((error) => {
		channel.appendLine(error);
	});

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	channel.appendLine(`Congratulations, your extension ${context.extension.id} is now active!`);
}

async function resumeTask(stateProvider: WorkforceStateProvider, scmProvider: GitProvider, channel: vscode.OutputChannel) {
	stateProvider.getCurrentTask().then((task) => {
		if (!task) {
			return;
		}
		if (task.repoUrl && task.taskExecutionId) {
			const messageItems: vscode.MessageItem[] = [{ title: 'Continue Task' }, { title: 'Cancel', isCloseAffordance: true }];
			vscode.window.showInformationMessage('Ongoing Workforce task detected, would you like to continue?', { modal: true }, ...messageItems).then((selected) => {
				channel.appendLine(`Selected: ${selected?.title}`);
				if (selected?.title === 'Continue Task') {
					beginTask(task.repoUrl!, scmProvider, channel).then(() => {
						channel.appendLine(`Task execution started: taskExecution=${task.taskExecutionId} repo=${task.repoUrl} channel=${task.channelId} org=${task.orgId}`);
					}).catch((error) => {
						channel.appendLine(error);
					});
				}
			});
		}
	}).catch((error) => {
		channel.appendLine(error);
	});
}

async function beginTask(repoUrl: string, scmProvider: GitProvider, channel: vscode.OutputChannel): Promise<void> {
	vscode.commands.executeCommand('workforce.chat.focus');
	return scmProvider.cloneRepo({ repoUrl }).then((repoPath) => {
		if (!repoPath) {
			channel.appendLine('Clone called, but no repo path returned');
			return;
		}
		channel.appendLine('Cloned main');
		try {
			updateIndex(channel, scmProvider, repoPath);
		} catch (error: any) {
			channel.appendLine(error);
		}

	}).catch((error) => {
		channel.appendLine(error);
	});


}

function updateIntegration(args: { index: Index, channel: vscode.OutputChannel, scmProvider: GitProvider, indexFile?: vscode.Uri }) {
	const { index, channel, indexFile, scmProvider } = args;
	let basePath = undefined;
	if (indexFile) {
		basePath = indexFile.fsPath.substring(0, indexFile.fsPath.lastIndexOf('/'));
	}
	const vsCodeService = new VsCodeServiceImpl(channel, basePath);
	if (!codingService) {
		codingService = new DefaultCodingService(vsCodeService, index,
			(action, projectFile, index) => {
				channel.appendLine(`Action: ${action} on ${projectFile}`);
				// update index.json
				const indexCopy: Index = _.cloneDeep(index);
				for (const project of indexCopy.projects) {
					for (const file of project.projectFiles) {
						file.content = "";
					}
				}

				for (const referenceProject of indexCopy.referenceProjects) {
					for (const file of referenceProject.projectFiles) {
						file.content = "";
					}
				}
				const content = JSON.stringify(index, null, 2);
				if (indexFile) {
					try {
						const buffer = Buffer.from(content);
						vscode.workspace.fs.writeFile(indexFile, buffer);
					} catch (error: any) {
						channel.appendLine(error);
					}
				}
			}
		);
		if (!socketService) {
			try {
				const socketUrl = vscode.workspace.getConfiguration('workforce-vscode').get('socketUrl') as string;
				socketService = new WorkforceSocketService(socketUrl, codingService, channel, scmProvider);
			} catch (error: any) {
				console.error(error);
				channel.appendLine(error);
			}
		}
	} else {
		codingService.SetIndex(index);
	}
}


function updateIndex(channel: vscode.OutputChannel, scmProvider: GitProvider, repoPath?: string) {
	if (!repoPath) {
		channel.appendLine('No repo path found');
		return;
	}

	const indexJsonPath = `${repoPath}/index.json`;

	channel.appendLine(`Index.json path: ${indexJsonPath}`);
	const indexFile = vscode.Uri.file(indexJsonPath);
	vscode.workspace.fs.readFile(indexFile).then((buffer) => {
		channel.appendLine('Read index.json');
		const content = new TextDecoder().decode(buffer);
		channel.appendLine(content);
		return JSON.parse(content);
	}).then((index) => {
		channel.appendLine('Parsed index.json');
		updateIntegration({ index, channel, indexFile, scmProvider });
	});
}


// This method is called when your extension is deactivated
export function deactivate() { }
