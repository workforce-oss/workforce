import { Stream } from "stream";
import { UploadResult } from "../../model/internal.js";
import fs from "fs";

export interface StorageClient {
    uploadFile(orgId: string, repositoryId: string, name: string, fileStream: Stream, size?: number): Promise<UploadResult>;
    downloadFile(orgId: string, repositoryId: string, name: string): Promise<{stats: fs.Stats, stream: Stream}>;
    deleteFile(orgId: string, repositoryId: string, name: string): Promise<boolean>;
    listRepositories(orgId: string): Promise<string[]>;
    listFiles(orgId: string, repositoryId: string): Promise<string[]>;
}

