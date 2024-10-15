import { WorkerConfig } from "../../model.js";
import { anthropicModels, mockModels, openAIModels } from "./ai_models.js";
import { AIService } from "./ai_service.js";
import { AnthropicAIService } from "./anthropic_service.js";
import { MockAIService } from "./mockai_service.js";
import { OpenAIService } from "./openai_service.js";

export class AIServiceFactory {
    static create(config: WorkerConfig): AIService {
        if (config.variables?.model && openAIModels.includes(config.variables.model as string)) {
            return new OpenAIService(config);
        // } else if (config.variables?.model && groqModels.includes(config.variables.model as string)) {
        //     // return new GroqAIService(config);
        } else if (config.variables?.model && anthropicModels.includes(config.variables.model as string)) {
            return new AnthropicAIService(config);
        } else if (config.variables?.model && mockModels.includes(config.variables.model as string)) {
            return new MockAIService();
        } else {
            throw new Error(`Unknown AI service type: ${config.subtype}`);
        }
    }
}

