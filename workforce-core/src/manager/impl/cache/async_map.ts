export interface AsyncMap<T> {
    has(key: string): Promise<boolean>;
    get(key: string): Promise<T | undefined>;
    set(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
    destroy(): Promise<void>;
}