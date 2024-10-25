export interface RestApiCreationArgs {
    basePath: string;
    resource: string;
    objectType: string;
    validate: (item: any, objectType: string) => any[];
    accessToken?: string;
    baseUrl?: string;
    unAuthorizedCallBack?: () => void;
}

export interface RestApiInstanceOptions {
    basePath?: string;
    baseUrl?: string;
    accessToken?: string;
    unAuthorizedCallBack?: () => void;
}

export interface RestApiCallOptions {
    queryParams?: Record<string, string>;
    rootResources?: {name: string, id: string}[];
}

export abstract class RestApi<T, TValidationError> {
    private basePath: string;
    private validate: (item: T, objectType: string) => TValidationError[];
    private baseUrl?: string;
    private unAuthorizedCallBack?: () => void;
    protected accessToken?: string;
    resource: string;
    objectType: string;

    constructor(args: RestApiCreationArgs) {
        let basePath = args.basePath;
        if (basePath) {
            if (!basePath.startsWith("/")) {
                basePath = `/${basePath}`;
            }
            if (basePath.endsWith("/")) {
                basePath = basePath.slice(0, -1);
            }
        }
        this.resource = args.resource;
        this.objectType = args.objectType;
        this.basePath = basePath;
        this.validate = args.validate;
        this.baseUrl = args.baseUrl;
        this.unAuthorizedCallBack = args.unAuthorizedCallBack;
        this.accessToken = args.accessToken;
    }

    public async call<RT>(args: { method: string, subpath: string, body?: T | undefined, options?: RestApiCallOptions }): Promise<RT> {
        const { method, subpath, body, options } = args;
        const { queryParams } = options ?? {};
        const rootPath = this.rootPath(this.resource, options);

        const url = new URL(`${this.basePath}${rootPath}${subpath}`, this.baseUrl ?? `${window.location.protocol}://${window.location.host}`);
        if (queryParams) {
            Object.entries(queryParams).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });
        }
        const response = await fetch(url, {
            method: method,
            headers: this.headers(),
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            await this.handleErrors(response);
            throw new Error(`Failed to ${method} ${this.resource}`);
        }
        const json = await response.json().catch(async () => {
            await this.handleErrors(response);
            throw new Error("Failed to parse response");
        })
        if (json.error) {
            throw new Error(json.error);
        }
        return json;

    }

    public async list(options?: RestApiCallOptions): Promise<T[]> {
        
        try {
            return await this.call<T[]>({ method: "GET", subpath: "", options });
        } catch (e) {
            throw new Error(`Failed to list: ${e}`);
        }
    }

    public async get(id: string, options?: RestApiCallOptions): Promise<T> {
        try {
            return this.call<T>({ method: "GET", subpath: `/${id}`, options });
        } catch (e) {
            throw new Error(`Failed to get: ${e}`);
        }
    }

    public async create(item: T, options?: RestApiCallOptions): Promise<T | TValidationError[]> {
        const errors = this.validate(item, this.objectType);
        if (errors.length > 0) {
            return errors;
        }
        try {
            return this.call<T>({ method: "POST", subpath: "", body: item, options });
        } catch (e) {
            throw new Error(`Failed to create: ${e}`);
        }
    }

    public async update(item: T, id: string, options?: RestApiCallOptions): Promise<T | TValidationError[]> {
        const errors = this.validate(item, this.objectType);
        if (errors.length > 0) {
            return errors;
        }
        return this.call<T>({ method: "PUT", subpath: `/${id}`, body: item, options }).catch((e) => {
            throw new Error(`Failed to update: ${e}`);
        });
    }

    public async delete(id: string, options?: RestApiCallOptions): Promise<void> {
        return this.call<void>({ method: "DELETE", subpath: `/${id}`, options }).catch((e) => {
            throw new Error(`Failed to delete: ${e}`);
        });
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

    async handleErrors(response: Response): Promise<void> {
        console.error(response);
        if (response.status === 401 && this.unAuthorizedCallBack) {
            this.unAuthorizedCallBack();
        }
    }

    private rootPath(resource: string, options?: RestApiCallOptions): string {
        const { rootResources } = options ?? {};
        let subpath = "";
        for (const rootResource of rootResources ?? []) {
            subpath += `/${rootResource.name}/${rootResource.id}`;
        }
        subpath += `/${resource}`;
        return subpath;
    }

}
