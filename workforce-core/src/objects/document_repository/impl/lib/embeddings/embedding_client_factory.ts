import { EmbeddingClient } from "./embedding_client.js";
import { OpenAiEmbeddingClient } from "./embedding_client_openai.js";

export interface EmbeddingClientCreationArgs {
    apiKey: string,
}

export class EmbeddingClientFactory {
    public static createClient(args: EmbeddingClientCreationArgs): EmbeddingClient {
        return new OpenAiEmbeddingClient(args.apiKey);
    }
}