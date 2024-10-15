import { DocumentModel } from "../model.js";
import { NlmIngestorParser } from "./nlm_ingestor_parser.js";

export interface Parser {
    parseDocument(name: string, content: string): Promise<DocumentModel>;
    parseFile(name: string, input: {size: number, stream:ReadableStream<Uint8Array> | undefined}): Promise<DocumentModel>;
}

export class ParserFactory {
    public static getParser(format: string): Parser {
        return new NlmIngestorParser(format);
    }
}