import * as k8s from '@kubernetes/client-node';
import { Logger } from '../../../../logging/logger.js';
import { VsCodeInstanceManager } from './instance_manager.js';
import { Configuration } from '../../../../config/configuration.js';

export class KubernetesManager implements VsCodeInstanceManager {
    private objectApi: k8s.KubernetesObjectApi;
    private corev1Api: k8s.CoreV1Api;

    private static _instance: KubernetesManager;

    private constructor() {
        const kc = new k8s.KubeConfig();
        kc.loadFromDefault();

        const objectApi = k8s.KubernetesObjectApi.makeApiClient(kc);
        this.objectApi = objectApi;

        const corev1Api = kc.makeApiClient(k8s.CoreV1Api);
        this.corev1Api = corev1Api;


    }

    static getInstance(): KubernetesManager {
        if (!KubernetesManager._instance) {
            KubernetesManager._instance = new KubernetesManager();
        }
        return KubernetesManager._instance;
    }

    public async createVsCode(args: {
        orgId: string,
        taskExecutionId: string,
        indexRepoLocation: string,
        indexRepoBranch: string,
        indexRepoUsername: string,
        indexRepoPassword: string,
    }): Promise<void> {
        const namespace = `code-${args.taskExecutionId}`
        await this.createNamespace(namespace);
        await this.createSecret({
            namespace,
            indexRepoLocation: args.indexRepoLocation,
            indexRepoBranch: args.indexRepoBranch,
            indexRepoUsername: args.indexRepoUsername,
            indexRepoPassword: args.indexRepoPassword,
        });
        await this.createCustomResource({
            namespace,
            orgId: args.orgId,
            taskExecutionId: args.taskExecutionId,
        });

        // Wait up to 10 minutes for a pod called "pod" to be running in the namespace
        const podName = 'pod';
        const timeout = 10 * 60 * 1000;
        const interval = 5000;
        const start = Date.now();
        while (Date.now() - start < timeout) {
            try {
                const pod = await this.corev1Api.readNamespacedPod(podName, namespace);
                // wait for 1/1 in ready status
                const ready = pod.body.status?.containerStatuses?.[0].ready;
                if (ready) {
                    Logger.getInstance('k8s-manager').info(`Pod is running: ${pod.body.metadata?.name}`);
                    // add 30 seconds to allow for the pod to be ready
                    await new Promise((resolve) => setTimeout(resolve, 30000));
                    return;
                }
            } catch (e) {
                Logger.getInstance('k8s-manager').info(`Pod not running yet: ${e as Error}`);
            }
            await new Promise((resolve) => setTimeout(resolve, interval));
        }
    }

    public async deleteVsCode(args: { orgId: string, taskExecutionId: string }): Promise<void> {
        const namespace = `code-${args.taskExecutionId}`;
        try {
            await this.corev1Api.deleteNamespace(namespace);
        } catch (e) {
            Logger.getInstance('k8s-manager').error(`Failed to delete namespace: ${JSON.stringify(e)}`);
        }
    }

    public getApiUrl(taskExecutionId: string): string {
        return `http://api.code-${taskExecutionId}.svc.cluster.local`;
    }

    public getCollabUrl(args: {orgId: string, taskExecutionId: string}): string {
        return `${Configuration.BaseUrl}/workforce-api/tools/${args.orgId}/${args.taskExecutionId}/index.html`;
    }

    private async createNamespace(namespace: string): Promise<void> {
        try {
            const existing = await this.corev1Api.readNamespace(namespace);
            if (existing.body.kind === 'Namespace') {
                Logger.getInstance('k8s-manager').info(`Namespace already exists: ${namespace}`);
                return;
            }
        } catch (e) {
            Logger.getInstance('k8s-manager').info(`Creating namespace: ${namespace}`);
            Logger.getInstance('k8s-manager').info(`Error: ${JSON.stringify(e)}`);
            const response = await this.corev1Api.createNamespace({
                apiVersion: 'v1',
                kind: 'Namespace',
                metadata: {
                    name: namespace,
                },
            }).catch((error) => {
                Logger.getInstance('k8s-manager').info(`Error: ${JSON.stringify(error)}`);
            });

            if (response?.body.kind !== 'Namespace' && response?.response) {
                throw new Error(`Failed to create namespace: ${JSON.stringify(response.response)}`);
            } else if (response?.body.kind !== 'Namespace') {
                throw new Error(`Failed to create namespace: unknown error`);
            }

        }
    }

    private async createSecret(args: {
        namespace: string,
        indexRepoLocation: string,
        indexRepoBranch: string,
        indexRepoUsername: string,
        indexRepoPassword: string,
    }): Promise<void> {
        try {
            const existing = await this.corev1Api.readNamespacedSecret('secret', args.namespace);
            if (existing.body.kind === 'Secret') {
                Logger.getInstance('k8s-manager').info(`Secret already exists in namespace: ${args.namespace}`);
                return;
            }
        } catch (e) {
            Logger.getInstance('k8s-manager').debug(`namespace not found`, e);
            Logger.getInstance('k8s-manager').info(`Creating secret in namespace: ${args.namespace}`);
            const response = await this.corev1Api.createNamespacedSecret(args.namespace, {
                apiVersion: 'v1',
                kind: 'Secret',
                metadata: {
                    name: 'secret',
                    namespace: args.namespace,
                },
                type: 'Opaque',
                data: {
                    'INDEX_REPO_LOCATION': Buffer.from(args.indexRepoLocation).toString('base64'),
                    'INDEX_REPO_BRANCH': Buffer.from(args.indexRepoBranch).toString('base64'),
                    'INDEX_REPO_USERNAME': Buffer.from(args.indexRepoUsername).toString('base64'),
                    'INDEX_REPO_PASSWORD': Buffer.from(args.indexRepoPassword).toString('base64'),
                },
            });

            if (response.body.kind !== 'Secret' && response.response) {
                throw new Error(`Failed to create secret: ${JSON.stringify(response.response)}`);
            } else if (response.body.kind !== 'Secret') {
                throw new Error(`Failed to create secret: unknown`);
            }
        }
    }

    private async createCustomResource(args: {
        namespace: string,
        orgId: string,
        taskExecutionId: string,
    }): Promise<void> {
        const resource = {
            apiVersion: 'tools.robot.dev/v1alpha1',
            kind: 'VsCode',
            metadata: {
                name: `vscode`,
                namespace: args.namespace,
            },
            spec: {
                orgId: args.orgId,
                taskExecutionId: args.taskExecutionId,
            },
        }
        try {
            const existing = await this.objectApi.read(resource);
            if (existing.body.kind === 'VsCode') {
                Logger.getInstance('k8s-manager').info(`Custom resource already exists in namespace: ${args.namespace}`);
                return;
            }
        } catch (e) {
            Logger.getInstance('k8s-manager').info(`Creating custom resource in namespace: ${args.namespace}`);
            Logger.getInstance('k8s-manager').info(`Error: ${JSON.stringify(e)}`);
            const response = await this.objectApi.create(resource).catch((error) => {
                Logger.getInstance('k8s-manager').info(`Error: ${JSON.stringify(error)}`);
            });
            if (response?.body.kind !== 'VsCode' && response?.response) {
                throw new Error(`Failed to create custom resource: ${JSON.stringify(response.response)}`);
            } else if (response?.body.kind !== 'VsCode') {
                throw new Error(`Failed to create custom resource: unknown`);
            }
        }

    }
}