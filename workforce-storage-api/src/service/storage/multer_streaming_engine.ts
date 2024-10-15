import { Request } from "express";
import { Stream } from "stream";
import multer, { StorageEngine } from "multer";

export type StreamingEngineFileData = {
    path: string,
    originalName: string,
    stream: Stream,
    callback: (error: Error | null, info: { path: string, size: number }) => void
}

export class MulterStreamingEngine implements StorageEngine {

    public _handleFile(req: Request, file: Express.Multer.File, cb: (error: Error | null, info: Partial<Express.Multer.File>) => void) {
        cb(null, {
            size: req.headers['content-length'] as number | undefined,
        });
    }

    public _removeFile(req: Request, file: Express.Multer.File, cb: (error: Error | null) => void) {
        cb(null);
    }
}