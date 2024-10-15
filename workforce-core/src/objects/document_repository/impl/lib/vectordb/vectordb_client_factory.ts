import { VectorDbCreationArgs } from "./model.js";
import { VectorDbClient } from "./vectordb_client.js";
import { WeaviateVectorDbClient } from "./weaviate_client.js";

export class VectorDbClientFactory {

    static createVectorDBClient(args: VectorDbCreationArgs): VectorDbClient {
        return new WeaviateVectorDbClient({ scheme: args.scheme, host: args.host, port: args.port, grpcHost: args.grpcHost, grpcPort: args.grpcPort, apiKey: args.apiKey});
    }
}