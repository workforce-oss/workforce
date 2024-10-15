import { v2 } from "@google-cloud/speech";
import { google } from "@google-cloud/speech/build/protos/protos.js";
import { randomUUID } from "crypto";
import gax from "google-gax";
import OpenAI from "openai";
import { Subject } from "rxjs";
import { Configuration } from "../../../../config/configuration.js";
import { Logger } from "../../../../logging/logger.js";
import { WebhookAuthClaimsValidation, WebhookRoute, WebhookRouteManager } from "../../../../manager/webhook_route_manager.js";
import { ChannelConfig } from "../../model.js";
import { jsonParse } from "../../../../util/json.js";


// TODO: This Actually needs to support multiple threads, right now we only support one thread
export class NativeChannelVoiceInterface {
    private logger: Logger;
    private speechClient: v2.SpeechClient;
    private transcriptionSubject: Subject<{
        senderId: string,
        threadId: string,
        messageId: string,
        transcription: string
    }>;
    private webhookRoute: WebhookRoute;
    private webhookPath: string;
    private speechEndTimeoutMs = 200;
    private speechEnded = false;

    // private stream?: Writable;
    // private recognizeStream?: pumpify;
    private transcription = "";

    private openai?: OpenAI;

    // private streams: Map<string, Writable> = new Map<string, Writable>();
    private recognizeStreams = new Map<string, gax.CancellableStream>();
    private configs: Map<string, {
        sampleSize: number,
        sampleRate: number,
        channelCount: number
    }> = new Map<string, {
        sampleSize: number,
        sampleRate: number,
        channelCount: number
    }>();

    private interrupts: Subject<string> = new Subject<string>();

    constructor(args: {
        config: ChannelConfig, transcriptionSubject: Subject<{
            senderId: string,
            threadId: string,
            messageId: string,
            transcription: string
        }>
    }) {
        const { config, transcriptionSubject } = args;
        this.transcriptionSubject = transcriptionSubject
        this.logger = Logger.getInstance("NativeChannelVoiceInterface");

        this.speechClient = new v2.SpeechClient();
        this.speechClient.getRecognizer({
            name: `projects/${Configuration.GoogleProjectId}/locations/global/recognizers/workforce-engine-recognizer`
        }).catch((error) => {
            this.logger.error(`Error getting recognizer:`, error);
            this.logger.debug("Creating recognizer");
            const createRecognizerRequest: google.cloud.speech.v2.ICreateRecognizerRequest = {
                parent: `projects/${Configuration.GoogleProjectId}/locations/global`,
                recognizerId: "workforce-engine-recognizer",
                recognizer: {
                    languageCodes: ["en-US"],
                    model: "latest_long",
                },
            }
            this.speechClient.createRecognizer(createRecognizerRequest).catch((error) => {
                this.logger.error(`Error creating recognizer: `, error);
            });

        })

        this.webhookPath = `/${config.orgId}/${config.id}/voice`;
        this.webhookRoute = {
            objectId: config.id!,
            path: this.webhookPath,
            orgId: config.orgId,
            authOptions: {
                authRequired: !config.variables?.anonymous_access,
                issuerBaseURL: config.variables?.oauth2_issuer_uri as string | undefined,
                audience: config.variables?.oauth2_audience as string | undefined,
                claims: config.variables?.oauth2_claims ? jsonParse<Record<string, WebhookAuthClaimsValidation>>(config.variables?.oauth2_claims as string | undefined) : undefined
            },
            client_identifier: "threadId",
            webSocket: true
        }
        if (config.variables?.openai_token) {
            try {
                this.openai = new OpenAI({
                    apiKey: config.variables?.openai_token as string | undefined,
                });
            } catch (error) {
                this.logger.error(`Error creating OpenAI client: `, error);
            };
        }
        this.initWebsocket();
    }

    private initWebsocket() {
        // Initialize websocket connection
        WebhookRouteManager.getInstance().then((manager) => {
            manager.addRoute(this.webhookRoute);
            this.logger.debug(`initWebsocket() added route ${JSON.stringify(this.webhookRoute)}`);
            manager.subscribeToWebhookEvents(this.webhookRoute.orgId, this.webhookRoute.objectId, this.webhookRoute.path, (event) => {
                const body = jsonParse<{
                    type: string,
                    threadId: string,
                    config: {
                        sampleSize: number,
                        sampleRate: number,
                        channelCount: number
                    },
                    audio?: string
                }>(event.body as string);
                if (!body) {
                    this.logger.error(`Error parsing event body: ${event.body as string}`);
                    return;
                }
                this.logger.debug(`Received event ${body.type} for threadId: ${body.threadId}`);
                if (body.type === "config") {
                    this.configs.set(body.threadId, body.config);
                } else if (body.type === "speech") {
                    this.handleVoiceMessage(body);
                } else if (body.type === "end" && body.threadId) {
                    this.recognizeStreams.get(body.threadId)?.cancel();
                    this.recognizeStreams.delete(body.threadId);
                }
            });
        }).catch((error) => {
            this.logger.error(`initWebsocket() error adding route `, error);
        });
    }

    public handleTextMessage(threadId: string, message: string) {
        this.openai?.audio.speech.create({
            input: message,
            voice: "nova",
            model: "tts-1-hd",
            response_format: "pcm",
        }).then((response) => {
            let interrupted = false;
            const interruptSubscription = this.interrupts.subscribe((threadId) => {
                if (threadId === threadId) {
                    interrupted = true;
                    interruptSubscription.unsubscribe();
                }
            });
            response.body?.on("data", (chunk: WithImplicitCoercion<string> | {
                [Symbol.toPrimitive](hint: "string"): string;
            }) => {
                if (!interrupted) {

                    const audio = Buffer.from(chunk, 'binary').toString("base64");
                    const message = {
                        type: "audio",
                        threadId,
                        audio
                    }
                    WebhookRouteManager.getInstance().then((manager) => {
                        manager.sendWebhookEvent({
                            orgId: this.webhookRoute.orgId,
                            objectId: this.webhookRoute.objectId,
                            path: this.webhookRoute.path,
                            body: JSON.stringify(message),
                            clientId: threadId
                        });
                    }).catch((error) => {
                        this.logger.error(`Error sending audio message: `, error);
                    });
                }
            });
        }).catch((error) => {
            this.logger.error(`Error creating audio: `, error);
        });
    }

    private startInputStream(senderId: string, threadId: string, messageId: string) {
        this.logger.debug(`Starting stream for threadId: ${threadId}`);
        this.logger.debug(`Recognizer ProjectId: ${Configuration.GoogleProjectId}`)
        const request: google.cloud.speech.v2.IStreamingRecognizeRequest = {
            recognizer: `projects/${Configuration.GoogleProjectId}/locations/global/recognizers/workforce-engine-recognizer`,
            streamingConfig: {
                config: {
                    languageCodes: ["en-US"],
                    model: "latest_long",
                    autoDecodingConfig: {},
                    features: {
                        enableAutomaticPunctuation: true,
                    }
                },
                streamingFeatures: {
                    enableVoiceActivityEvents: true,
                    interimResults: true,
                    voiceActivityTimeout: {
                        speechEndTimeout: {
                            seconds: 10
                        },
                        speechStartTimeout: {
                            seconds: 5
                        }
                    }
                }
            }
        }
        const recognizeStream = this.speechClient._streamingRecognize()
            .on("error", (error) => {
                this.logger.error(`Error in recognition stream: ${JSON.stringify(error, null, 2)}`);
                this.recognizeStreams.get(threadId)?.cancel();
                this.recognizeStreams.delete(threadId);
            })
            .on("data", (data: {
                speechEventType: string,
                results?: google.cloud.speech.v1p1beta1.IStreamingRecognitionResult[],
                error?: google.rpc.IStatus
            }) => {
                if (data.speechEventType === "SPEECH_ACTIVITY_BEGIN") {
                    this.logger.debug("Speech activity begin");
                    this.speechEnded = false;
                }
                if (data.results?.[0]) {
                    if (data.results[0].alternatives?.[0] && data.results[0].isFinal) {
                        const transcript = data.results[0].alternatives[0].transcript;
                        this.logger.debug(`Received transcription: ${transcript}`);
                        this.transcription += transcript;
                    }
                }

                if (data.speechEventType === "SPEECH_ACTIVITY_END") {
                    this.logger.debug("Speech activity end");
                    this.speechEnded = true;
                    setTimeout(() => {
                        if (this.speechEnded) {
                            this.transcriptionSubject.next({
                                senderId,
                                threadId,
                                messageId,
                                transcription: this.transcription
                            });
                            this.transcription = "";
                            this.recognizeStreams.get(threadId)?.cancel();
                            this.recognizeStreams.delete(threadId);
                        }
                    }, this.speechEndTimeoutMs);
                }

            })
        recognizeStream.write(request, (error) => {
            if (error) {
                this.logger.error(`Error writing to recognize stream: ${error.message}`);
            }
        });
        this.recognizeStreams.set(threadId, recognizeStream);
    }

    private handleVoiceMessage(message: {
        threadId?: string,
        senderId?: string,
        config: {
            sampleSize: number,
            sampleRate: number,
            channelCount: number
        },
        audio?: string
    }) {
        if (!message.senderId || !message.threadId) {
            this.logger.error("No senderId or threadId in message");
            return;
        }

        if (!this.recognizeStreams.has(message.threadId) || this.recognizeStreams.get(message.threadId)?.writableEnded || this.recognizeStreams.get(message.threadId)?.errored) {
            this.startInputStream(message.senderId, message.threadId, randomUUID());
        }
        // Handle voice message
        const audio = message.audio;
        if (!audio) {
            this.logger.error("No audio in message");
            return;
        }

        // the audio is a base64 encoded string
        try {
            const buffer = Buffer.from(audio, "base64");

            if (this.recognizeStreams.has(message.threadId) && !this.recognizeStreams.get(message.threadId)?.writableEnded && !this.recognizeStreams.get(message.threadId)?.errored) {
                this.logger.debug('writing to stream');
                this.recognizeStreams.get(message.threadId)?.write({ audio: buffer }, (error) => {
                    if (error) {
                        this.logger.error(`Error writing audio to stream: ${error.message}`);
                    }
                });
            } else {
                this.logger.error(`No stream for threadId: ${message.threadId}`);
            }
        } catch (error) {
            this.logger.error(`Error decoding audio: `, error);
        }
    }

    destroy() {
        for (const recognizeStream of this.recognizeStreams.values()) {
            if (!recognizeStream.writableFinished) {
                recognizeStream.end();
            }
        }

        WebhookRouteManager.getInstance().then((manager) => {
            manager.removeRoute(this.webhookRoute);
        }).catch((error) => {
            this.logger.error(`destroy() error removing route `, error);
        });
    }
}