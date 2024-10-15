import fetch, {FormData, File} from "node-fetch";
import { Configuration } from "../../../../../config/configuration.js";
import { NlmIngestorModel } from "./nlm_ingestor_model.js";
import { Logger } from "../../../../../logging/logger.js";

export class NlmIngestorClient {
    apiHost: string;

    constructor() {
        this.apiHost = Configuration.NlmIngestorHost;
    }

    async ingest(filePath: string, input: { size: number, stream: ReadableStream<Uint8Array> | undefined }): Promise<NlmIngestorModel> {
        if (!input.stream) {
            throw new Error("No stream provided");
        }
        const formData = new FormData();
        Logger.getInstance("NlmIngestorClient").info(`Ingesting document ${filePath} with size ${input.size}`);

        class IngestFile extends File {
            size = input.size;
        }

        const file = new IngestFile([], filePath);
        file.stream = function () {
            return input.stream!;
        }

        formData.append("file", file);

        const response = await fetch(`http://${this.apiHost}/api/parseDocument?renderFormat=all`, {
            method: "POST",
            headers: {
                ContentType: "multipart/form-data",
            },
            body: formData,
        });
        return response.json() as Promise<NlmIngestorModel>;
    }
}