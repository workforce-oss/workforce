import { Configuration } from "../config/configuration.js";

export class Logger {
    private static loggers = new Map<string, Logger>();
    private static classLevels = new Map<string, string>();
    private type: string;
    private componentName: string;
    private level: string;
    private instanceId: string;

    private constructor(type: string) {
        this.type = type;
        this.componentName = Configuration.ComponentName;
        this.level = Configuration.LogLevel;
        const instanceId = Configuration.InstanceId;
        if (instanceId === '') {
            this.instanceId = Math.random().toString(36).substring(2, 7);
        } else {
            this.instanceId = instanceId.split('-').pop() ?? instanceId;
        }
    }
    static getInstance(type: string) {
        if (!Logger.loggers.has(type)) {
            Logger.loggers.set(type, new Logger(type));
        }
        return Logger.loggers.get(type)!;
    }

    debug(message: string, ...args: unknown[]) {
        if (this.level === 'debug') {
            console.debug(`[DEBUG] [${this._timestamp()}] [${this.componentName}] [${this.instanceId}] [${this.type}] ${message}`, ...args);
        }
    }

    info(message: string, ...args: unknown[]) {
        if (this.level === 'debug' || this.level === 'info') {
            console.info(`[INFO] [${this._timestamp()}] [${this.componentName}] [${this.instanceId}] [${this.type}] ${message}`, ...args);
        }
    }

    warn(message: string, ...args: unknown[]) {
        if (this.level === 'debug' || this.level === 'info' || this.level === 'warn') {
            console.warn(`[WARN] [${this._timestamp()}] [${this.componentName}] [${this.instanceId}] [${this.type}] ${message}`, ...args);
        }
    }

    error(message: string, ...args: unknown[]) {
        if (this.level === 'debug' || this.level === 'info' || this.level === 'warn' || this.level === 'error') {
            console.error(`[ERROR] [${this._timestamp()}] [${this.componentName}] [${this.instanceId}] [${this.type}] ${message}`, ...args);
        }
    }

    private _timestamp() {
        return new Date().toISOString();
    }
}

export const logLevels = ['debug', 'info', 'warn', 'error'];