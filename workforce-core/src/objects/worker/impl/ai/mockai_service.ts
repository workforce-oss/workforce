import { ChatMessage } from "../../model.js";
import { AIService } from "./ai_service.js";

export class MockAIService implements AIService {
    inference(): Promise<ChatMessage> {
        throw new Error("Method not implemented.");
    }

}