import express, { RequestHandler } from "express";
import multer, { memoryStorage } from "multer";
import { deleteFile, downloadFile, listFiles, listRepositories, uploadFileRaw,  uploadFile as uploadFileStream } from "./api.js";
import { MessagingService } from "./service/messaging_service.js";
import { MulterStreamingEngine } from "./service/storage/multer_streaming_engine.js";
import { StorageService } from "./service/storage_service.js";
import bodyParser from "body-parser";


export function initStorageService(api: express.Router, storageService: StorageService, messagingService: MessagingService): void {
    const storage = new MulterStreamingEngine();
    
    const uploadRawFile = multer({
        storage: memoryStorage(),
        limits: {
            // 100MB, fileSizes are in bytes
            fileSize: 10 * 1024 * 1024 * 1024,
            fieldNameSize: 256,
            fields: 10,
        }
    }) as any;

    
    //Public Endpoints
    api.get("/repositories", async (req, res) => listRepositories(req, res, storageService));
    api.get("/repositories/:repositoryId/documents", async (req, res) => listFiles(req, res, storageService));
    api.post("/repositories/:repositoryId/documents", uploadRawFile.array("files"), async (req, res) => uploadFileStream(req, res, storageService, messagingService));
    api.delete("/repositories/:repositoryId/documents/:documentId", async (req, res) => deleteFile(req, res, storageService, messagingService));

    //Private Endpoints
    api.get("/orgs/:orgId/repositories/:repositoryId/documents/:documentId", async (req, res) => downloadFile(req, res, storageService));
    api.delete("/orgs/:orgId/repositories/:repositoryId/documents/:documentId", async (req, res) => deleteFile(req, res, storageService, messagingService));
    api.post("/orgs/:orgId/repositories/:repositoryId/documents", bodyParser.json(), async (req, res) => uploadFileRaw(req, res, storageService, messagingService));

}