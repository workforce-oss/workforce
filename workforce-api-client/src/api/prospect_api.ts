import { Prospect } from "workforce-core/model";

export class ProspectAPI {
    static instance: ProspectAPI | undefined;
    private baseUrl?: string;

    static getInstance(basePath?: string, baseUrl?: string): ProspectAPI {
        if (!ProspectAPI.instance) {
            ProspectAPI.instance = new ProspectAPI(basePath ?? "/prospect-api", baseUrl);
        }
        return ProspectAPI.instance;
    }

    private basePath: string;
    constructor(basePath: string, baseUrl?: string) {
        this.basePath = basePath;
        this.baseUrl = baseUrl;
    }

    async create(prospect: Prospect): Promise<boolean> {
        const url = new URL(`${this.basePath}/prospects`, this.baseUrl ?? `${window.location.protocol}//${window.location.host}`);
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(prospect),
        });
        if (!response.ok) {
            console.error(response);
            return false;
        } else {
            return true;
        }
    }
}