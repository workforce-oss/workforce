import { Stream } from "stream";
import { DocumentDb, DocumentRepositoryDb, Logger, OrgUserRelationDb } from "workforce-core";
import { UploadResult } from "./model/internal.js";
import { MessagingService } from "./service/messaging_service.js";
import { StorageService } from "./service/storage_service.js";

export async function uploadFile(req: any, res: any, storageService: StorageService, messagingService: MessagingService) {
    try {
        if (!validateRequest(req, res)) {
            return res.status(401).send("Unauthorized");
        }

        Logger.getInstance("uploadFile").info("Uploading file");

        const orgId = req.params.orgId;
        if (!orgId) {
            Logger.getInstance("uploadFile").info("No org id was provided.");
            return res.status(400).send("No org id was provided.");
        }

        if (!req.files) {
            Logger.getInstance("uploadFile").info("No files were provided.");
            return res.status(400).send("No files were uploaded.");
        }
        if (!req.params.repositoryId) {
            Logger.getInstance("uploadFile").info("No repository id was provided.");
            return res.status(400).send("No repository id was provided.");
        }

        Logger.getInstance("uploadFile").info(`Searching for repository: ${req.params.repositoryId}`);
        const repositoryDb = await DocumentRepositoryDb.findByPk(req.params.repositoryId);
        if (!repositoryDb) {
            Logger.getInstance("uploadFile").info(`Repository not found: ${req.params.repositoryId}`);
            return res.status(404).send("Repository not found");
        }
        Logger.getInstance("uploadFile").info(`Repository found: ${req.params.repositoryId}`);

        const repositoryId = req.params.repositoryId;

        if (Array.isArray(req.files)) {
            Logger.getInstance("uploadFile").info("Uploading multiple files");
            const files = req.files as Express.Multer.File[];

            for (const file of files) {
                const buffer = file.buffer;
                if (!buffer) {
                    Logger.getInstance("uploadFile").info("No file buffer found");
                    return res.status(400).send("No file buffer found");
                }
                file.stream = Stream.Readable.from(buffer);
                console.log(`Uploading file: ${file.filename}`);
                const result = await storageService.uploadFile(orgId as string, repositoryId, file.originalname, file.stream).catch((error) => {
                    Logger.getInstance("uploadFile").error(error);
                    const result: UploadResult = { success: false, hash: "" };
                    return result;
                });


                if (!result || !result.success) {
                    Logger.getInstance("uploadFile").error("Error uploading file");
                    return res.status(500).send("Error uploading file");
                } else {
                    const document = await DocumentDb.findOrCreate({
                        where: {
                            repositoryId: repositoryId,
                            location: `${orgId}/${repositoryId}/${file.originalname}`,
                        },
                        defaults: {
                            format: file.mimetype,
                            location: `${orgId}/${repositoryId}/${file.originalname}`,
                            name: file.originalname,
                            repositoryId: repositoryId,
                            status: "uploaded",
                            hash: result.hash
                        }
                    })
                        .catch((error) => {
                            console.error(error);
                            return null;
                        });
                    if (!document || !document[0]) {
                        Logger.getInstance("uploadFile").error(`Error creating document at ${orgId}/${repositoryId}/${file.originalname}`);
                        return res.status(500).send(`Error creating document at ${orgId}/${repositoryId}/${file.originalname}`);
                    }

                    if (document[0].hash !== result.hash) {
                        document[0].hash = result.hash;
                        document[0].status = "uploaded";
                        const updated = await document[0].save();
                        const data = updated.toModel();
                        data.hash = result.hash;
                        data.status = "uploaded";
                        messagingService.sendEvent(data);
                        return res.send("OK");
                    }
            

                    const data = document[0].toModel();
                    data.hash = result.hash;
                    messagingService.sendEvent(data);
                }
            }
            return res.send("OK");
        } else {
            Logger.getInstance("uploadFile").info("Uploading multiple files");
            const files = req.files as {
                [fieldname: string]: Express.Multer.File[];
            };
            for (const fieldname in files) {
                Logger.getInstance("uploadFile").info(`Uploading files for field: ${fieldname}`);
                for (const file of files[fieldname]) {
                    const buffer = file.buffer;
                    if (!buffer) {
                        Logger.getInstance("uploadFile").info("No file buffer found");
                        return res.status(400).send("No file buffer found");
                    }
                    const stream = Stream.Readable.from(buffer);
                    const result = await storageService.uploadFile(orgId as string, repositoryId, file.originalname, stream).catch((error) => {
                        Logger.getInstance("uploadFile").error(error);
                        return { success: false, hash: "" };
                    });
                    if (!result || !result.success) {
                        Logger.getInstance("uploadFile").error("Error uploading file");
                        return res.status(500).send("Error uploading file");
                    } else {
                        const document = await DocumentDb.findOrCreate({
                            where: {
                                repositoryId: repositoryId,
                                location: `${orgId}/${repositoryId}/${file.originalname}`
                            },
                            defaults: {
                                format: file.mimetype,
                                location: `${orgId}/${repositoryId}/${file.originalname}`,
                                name: file.originalname,
                                repositoryId: repositoryId,
                                status: "uploaded",
                                hash: result.hash
                            }

                        });

                        if (document[0].hash !== result.hash) {
                            document[0].hash = result.hash;
                            document[0].status = "uploaded";
                            const updated = await document[0].save();
                            const data = updated.toModel();
                            data.hash = result.hash;
                            data.status = "uploaded";
                            messagingService.sendEvent(data);
                            return res.send("OK");
                        }
                

                        const data = document[0].toModel();
                        messagingService.sendEvent(data);
                    }
                }
            }

        }
        res.send("OK");
    } catch (error) {
        Logger.getInstance("uploadFile").error(JSON.stringify(error));
        res.status(500).send(error);
    }
}

export async function uploadFileRaw(req: any, res: any, storageService: StorageService, messagingService: MessagingService) {
    try {
        if (!validateRequest(req, res)) {
            return res.status(401).send("Unauthorized");
        }
        // const clientId = req.auth?.payload.client_id;
        // if (!clientId) {
        //     Logger.getInstance("uploadFileRaw").info("No client id was provided.");
        //     return res.status(404).send("Not Found");
        // }

        if (!req.params.orgId) {
            Logger.getInstance("uploadFileRaw").info("No org id was provided.");
            return res.status(400).send("No org id was provided.");
        }

        if (!req.params.repositoryId) {
            Logger.getInstance("uploadFileRaw").info("No repository id was provided.");
            return res.status(400).send("No repository id was provided.");
        }

        const orgId = req.params.orgId;
        const repositoryId = req.params.repositoryId;

        if (!req.body) {
            Logger.getInstance("uploadFileRaw").info("No body was provided.");
            return res.status(400).send("No body was provided.");
        } else if (!req.body.path) {
            Logger.getInstance("uploadFileRaw").info("No path was provided.");
            return res.status(400).send("No path was provided.");
        } else if (!req.body.content) {
            Logger.getInstance("uploadFileRaw").info("No content was provided.");
            return res.status(400).send("No content was provided.");
        }

        const path = req.body.path as string;
        const content = req.body.content as string;
        const size = req.body.size as number;

        const stream = Stream.Readable.from(content);
        const result = await storageService.uploadFile(orgId, repositoryId, path, stream, size).catch((error) => {
            Logger.getInstance("uploadFileRaw").error(error);
            return { success: false, hash: "" };
        });

        if (!result || !result.success) {
            Logger.getInstance("uploadFileRaw").error("Error uploading file");
            return res.status(500).send("Error uploading file");
        }

        const fileExtension = path.split('.').pop();

        const document = await DocumentDb.findOrCreate({
            where: {
                repositoryId: repositoryId,
                location: `${orgId}/${repositoryId}/${path}`
            },
            defaults: {
                format: fileExtension ?? "text",
                location: `${orgId}/${repositoryId}/${path}`,
                name: path,
                repositoryId: repositoryId,
                status: "uploaded",
                hash: result.hash
            }

        });
        if (!document || !document[0]) {
            Logger.getInstance("uploadFileRaw").error(`Error creating document at ${orgId}/${repositoryId}/${path}`);
            return res.status(500).send(`Error creating document at ${orgId}/${repositoryId}/${path}`);
        }


        if (document[0].hash !== result.hash) {
            document[0].hash = result.hash;
            document[0].status = "uploaded";
            const updated = await document[0].save();
            const data = updated.toModel();
            data.hash = result.hash;
            data.status = "uploaded";
            messagingService.sendEvent(data);
            return res.send("OK");
        }

        const data = document[0].toModel();
        messagingService.sendEvent(data);
        res.send("OK");
    } catch (error) {
        Logger.getInstance("uploadFileRaw").error(JSON.stringify(error));
        return res.status(500).send(error);
    }
}

export async function downloadFile(req: any, res: any, storageService: StorageService) {
    try {

        if (!validateRequest(req, res)) {
            return res.status(401).send("Unauthorized");
        }

        // const clientId = req.auth?.payload.client_id;
        // if (!clientId) {
        //     Logger.getInstance("downloadFile").info("No client id was provided.");
        //     return res.status(404).send("Not Found");
        // }

        if (!req.params.orgId) {
            Logger.getInstance("downloadFile").info("No org id was provided.");
            return res.status(400).send("No org id was provided.");
        }

        if (!req.params.repositoryId) {
            Logger.getInstance("downloadFile").info("No repository id was provided.");
            return res.status(400).send("No repository id was provided.");
        }

        if (!req.params.documentId) {
            Logger.getInstance("downloadFile").info("No document id was provided.");
            return res.status(400).send("No document id was provided.");
        }


        const orgId = req.params.orgId;
        const repositoryId = req.params.repositoryId;
        const documentId = req.params.documentId;

        const document = await DocumentDb.findByPk(documentId);
        if (!document) {
            Logger.getInstance("downloadFile").info(`Document not found in database: ${documentId}`);
            return res.status(404).send("Not Found");
        }

        const result = await storageService.downloadFile(orgId as string, repositoryId, document.name);
        res.setHeader("Content-Length", result.stats.size);
        result.stream.pipe(res);
    } catch (error) {
        Logger.getInstance("downloadFile").error(JSON.stringify(error));
        res.status(500).send(error);
    }
}

export async function deleteFile(req: any, res: any, storageService: StorageService, messagingService: MessagingService) {
    try {
        if (!validateRequest(req, res)) {
            return res.status(401).send("Unauthorized");
        }

        let orgId = req.params.orgId;
        if (!orgId) {
            Logger.getInstance("deleteFile").info("No org id was provided.");
            return res.status(404).send("Not Found");
        }

        if (!req.params.repositoryId) {
            Logger.getInstance("deleteFile").info("No repository id was provided.");
            return res.status(400).send("No repository id was provided.");
        }

        if (!req.params.documentId) {
            Logger.getInstance("deleteFile").info("No document id was provided.");
            return res.status(400).send("No document id was provided.");
        }

        const repositoryId = req.params.repositoryId;
        const documentId = req.params.documentId;

        const document = await DocumentDb.findByPk(documentId);
        if (!document) {
            Logger.getInstance("deleteFile").info(`Document not found in database: ${documentId}`);
            return res.status(404).send("Not Found");
        }

        const result = await storageService.deleteFile(orgId as string, repositoryId, document.name);
        if (!result) {
            Logger.getInstance("deleteFile").error("Error deleting file");
            return res.status(500).send("Error deleting file");
        }

        document.status = "deleted";
        await document.save();

        const model = document.toModel();

        messagingService.sendEvent(model);

        res.send("OK");
    } catch (error) {
        Logger.getInstance("deleteFile").error(JSON.stringify(error));
        res.status(500).send(error);
    }
}

export async function listRepositories(req: any, res: any, storageService: StorageService) {
    try {
        if (!validateRequest(req, res)) {
            return res.status(401).send("Unauthorized");
        }
        const orgId = req.params.orgId;

        if (!orgId) {
            Logger.getInstance("listRepositories").info("No org id was provided.");
            return res.status(401).send("Unauthorized");
        }

        const repositories = await storageService.listRepositories(orgId as string);
        res.send(repositories);
    } catch (error) {
        console.error(error);
        res.status(500).send(error);
    }
}

export async function listFiles(req: any, res: any, storageService: StorageService) {
    try {
        if (!validateRequest(req, res)) {
            return res.status(401).send("Unauthorized");
        }
        const orgId = req.params.orgId;

        if (!orgId) {
            return res.status(400).send("No org id was provided.");
        }

        if (!req.params.repositoryId) {
            return res.status(400).send("No repository id was provided.");
        }

        const repositoryId = req.params.repositoryId;

        const files = await storageService.listFiles(orgId as string, repositoryId);
        res.send(files);
    } catch (error) {
        console.error(error);
        res.status(500).send(error);
    }
}

export async function healthCheck(req: any, res: any) {
    res.send("OK");
}

//TODO: Make the authorization here more robust
async function validateRequest(req: any, res: any): Promise<boolean> {
    const disableAuth = process.env.DISABLE_AUTH === "true";
    if (disableAuth) {
        return true;
    }
    const clientId = req.auth?.payload.client_id;
    const orgId = req.auth?.payload.orgId;
    if (clientId && (clientId === "workforce-api" || clientId === "workforce-engine")) {
        return true;
    } else if (orgId) {
        const orgUserRelation = await OrgUserRelationDb.findOne({
            where: {
                orgId: orgId,
                userId: req.auth?.payload.sub
            }
        }).catch((error) => {
            Logger.getInstance("validateRequest").error(error);
            return null;
        });

        if (orgUserRelation) {
            return true;
        }
    }
    return false;
}