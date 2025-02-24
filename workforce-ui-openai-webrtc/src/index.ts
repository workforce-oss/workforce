import { NativeChatSocketAPI } from "workforce-api-client";
import { OpenAIService, OpenAIServiceMetadata } from "./service/openai_service.js";
import { WebRtcService } from "./service/webrtc_service.js";

export class OpenAIVoiceInterface {
    private openAIService?: OpenAIService;

    public outputStream?: MediaStream;
    public inputStream?: MediaStream;
    public metadata?: OpenAIServiceMetadata;

    constructor(api: NativeChatSocketAPI, metadata: OpenAIServiceMetadata) {
        this.metadata = metadata;
        WebRtcService.init(api).then((data) => {
            if (!WebRtcService.dc) {
                console.error("WebRTC Datachannel not present")
                return
            }
            this.openAIService = new OpenAIService(api, WebRtcService.dc, metadata);
            WebRtcService.addHandler(this.openAIService.handleEvent.bind(this.openAIService))
            this.metadata.workerId = data.workerId;
            this.outputStream = WebRtcService.outputStream;
            this.inputStream = WebRtcService.inputStream;
        }).catch(e => {
            console.error(JSON.stringify(e))
        })
    }

    public muteMicrophone() {
        if (this.inputStream?.getAudioTracks().length > 0) {
            this.inputStream.getAudioTracks()[0].enabled = false;
        }
    }

    public unMuteMicrophone() {
        if (this.inputStream?.getAudioTracks().length > 0) {
            this.inputStream.getAudioTracks()[0].enabled = true;
        }
    }

    public muteOutput() {
        if (this.outputStream?.getAudioTracks().length > 1) {
            this.outputStream.getAudioTracks()[0].enabled = false;
        }
    }

    public unMuteOutput() {
        if (this.outputStream?.getAudioTracks().length > 1) {
            this.outputStream.getAudioTracks()[0].enabled = true;
        }
    }
}