import { Logger } from "../../../../../logging/logger.js";
import { DocumentChunkModel, DocumentModel, DocumentSectionModel } from "../model.js";
import { NlmIngestorClient } from "./nlm_ingestor_client.js";
import { NlmBlock } from "./nlm_ingestor_model.js";
import { Parser } from "./parser.js";

export class NlmIngestorParser implements Parser {
    private format: string;

    constructor(format: string) {
        this.format = format;
    }
    parseDocument(): Promise<DocumentModel> {
        throw new Error("Method not implemented.");
    }
    async parseFile(name: string, input: { size: number, stream: ReadableStream<Uint8Array> | undefined }): Promise<DocumentModel> {
        const client = new NlmIngestorClient();
        const model = await client.ingest(name, input);
        Logger.getInstance("NlmIngestorParser").info("Ingested document", JSON.stringify(model, null, 2));
        if (!model?.return_dict?.result?.blocks) {
            throw new Error("Failed to ingest document");
        }


        const blocks = model.return_dict.result.blocks;
        blocks.sort((a: NlmBlock, b: NlmBlock) => a.block_idx - b.block_idx);
        const document: DocumentModel = {
            name: name,
            format: this.format,
            repository: {
                name: "default",
                embeddingSecret: ""
            },
            location: "",
            sections: []
        };
        const sections = [];
        let currentSection: DocumentSectionModel = {
            name: `${name}-0`,
            description: "",
            chunks: []
        };
        let currentChunk: DocumentChunkModel = {
            content: "",
            position: 0
        };
        for (const block of blocks) {
            const sentences = block.sentences;
            switch (block.tag) {
                case "header":
                    if (!sentences) {
                        break;
                    }
                    if (currentChunk.content.trim() !== "") {
                        currentSection.chunks.push(currentChunk);
                        currentChunk = {
                            content: "",
                            position: currentSection.chunks.length
                        }
                    }
                    if (currentSection.chunks.length > 0) {
                        sections.push(currentSection);
                        currentSection = {
                            name: `${name}-${sections.length}-h${block.level}`,
                            description: sentences?.join(" ") || "",
                            chunks: []
                        }
                        currentChunk = {
                            content: "",
                            position: 0
                        }
                    } else {
                        if (currentSection.description.trim() !== "") {
                            currentSection.description += " " + sentences?.join(" ") || "";
                        } else {
                            currentSection.description = sentences?.join(" ") || "";
                        }
                    }
                    break;
                case "para":
                    if (!sentences) {
                        break;
                    }
                    if (currentChunk.content.trim() !== "") {
                        currentSection.chunks.push(currentChunk);
                        currentChunk = {
                            content: "",
                            position: currentSection.chunks.length
                        }
                    }
                    currentChunk.content += sentences.join(" ");
                    break;
                case "list_item":
                    if (!sentences) {
                        break;
                    }
                    currentChunk.content += sentences.join(" ") + "\n";
                    break;
                case "numbered_list_item":
                    if (!sentences) {
                        break;
                    }
                    currentChunk.content += sentences.join(" ") + "\n";
                    break;
                case "table":
                    if (!block.table_rows) {
                        break;
                    }
                    for (const table_row of block.table_rows) {
                        for (const cell of table_row.cells) {
                            if (cell.cell_value.trim() === "") {
                                continue;
                            }
                            currentChunk.content += cell.cell_value + " ";
                        }
                        currentChunk.content += "\n";
                    }
                    break;
            }
        }
        if (currentChunk.content.trim() !== "") {
            currentSection.chunks.push(currentChunk);
        }
        sections.push(currentSection);
        document.sections = sections;
        return document;
    }
}