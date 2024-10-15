export class Configuration {
    static get WorkspaceRoot(): string {
        return process.env.WORKSPACE_ROOT || `${process.env.HOME}/git/workspace`;
    }
}