import { Prospect } from "workforce-core/model";

export class ProspectAdminAPI {
    static instance: ProspectAdminAPI | undefined;
    private baseUrl?: string;
    private accessToken?: string;
    private unAuthorizedCallBack?: () => void;

    static getInstance(args: { accessToken?: string, baseUrl?: string, unAuthorizedCallBack?: () => void }): ProspectAdminAPI {
        const { accessToken, baseUrl, unAuthorizedCallBack } = args;
        if (!ProspectAdminAPI.instance || accessToken !== ProspectAdminAPI.instance.accessToken) {
            ProspectAdminAPI.instance = new ProspectAdminAPI("/prospect-admin-api", baseUrl, accessToken, unAuthorizedCallBack);
        }
        return ProspectAdminAPI.instance;
    }

    private basePath: string;

    private constructor(basePath: string, baseUrl?: string, accessToken?: string, unAuthorizedCallBack?: () => void) {
        this.basePath = basePath;
        this.baseUrl = baseUrl;
        this.accessToken = accessToken;
        this.unAuthorizedCallBack = unAuthorizedCallBack;
    }

    async create(prospect: Prospect): Promise<boolean> {

        const url = new URL(`${this.basePath}/prospects`);

        const response = await fetch(url, {
            method: "POST",
            headers: this.headers(),
            body: JSON.stringify(prospect),
        });
        if (!response.ok) {
            this.handleErrors(response);
            return false;
        } else {
            return true;
        }
    }

    async update(prospect: Prospect): Promise<boolean> {
        const url = new URL(`${this.basePath}/prospects/${prospect.id}`, this.baseUrl ?? `${window.location.protocol}//${window.location.host}`);

        const response = await fetch(url, {
            method: "PUT",
            headers: this.headers(),
            body: JSON.stringify(prospect),
        });
        if (!response.ok) {
            this.handleErrors(response);
            return false;
        } else {
            return true;
        }
    }

    async list(queryParams: { firstName?: string, lastName?: string, email?: string, status?: string, company?: string, count?: number, offset?: number }): Promise<Prospect[]> {
        const url = new URL(`${this.basePath}/prospects`, this.baseUrl ?? `${window.location.protocol}//${window.location.host}`);
        
        Object.keys(queryParams).forEach(key => queryParams[key] && url.searchParams.append(key, queryParams[key]));
        
        const response = await fetch(url, {
            method: "GET",
            headers: this.headers(),
        });
        if (!response.ok) {
            this.handleErrors(response);
            return [];
        } else {
            return response.json();
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