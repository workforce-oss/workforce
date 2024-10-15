import { Configuration } from "../../../../../config/configuration.js";
import { ApiClient } from "../../../../base/api_client.js";


export class StorageApiClient extends ApiClient {
    private _apiUrl: string;

    constructor() {
        super("StorageApiClient");
        this._apiUrl = Configuration.StorageApiUri;
    }

    async getDocumentStream(orgId: string, repositoryId: string, documentId: string): Promise<{size: number, stream:ReadableStream<Uint8Array> | undefined} | undefined> {
        await this.checkAuthentication();
        const response = await fetch(`${this._apiUrl}/orgs/${orgId}/repositories/${repositoryId}/documents/${documentId}`, {
            headers: {
                Authorization: `Bearer ${this._token}`,
                Accept: "application/json",
            },
        });
        if (response.status === 404) {
            this.logger.debug(`getDocumentStream() Document ${documentId} not found`);
            return undefined;
        } else if (!response.ok) {
            this.logger.error(
                `getDocumentStream() Error getting document ${documentId}: ${response.statusText}`
            );
            throw new Error(response.statusText);
        }
        const size = parseInt(response.headers.get("Content-Length") ?? "0");
        return {size, stream: response.body ?? undefined};
    }

    async uploadDocument(orgId: string, repositoryId: string, path: string, content: string, size?: number): Promise<void> {
        await this.checkAuthentication();
        const response = await fetch(`${this._apiUrl}/orgs/${orgId}/repositories/${repositoryId}/documents`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this._token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                path,
                size: size ?? content.length,
                content,
            }),
        });
        if (!response.ok) {
            this.logger.error(
                `uploadDocument() Error uploading document ${path}: ${response.statusText}`
            );
            throw new Error(response.statusText);
        }
    }
}