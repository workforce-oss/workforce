import { useEffect, useRef, useState } from "react";

export interface AudioVisualizationAvatarProps {
    stream?: MediaStream | undefined;
    width: number;
    height: number;
}

export const AudioVisualizationAvatar = ({
    stream,
    width,
    height
}: AudioVisualizationAvatarProps) => {
    const [analyser, setAnalyser] = useState<AnalyserNode>();
    const [source, setSource] = useState<MediaStreamAudioSourceNode>();
    const [dataArray, setDataArray] = useState<Uint8Array>();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!stream) {
            return;
        }
        try {
        console.log('creating audio context');
        const audioContext = new AudioContext();
        const newAnalyser = audioContext.createAnalyser();
        const newSource = audioContext.createMediaStreamSource(stream);
        const newBufferLength = newAnalyser.frequencyBinCount;
        const newDataArray = new Uint8Array(newBufferLength);
        newSource.connect(newAnalyser);
        // newAnalyser.connect(audioContext.destination);
        newAnalyser.getByteTimeDomainData(newDataArray);
        setAnalyser(newAnalyser);
        setDataArray(newDataArray);
        setSource(newSource);
        } catch (e) {
            console.error(e);
        }
    }, [stream]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !stream || !analyser || !dataArray) {
            return;
        }
        console.log('drawing');
        draw(analyser, dataArray, canvas);
    }, [canvasRef, source]);

    return (
        <canvas
            ref={canvasRef}
            id="audio-avatar-canvas"
            width={width}
            height={height}
            style={{
                background: "rgba(255, 255, 255, 0.5)",

                backdropFilter: "blur(2px)",
							border: "1px solid rgba(0, 0, 0, 0.28)",
							boxShadow: "rgba(0, 0, 0, 0.25) 1px 4px 4px",
                borderRadius: 20,
            }}
        ></canvas>
    );
};

export const draw = (
    analyser: AnalyserNode,
    dataArray: Uint8Array,
    canvas: HTMLCanvasElement
) => {
    const drawVisual = requestAnimationFrame(() =>
        draw(analyser, dataArray, canvas)
    );
    analyser.getByteTimeDomainData(dataArray);

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) {
        return;
    }
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = 'rgb(0, 0, 0)';
    canvasCtx.beginPath();

    const bufferLength = analyser.frequencyBinCount;
    const sliceWidth = (canvas.width * 1.0) / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength / 6; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
            canvasCtx.moveTo(x, y);
        } else {
            canvasCtx.lineTo(x, y);
        }

        x += sliceWidth * 6;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
};