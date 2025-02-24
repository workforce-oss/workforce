import { WorkerConfig } from "../../model.js";
import { anthropicModels, googleModels, mockModels, openAIModels, openAIRealtimeModels } from "./ai_models.js";
import { AIService } from "./ai_service.js";
import { AnthropicAIService } from "./anthropic_service.js";
import { GoogleAIService } from "./google_service.js";
import { MockAIService } from "./mockai_service.js";
import { OpenAIRealtimeService } from "./openai_realtime_service.js";
import { OpenAIService } from "./openai_service.js";

export class AIServiceFactory {
    static create(config: WorkerConfig): AIService {
        if (config.variables?.model && openAIModels.includes(config.variables.model as string)) {
            return new OpenAIService(config);
        } else if (config.variables?.model && openAIRealtimeModels.includes(config.variables.model as string)) {
            return new OpenAIRealtimeService(config);
        } else if (config.variables?.model && anthropicModels.includes(config.variables.model as string)) {
            return new AnthropicAIService(config);
        } else if (config.variables?.model && googleModels.includes(config.variables.model as string)) {
            return new GoogleAIService(config);
        } else if (config.variables?.model && mockModels.includes(config.variables.model as string)) {
            return new MockAIService();
        } else {
            throw new Error(`Unknown AI service type: ${config.type}`);
        }
    }
}

