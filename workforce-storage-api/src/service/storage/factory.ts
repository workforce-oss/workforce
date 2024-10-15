import { StorageClient } from "./storage_client.js";
import { LocalStorageClient } from "./storage_client_local.js";

export class StorageClientFactory {
    public static getStorageClient(): StorageClient {
        return new LocalStorageClient();
    }
}