import { RestApi, RestApiCallOptions } from "./rest_api.js";


export abstract class SubResourceApi<T, TValidationError, TOptions extends RestApiCallOptions> extends RestApi<T, TValidationError> {
    abstract rootResources(options: TOptions): { name: string; id: string }[];

    public async list(options: TOptions): Promise<T[]> {
        return super.list({ rootResources: this.rootResources(options), queryParams: options.queryParams});
    }

    public async get(id: string, options: TOptions): Promise<T> {
        return super.get(id, { rootResources: this.rootResources(options), queryParams: options.queryParams });
    }

    public async create(item: T, options: TOptions): Promise<T | TValidationError[]> {
        return super.create(item, { rootResources: this.rootResources(options), queryParams: options.queryParams });
    }

    public async update(item: T, id: string, options: TOptions): Promise<T | TValidationError[]> {
        return super.update(item, id, { rootResources: this.rootResources(options), queryParams: options.queryParams });
    }

    public async delete(id: string, options: TOptions): Promise<void> {
        return super.delete(id, { rootResources: this.rootResources(options), queryParams: options.queryParams });
    }
}