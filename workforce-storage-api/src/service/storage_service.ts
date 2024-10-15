import { Stream } from "stream";
import { StorageClient } from "./storage/storage_client.js";
import { MessagingService } from "./messaging_service.js";
import { UploadResult } from "../model/internal.js";
import fs from "fs";

export class StorageService {
    private storageClient: StorageClient;
    private messagingService: MessagingService;

    constructor(storageClient: StorageClient, messagingService: MessagingService) {
        this.storageClient = storageClient;
        this.messagingService = messagingService;
    }

    async uploadFile(orgId: string, repositoryId: string, name: string, fileStream: Stream, size?: number): Promise<UploadResult> {
        return new Promise((resolve, reject) => {
            this.storageClient.uploadFile(orgId, repositoryId, name, fileStream, size).then((result) => {
                resolve(result);
            }).catch((error) => {
                console.error(error);
                reject(error);
            });
        });
    }

    async downloadFile(orgId: string, repositoryId: string, name: string): Promise<{stats: fs.Stats, stream: Stream}> {
        return new Promise((resolve, reject) => {
            this.storageClient.downloadFile(orgId, repositoryId, name).then((result) => {
                resolve(result);
            }).catch((error) => {
                console.error(error);
                reject(error);
            });
        });
    }

    async deleteFile(orgId: string, repositoryId: string, name: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.storageClient.deleteFile(orgId, repositoryId, name).then((result) => {
                resolve(result);
            }).catch((error) => {
                console.error(error);
                if (error.code && error.code === "ENOENT") {
                    resolve(true);
                    return;
                }
                reject(error);
            });
        });
    }

    async listRepositories(orgId: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            this.storageClient.listRepositories(orgId).then((result) => {
                resolve(result);
            }).catch((error) => {
                console.error(error);
                reject(error);
            });
        });
    }

    async listFiles(orgId: string, repositoryId: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            this.storageClient.listFiles(orgId, repositoryId).then((result) => {
                resolve(result);
            }).catch((error) => {
                console.error(error);
                reject(error);
            });
        });
    }

}