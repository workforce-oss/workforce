import { NativeChatSocketAPI } from "workforce-api-client";

type WebRtcSessionResponse = {
    sessionId: string;
    success: boolean;
    realtime_token: string;
    realtime_base_url: string;
    threadId: string;
    workerId: string;
    model: string;
    message?: string;
};

export class WebRtcService {

    static dc?: RTCDataChannel;
    static outputStream: MediaStream;
    static inputStream: MediaStream;

    static sendMessage(message: any) {
        this.dc?.send(JSON.stringify(message));
    }

    public static addHandler(dataEventHandler: (data: any) => void) {
        this.dc.onmessage = (event) => {
            console.log("Data channel message", event.data);
            dataEventHandler(JSON.parse(event.data));
        };
    }


    public static async init(
        api: NativeChatSocketAPI,
    ): Promise<{workerId: string}> {
        const { realtime_token, realtime_base_url, model, workerId} = await this.newWebRtcSession(api).catch((e) => {
            console.error("Failed to create WebRTC session", e);
            throw e;
        });

        const pc = new RTCPeerConnection();
        const audioElement = this.setupAudioElement(pc);

        const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStream.getTracks().forEach((track) => pc.addTrack(track, mediaStream));

        
        this.inputStream = mediaStream;
        this.outputStream = (audioElement as any).captureStream();
        this.dc = this.setupDataChannel(pc);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpResponse = await fetch(`${realtime_base_url}?model=${model}`, {
            method: "POST",
            body: offer.sdp,
            headers: {
                "Authorization": `Bearer ${realtime_token}`,
                "Content-Type": "application/sdp",
            },
        });

        const answer = {
            type: "answer",
            sdp: await sdpResponse.text(),
        } as RTCSessionDescriptionInit;

        console.log(`webrtc answer ${JSON.stringify(answer)}`)

        await pc.setRemoteDescription(answer).then(() => console.log("pc remote Description set"))
        return {workerId}
    }

    static async newWebRtcSession(api: NativeChatSocketAPI): Promise<WebRtcSessionResponse> {
        return new Promise<WebRtcSessionResponse>((resolve, reject) => {
            api.send({
                "type": "new-webrtc-session"
            }, {
                messageType: "webrtc-session-response",
                callback: (data: WebRtcSessionResponse) => {
                    console.log("webrtcSession response received")
                    resolve(data);
                }
            });
        });
    }

    private static setupAudioElement(pc: RTCPeerConnection): HTMLMediaElement {
        const audioElement = document.createElement("audio");
        audioElement.autoplay = true;
        pc.ontrack = (event) => {
            audioElement.srcObject = event.streams[0];
        }

        return audioElement;
    }

    private static setupDataChannel(pc: RTCPeerConnection): RTCDataChannel {
        const dataChannel = pc.createDataChannel("oai-events");
        dataChannel.onopen = () => {
            console.log("Data channel open");
        };

        // dataChannel.onmessage = (event) => {
        //     console.log("Data channel message", event.data);
        //     dataEventHandler(JSON.parse(event.data));
        // };

        return dataChannel;
    }
}