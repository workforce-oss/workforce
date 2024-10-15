export class StorageAPI {
    static instance: StorageAPI | undefined;
    private baseUrl?: string;
    private accessToken?: string;
    private unAuthorizedCallBack?: () => void;

    static getInstance(args: { accessToken?: string, baseUrl?: string, unAuthorizedCallBack?: () => void }): StorageAPI {
        if (!StorageAPI.instance || args.accessToken !== StorageAPI.instance.accessToken) {
            StorageAPI.instance = new StorageAPI("/storage-api", args.baseUrl, args.accessToken, args.unAuthorizedCallBack);
        }
        return StorageAPI.instance;
    }

    private basePath: string;

    constructor(basePath: string, baseUrl?: string, accessToken?: string, unAuthorizedCallBack?: () => void) {
        this.basePath = basePath;
        this.baseUrl = baseUrl;
        this.accessToken = accessToken;
        this.unAuthorizedCallBack = unAuthorizedCallBack

    }

    async call(repositoryId: string, formData: FormData): Promise<boolean> {
        const url = new URL(`${this.basePath}/repositories/${repositoryId}/documents`, this.baseUrl ?? `${window.location.protocol}//${window.location.host}`);
        const response = await fetch(url, {
            method: "POST",
            headers: this.headers(),
            body: formData,
        });
        if (!response.ok) {
            this.handleErrors(response);
            return false;
        } else {
            return true;
        }
    }

    async delete(repositoryId: string, documentId: string): Promise<boolean> {
        const url = new URL(`${this.basePath}/repositories/${repositoryId}/documents/${documentId}`, this.baseUrl ?? `${window.location.protocol}//${window.location.host}`);
        const response = await fetch(url, {
            method: "DELETE",
            headers: this.headers(),
        });
        if (!response.ok) {
            this.handleErrors(response);
            return false;
        } else {
            return true;
        }
    }

    headers(): HeadersInit {
        const headers = {
            "Content-Type": "application/json",
        };
        if (this.accessToken) {
            headers["Authorization"] = `Bearer ${this.accessToken}`;
        }
        return headers;
    }

    handleErrors(response: Response): void {
        console.error(response);
        if (response.status === 401 && this.unAuthorizedCallBack) {
            this.unAuthorizedCallBack();
        }
    }
}