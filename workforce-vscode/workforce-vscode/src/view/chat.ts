import * as vscode from 'vscode';
import { Auth } from '../auth/auth';
import { WorkforceStateProvider } from '../service/state/provider';
import { WorkforceTask } from '../service/state/model';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private stateProvider: WorkforceStateProvider;
    private channel: vscode.OutputChannel;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        stateProvider: WorkforceStateProvider,
        channel: vscode.OutputChannel
    ) { 
        this.stateProvider = stateProvider;
        this.channel = channel;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

        return this.stateProvider.getCurrentTask().then(state => this._getHtmlForWebview(webviewView.webview, state).then(html => {
            this.channel.appendLine(`Chat view resolved: current task ${JSON.stringify(state)}`);
            webviewView.webview.html = html;
        })).catch((e) => {
            console.error(e);
        });   
    }

    public update() {
        if (this._view) {
            this.stateProvider.getCurrentTask().then(state => this._getHtmlForWebview(this._view!.webview, state).then(html => {
                this.channel.appendLine(`Chat view updated: current task ${JSON.stringify(state)}`);
                this._view!.webview.html = html;
            })).catch((e) => {
                console.error(e);
            });
        }
    }

    private async _getHtmlForWebview(webview: vscode.Webview, opts?: WorkforceTask): Promise<string> {
        const {taskExecutionId, threadId, channelId, orgId} = opts || {};

        const scriptUrl = vscode.workspace.getConfiguration('workforce-vscode').get('chatScriptUrl') || '';
        if (!scriptUrl) {
            return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Chat</title>
                </head>
            <body>
                <h1>Chat script URL not set</h1>
            </body>
            </html>`;
        }
        const session = await Auth.session().catch((e) => {
            console.error(e);
        });
        if (!session?.auth.accessToken) {
            const authUrl = await Auth.GetAuthUrl();
            return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Chat</title>
                </head>
            <body>
                <h1>Not authenticated</h1>
                <a href="${authUrl}">Authenticate</a>
            </body>
            </html>`;
        } else {
            return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Chat</title>
            <script defer="defer"
            src="${scriptUrl}"
            data-workforce-mode="webview"
            data-workforce-org-id="${orgId}" 
            data-workforce-channel-id="${channelId}"
            ${taskExecutionId ? `data-workforce-task-execution-id="${taskExecutionId}"` : ''}
            ${threadId ? `data-workforce-thread-id="${threadId}"` : ''}
            data-workforce-anonymous="false"
            data-workforce-auth-access-token="${session.auth.accessToken}"
            data-workforce-auth-issued-at="${session.auth.issuedAt}"
            data-workforce-auth-expires-in="${session.auth.expiresIn}"
            data-workforce-auth-refresh-token="${session.auth.refreshToken}"
            data-workforce-auth-token-type="${session.auth.tokenType}"
            ></script>
        </head>
        <body>
        </body>
        </html>`;
        }
    }

}