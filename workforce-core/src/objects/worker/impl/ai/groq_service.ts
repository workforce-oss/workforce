// import { Observable, Subscription } from "rxjs";
// import { Logger } from "../../../../logging/logger.js";
// import { ChatMessage, ChatRole, ChatSession, WorkerConfig } from "../../model.js";
// import { AIService } from "./ai_service.js";
// import _ from "lodash";
// import { jsonParse } from "../../../../util/json.js";
// import { isCompleteSentence } from "../../../../util/util.js";
// import { Groq } from 'groq-sdk';
// import { ChatCompletion, CompletionCreateParams } from "groq-sdk/resources/chat/completions";
// import { randomUUID } from "crypto";
// import { TASK_COMPLETE_FUNCTION_NAME, ToolCall } from "../../../base/model.js";
// import { ChatCompletionChunk } from "groq-sdk/lib/chat_completions_ext.js";
// import { error } from "console";
// import { FunctionDocument } from "../../../../util/openapi.js";

// TODO: RE-IMPLEMENT
export class GroqAIService {

}

// export class GroqAIService implements AIService {
//     private groq?: Groq;
//     private config: WorkerConfig;
//     private logger: Logger = Logger.getInstance("GroqAIService");
//     private functionDescriptionModel = "llama3-8b-8192"

//     constructor(config: WorkerConfig) {
//         this.logger.debug("Creating GroqAIService");
//         this.config = config;
//         if (!this.config.variables?.api_token) {
//             throw new Error("API token not set");
//         }
//         try {
//             this.groq = new Groq({
//                 apiKey: this.config.variables.api_token as string,
//             });
//         } catch (e) {
//             this.logger.error(`Error creating GroqAIService: `, error);
//         }
//     }

//     async inference(args: {
//         chatSession: ChatSession,
//         functions: FunctionDocument[] | undefined,
//         explainFunctions?: boolean,
//         singleMessage?: boolean,
//         partialResponseCallBack?: (partial: ChatMessage) => Promise<void>,
//         modelOverride?: string,
//         cancel?: Observable<boolean>,
//         channelMessageId?: string,
//         username?: string
//     }
//     ): Promise<ChatMessage> {
//         const { chatSession, functions, singleMessage, partialResponseCallBack, modelOverride, cancel, channelMessageId, username } = args;

//         this.logger.debug(`inference() ${JSON.stringify(chatSession)}, ${JSON.stringify(functions)}, ${singleMessage}`);
//         if (!this.groq) {
//             throw new Error("GroqAIService not initialized");
//         }
//         const completionFunctions = this.getChatCompletionFunctions(functions);
//         const abortController = new AbortController();
//         const messages = this.createMessages(chatSession);
//         this.logger.debug(`inference() messages: ${JSON.stringify(messages, null, 2)}`);

//         const completion = await this.groq.chat.completions.create(
//             {
//                 model: modelOverride ?? this.config.variables!.model,
//                 messages: messages,
//                 tools: completionFunctions,
//                 temperature: this.config.variables!.temperature ?? 0,
//                 max_tokens: this.config.variables!.maxTokens ?? 2048,
//                 top_p: this.config.variables!.topP,
//                 stream: false,
//             },
//             {

//             }
//         ).catch((e) => {
//             this.logger.error(`Error creating completion: ${e}`);

//             throw e;
//         });
//         this.logger.debug(`inference() stream created`);
//         let cancelled: boolean = false;

//         let cancelSubscription: Subscription | undefined = undefined;

//         cancelSubscription = cancel?.subscribe({
//             next: (value) => {
//                 if (value) {
//                     this.logger.debug(`inference() canceling inference`);
//                     cancelled = true;
//                     abortController.abort();
//                     cancelSubscription?.unsubscribe();
//                 }
//             },
//         });

//         let state: InferenceState = {
//             currentMessageIndex: 0,
//             role: undefined,
//             sentences: [""],
//             currentToolCallId: undefined,
//             toolCalls: {},
//             toolCallArgStrings: {},
//             isCompletionFunction: undefined,
//             messageFunctionMessageStarted: false,
//             functionDescribed: false,
//         }

//         // streaming not supported yet
//         if (completion.choices.length === 0) {
//             throw new Error("No completions returned");
//         }

//         const message = completion.choices[0].message;

//         if (message) {
//             this.logger.debug(`inference() message: ${JSON.stringify(message)}`);
//             const result = this.handleCompletion(message, chatSession, state, cancelled, completionFunctions, channelMessageId!, partialResponseCallBack,completion.choices[0].finish_reason, username);
//             if (result && result !== "done") {
//                 return result;
//             }
//         }

//         if (!state.role) {
//             state.role = "worker";
//         }
//         this.logger.debug(`inference() sentences: ${JSON.stringify(state.sentences)}`);
//         const chatMessage: ChatMessage = {
//             id: randomUUID(),
//             channelMessageId: channelMessageId ?? randomUUID().toString(),
//             sessionId: chatSession.id,
//             text: state.sentences.join(""),
//             username: username,
//             role: state.role,
//             timestamp: new Date().getTime(),
//             done: true,
//             cancelled: cancelled,
//         };
//         this.logger.debug(`inference() chatMessage: ${JSON.stringify(chatMessage)}`);
//         return chatMessage;
//     }

//     private handleCompletion(
//         data: ChatCompletion.Choice.Message | ChatCompletionChunk.Choice.Delta,
//         chatSession: ChatSession,
//         state: InferenceState, cancelled: boolean,
//         completionFunctions: CompletionCreateParams.Tool[] | undefined,
//         channelMessageId: string,
//         partialResponseCallBack?: (partial: ChatMessage) => Promise<void>,
//         finishReason?: string,
//         username?: string): ChatMessage | "done" | undefined {
//         if (cancelled) {
//             return "done";
//         }
//         if (data?.role && !state.role) {
//             state.role = this.mapOpenAIRoleToChatRole(data.role);
//         }

//         if (data?.tool_calls) {
//             this.logger.debug(`inference() tool_calls: ${JSON.stringify(data.tool_calls)}`);
//             this.handleToolCalls(data, state, completionFunctions!);
//         } else if (data?.content) {
//             state.sentences[state.currentMessageIndex] += data.content;
//         } else if (!data) {
//             this.logger.debug(`inference() data is undefined`);
//         } else {
//             this.logger.debug(`inference() data has no values: ${JSON.stringify(data)}`);
//         }

//         let done = false;

//         if (finishReason === "tool_calls") {
//             this.logger.debug(`inference() completion.choices[0].finish_reason === "function_call"`);
//             this.logger.debug(`inference() completion.choices[0] ${JSON.stringify(data)}`);
//             return this.createToolResponse(state, channelMessageId, chatSession.id);
//         }

//         if (finishReason === "stop") {
//             this.logger.debug(`inference() completion.choices[0].finish_reason === "stop"`);
//             done = true;
//         }

//         if (isCompleteSentence(state.sentences[state.currentMessageIndex])) {
//             if (!state.role) {
//                 state.role = "worker";
//             }

//             this.logger.debug(
//                 `inference() function_call complete sentence: ${state.sentences[state.currentMessageIndex]}`
//             );
//             partialResponseCallBack?.({
//                 id: randomUUID(),
//                 channelMessageId: channelMessageId,
//                 sessionId: chatSession.id,
//                 role: state.role,
//                 username: username,
//                 text: state.sentences[state.currentMessageIndex],
//                 timestamp: new Date().getTime(),
//                 done: done,
//             });
//             state.currentMessageIndex++;
//             state.sentences.push("");
//         }

//         if (done) {
//             return "done";
//         }
//     }

//     private createMessages(chatSession: ChatSession): CompletionCreateParams.Message[] {
//         return chatSession.messages.filter(m => m.text || m.toolCalls).flatMap((message) => {
//             const role = this.mapChatRoleToOpenAIRole(message.role);
//             if (role === "system") {
//                 return {
//                     role: "system",
//                     content: message.text,
//                 } as CompletionCreateParams.Message;
//             } else if (role === "user") {
//                 return {
//                     role: "user",
//                     content: message.text,
//                     name: message.username,
//                 } as CompletionCreateParams.Message;
//             } else if (role === "assistant") {
//                 const chatMessage = {
//                     role: "assistant",
//                     content: message.text,
//                     name: message.username,
//                 } as CompletionCreateParams.Message;

//                 const toolCalls = message.toolCalls?.map((toolCall) => {
//                     return this.createChatCompletionRequestMessageToolCall(toolCall);
//                 });

//                 if (toolCalls) {
//                     chatMessage.tool_calls = toolCalls as CompletionCreateParams.Message.ToolCall[];
//                 }
//                 return chatMessage;
//             } else if (role === "tool") {
//                 return message.toolCalls?.map((toolCall) => {
//                     return {
//                         role: "tool",
//                         tool_call_id: toolCall.call_id,
//                         name: toolCall.name,
//                         content: toolCall.result,
//                     } as CompletionCreateParams.Message;
//                 });
//             }
//         }).filter((message) => message !== undefined) as CompletionCreateParams.Message[];
//     }

//     private createToolResponse(state: InferenceState, channelMessageId: string, chatSessionId: string): ChatMessage {
//         if (!state.toolCallArgStrings || Object.keys(state.toolCallArgStrings).length === 0) {
//             throw new Error("function_argstrings is undefined");
//         } else if (!state.role) {
//             state.role = "worker";
//         }

//         for (const [id, argString] of Object.entries(state.toolCallArgStrings)) {
//             this.logger.debug(`inference() tool_call: ${id} ${argString}`);
//             const toolCall = state.toolCalls[id];
//             if (!toolCall) {
//                 throw new Error(`Tool call with id ${id} not found`);
//             }
//             toolCall.arguments = jsonParse(argString);
//         }

//         return {
//             id: randomUUID(),
//             channelMessageId: channelMessageId,
//             sessionId: chatSessionId,
//             role: state.role ?? "worker",
//             toolCalls: Object.values(state.toolCalls),
//             timestamp: new Date().getTime(),
//             done: true,
//         };

//     }

//     private handleToolCalls(data: ChatCompletion.Choice.Message | ChatCompletionChunk.Choice.Delta, state: InferenceState, completionFunctions: CompletionCreateParams.Tool[]) {
//         if (!data.tool_calls) {
//             return;
//         }

//         for (const toolCall of data.tool_calls) {

//             if (toolCall.function) {
//                 if (toolCall.function.name && toolCall.id) {
//                     state.currentToolCallId = toolCall.id;
//                     if (!state.toolCalls[toolCall.id]) {
//                         this.logger.debug(`inference() tool_call.function.name: ${toolCall.function.name}`);
//                         state.toolCalls[toolCall.id] = {
//                             name: toolCall.function.name,
//                             arguments: {},
//                             call_id: toolCall.id,
//                         };
//                         state.isCompletionFunction = this.isMessageCompletionFunction(toolCall.function.name, completionFunctions!)!;
//                     }
//                 }

//                 if (state.currentToolCallId && toolCall.function.arguments) {
//                     this.logger.debug(`currentToolCallId: ${state.currentToolCallId}`)
//                     this.logger.debug(`inference() tool_call.function.arguments: ${toolCall.function?.arguments}`);
//                     const args = toolCall.function.arguments || "";

//                     state.toolCallArgStrings[state.currentToolCallId] = state.toolCallArgStrings[state.currentToolCallId] || "";
//                     this.logger.debug(`new toolCallArgStrings: ${JSON.stringify(state.toolCallArgStrings)}`)

//                     state.toolCallArgStrings[state.currentToolCallId] += args;
//                     this.logger.debug(`updated toolCallArgStrings: ${JSON.stringify(state.toolCallArgStrings)}`)
//                 }

//                 if (state.isCompletionFunction && state.currentToolCallId) {

//                     if (!state.messageFunctionMessageStarted) {
//                         const argString = state.toolCallArgStrings[state.currentToolCallId];
//                         this.logger.debug(
//                             `inference() checking for message start. functionArgstring: ${argString}`
//                         );
//                         state.messageFunctionMessageStarted = this.messageFunctionStarted(argString ?? "");
//                         state.sentences[state.currentMessageIndex] += this.getCurrentMessageFunctionText(argString ?? "");
//                     } else {
//                         state.sentences[state.currentMessageIndex] += state.toolCallArgStrings[state.currentToolCallId];
//                         if (!state.role) {
//                             state.role = "worker";
//                         }

//                     }

//                     //TODO: Add support for describing tool calls
//                 }
//             }
//         }
//     }

//     private async describeFunctionCall(
//         functionName: string,
//         chatSession: ChatSession,
//         channelMessageId: string,
//         partialResponseCallBack?: (partial: ChatMessage) => Promise<void>,
//         cancel?: Observable<boolean>
//     ): Promise<ChatMessage> {
//         this.logger.debug(`describeFunctionCall() ${functionName}`);
//         let descriptionPrompt = `In another world you decided to call the function ${functionName}.`;
//         descriptionPrompt += `\nInstead of calling the function, write a very short single sentence explaining your intent as if you were performing the task yourself instead of calling the function.`;
//         descriptionPrompt +=
//             '\nFor example, if the function was going to tell you the weather, you could write: "I\'m going to check the weather."';
//         const message: ChatMessage = {
//             id: randomUUID(),
//             text: descriptionPrompt,
//             sessionId: chatSession.id,
//             role: "user",
//             timestamp: new Date().getTime(),
//         };
//         const newChatSession = _.cloneDeep(chatSession);
//         newChatSession.messages.push(message);
//         const result = await this.inference({
//             chatSession: newChatSession,
//             functions: undefined,
//             explainFunctions: false,
//             singleMessage: false,
//             partialResponseCallBack,
//             modelOverride: this.functionDescriptionModel,
//             cancel,
//             channelMessageId
//         }
//         );
//         return result;
//     }

//     private messageFunctionStarted(functionArgstring: string): boolean {
//         return functionArgstring.includes('message": "');
//     }

//     private getCurrentMessageFunctionText(functionArgstring: string): string {
//         const messageStartIndex = functionArgstring.indexOf('message": "');
//         if (messageStartIndex === -1) {
//             return "";
//         }
//         return functionArgstring.substring(messageStartIndex + 10, functionArgstring.length - 1);
//     }

//     private isMessageCompletionFunction(functionName: string, functions: CompletionCreateParams.Tool[]): boolean {
//         if (functions.length === 0) {
//             return false;
//         }
//         if (functionName !== TASK_COMPLETE_FUNCTION_NAME) {
//             return false;
//         }
//         for (const f of functions) {
//             if (f.function?.name !== TASK_COMPLETE_FUNCTION_NAME) {
//                 continue;
//             }
//             if (f.function?.parameters && f.function.parameters.properties) {
//                 for (const key of Object.keys(f.function?.parameters.properties as Record<string, any>)) {
//                     if (key.startsWith("message")) {
//                         return true;
//                     }
//                 }
//             }
//         }
//         return false;
//     }

//     private createChatCompletionRequestMessageToolCall(
//         functionCall?: ToolCall
//     ): CompletionCreateParams.Message.ToolCall | undefined {
//         if (functionCall) {
//             return {
//                 type: "function",
//                 id: randomUUID(),
//                 function: {
//                     name: functionCall.name,
//                     arguments: JSON.stringify(functionCall.arguments),
//                 }
//             };
//         } else {
//             return undefined;
//         }
//     }

//     private getChatCompletionFunctions(
//         functions?: Record<string, any>[]
//     ): CompletionCreateParams.Tool[] | undefined {
//         if (functions) {
//             const completionFunctions: CompletionCreateParams.Tool[] = [];
//             for (const f of functions) {
//                 completionFunctions.push({
//                     type: "function",
//                     function: {
//                         name: f.name,
//                         description: f.description,
//                         parameters: f.parameters,
//                     }
//                 });
//             }
//             return completionFunctions;
//         } else {
//             return undefined;
//         }
//     }

//     private mapChatRoleToOpenAIRole(role: ChatRole) {
//         switch (role) {
//             case "user":
//                 return "user";
//             case "worker":
//                 return "assistant";
//             case "system":
//                 return "system";
//             case "tool":
//                 return "tool";
//             default:
//                 return "user";
//         }
//     }

//     private mapOpenAIRoleToChatRole(role: string | undefined): ChatRole {
//         switch (role) {
//             case "user":
//                 return "user";
//             case "assistant":
//                 return "worker";
//             case "system":
//                 return "system";
//             case "tool":
//                 return "tool";
//             default:
//                 return "worker";
//         }
//     }

//     costEstimate(args: { inputTokens: number; outputTokens: number; model: string; }): number {
//         return 0;
//     }
// }