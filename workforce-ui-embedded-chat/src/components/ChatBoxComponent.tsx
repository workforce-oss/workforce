import { useRef, useState } from "react";
import { ChatInputComponent } from "./ChatInputComponent";
import { ChatOutputComponent } from "./ChatOutputComponent";
import { ArrowDownIcon, ArrowUpIcon, CubeTransparentIcon, MicrophoneIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from "@heroicons/react/24/outline";
import { ChatBoxMessage } from "workforce-ui-core";
import { OpenAIVoiceInterface } from "workforce-ui-openai-webrtc";
import { AudioVisualizationAvatar } from "./avatar/AudioVisualizationAvatar";

export interface ChatBoxProps {
	sessionId: string;
	onMessageInput: (message: string) => void
	messages: ChatBoxMessage[];
	localSenderId: string;
	voiceService?: OpenAIVoiceInterface;
	voiceEnabled?: boolean;
	draggingEnabled?: boolean;
	mode?: ChatBoxMode;
}

export type ChatBoxMode = "default" | "webview";


export const ChatBoxComponent = (props: ChatBoxProps) => {
	const { mode, sessionId, messages, onMessageInput, localSenderId, voiceService, voiceEnabled, draggingEnabled } = props;

	const [speechEnabled, setSpeechEnabled] = useState(true)
	const [microphoneEnabled, setMicrophoneEnabled] = useState(true)

	const [expanded, setExpanded] = useState(false);
	const [mousePressed, setMousePressed] = useState(false);

	const ref = useRef<HTMLDivElement>(null);

	const chatBoxHeight = expanded ? 600 : 150;
	const voiceOffset = voiceEnabled ? 120 : 0;
	const chatBoxWidth = (expanded ? 680 : 80) + voiceOffset;

	const minLeft = -100 + voiceOffset;

	const maxX = window.innerWidth - chatBoxWidth;
	const maxY = window.innerHeight - chatBoxHeight - (expanded ? 20 : 40);
	const [position, setPosition] = useState({ x: maxX, y: maxY });


	const leftOffset = `clamp(${minLeft}px, ${position.x}px, ${maxX}px)`;
	const topOffset = `clamp(20px, ${position.y}px, ${maxY}px)`;

	return (
		mode === "webview" ?
			<div style={{ fontFamily: "monospace" }}>
				<div>
					<ChatOutputComponent messages={messages} localSenderId={localSenderId}
						innerWidth={"90vw"}
						innerHeight={"calc(85vh - 10px)"}
						mode="webview"
					/>
					<ChatInputComponent
						style={
							{
								colorScheme: "light dark",
								background: "Canvas",
								width: "90vw",
								marginTop: 0,
								marginBottom: "10px",
								position: "fixed",
								bottom: 0,
								padding: 0,
								height: "auto",
								border: "none",
								borderRadius: 10,
								backdropFilter: "blur(2px)",
								zIndex: 2147483647,
							}
						}
						width={`calc(90vw - 20px)`}
						height={"calc(15vh - 20px)"}
						borderRadius={10}
						mode="webview"
						onMessageInput={onMessageInput} />
				</div>
			</div> :
			<div
				style={{
					fontFamily: "monospace",
				}}
				onMouseUp={() => {
					setMousePressed(false);
				}}
				onMouseMove={
					mousePressed
						? (e) => {
							if (mousePressed) {
								setPosition({
									x: clamp(minLeft, position.x + e.movementX, maxX),
									y: clamp(20, position.y + e.movementY, maxY)
								});
							}
						}
						: undefined
				}
				onMouseLeave={() => {
					setMousePressed(false);
				}}
				onMouseEnter={() => {
					setMousePressed(false);
				}}
			>
				<div id="tracking" style={{
					position: "fixed",
					top: 0,
					left: 0,
					padding: 0,
					margin: 0,
					width: "100vw",
					height: "100vh",
					background: "rgba(255, 255, 255, 0)",
					pointerEvents: mousePressed ? "auto" : "none",
				}}
				/>
				<div
					ref={ref}
					draggable={false}
					style={{
						width: chatBoxWidth,
						height: 150,
						position: "fixed",
						top: topOffset,
						left: leftOffset,
						zIndex: 2147483647,
					}}
				>
					{draggingEnabled &&

						<button
							style={{
								position: "absolute",
								top: 0,
								left: voiceOffset,
								width: "30px",
								height: "30px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								cursor: mousePressed ? "grabbing" : "grab",
								borderRadius: 10,
								padding: 2,
								backdropFilter: "blur(2px)",
								background: "rgba(255, 255, 255, 0.2)",
								color: "light-dark(#333b3c, #dcdcdc)",

								border: "1px solid rgba(0, 0, 0, 0.28)",
								boxShadow: "rgba(0, 0, 0, 0.25) 1px 4px 4px",
							}}
							onMouseDown={() => {
								setMousePressed(true);
							}}
						>
							<CubeTransparentIcon />
						</button>
					}
					<button
						onClick={() => {
							setExpanded(!expanded);
						}}
						style={{
							position: "absolute",
							top: draggingEnabled ? 40 : 0,
							left: voiceOffset,
							width: "30px",
							height: "30px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							cursor: "pointer",
							borderRadius: 10,
							padding: 0,
							color: "light-dark(#333b3c, #dcdcdc)",
							// borderRadius: 10,
							background: "rgba(255, 255, 255, 0.2)",
							border: "1px solid rgba(0, 0, 0, 0.28)",
							boxShadow: "rgba(0, 0, 0, 0.25) 1px 4px 4px",
							backdropFilter: "blur(2px)",

						}}
					>{expanded ? <ArrowUpIcon /> : <ArrowDownIcon />}</button>
					{voiceEnabled && (
						<button
							style={{
								position: "absolute",
								top: 120,
								left: voiceOffset,
								width: "30px",
								height: "30px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								borderRadius: 10,
								padding: 2,
								cursor: "pointer",
								backdropFilter: "blur(2px)",
								border: "1px solid rgba(0, 0, 0, 0.28)",
								boxShadow: "rgba(0, 0, 0, 0.25) 1px 4px 4px",
								background: !microphoneEnabled ? "red" : "green",

							}}
							onClick={() => {
								if (microphoneEnabled) {
									voiceService?.muteMicrophone();
								} else {
									voiceService?.unMuteMicrophone();
								}
								setMicrophoneEnabled(!microphoneEnabled);

							}}
						>
							<MicrophoneIcon />
						</button>
					)}
					{voiceEnabled &&
						<button
							style={{
								position: "absolute",
								top: 80,
								left: voiceOffset,
								width: "30px",
								height: "30px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								cursor: "pointer",
								borderRadius: 10,
								padding: 2,
								backdropFilter: "blur(2px)",
								border: "1px solid rgba(0, 0, 0, 0.28)",
								boxShadow: "rgba(0, 0, 0, 0.25) 1px 4px 4px",
							}}
							onClick={() => {
								if (speechEnabled) {
									voiceService?.unMuteOutput();
								} else {
									voiceService?.unMuteOutput();
								}
								setSpeechEnabled(!speechEnabled);
							}}
						>
							{speechEnabled ? <SpeakerWaveIcon /> : <SpeakerXMarkIcon />}
						</button>
					}

					{voiceEnabled &&
						<AudioVisualizationAvatar width={110} height={150} stream={voiceService?.outputStream} />
					}

					<div style={{
						position: "absolute",
						top: 0,
						left: voiceOffset + 40,
						width: chatBoxWidth - 80,
						height: expanded ? chatBoxHeight : 0,
						background: "rgba(255, 255, 255, 0)",
					}}>
						<ChatOutputComponent
							messages={messages} localSenderId={localSenderId}
							innerWidth={chatBoxWidth - 80}
							innerHeight={expanded ? chatBoxHeight - 80 - 20 - 20 : 0}
							mode="default"
						/>
						{expanded && <ChatInputComponent
							style={
								{
									width: chatBoxWidth - 80,
									marginTop: 10,
									marginBottom: 10,
									height: "auto",
									background: "rgba(255, 255, 255, 0.1)",
									border: "1px solid rgba(0, 0, 0, 0.28)",
									borderRadius: 20,
									boxShadow: "rgba(0, 0, 0, 0.25) 1px 4px 4px",
									backdropFilter: "blur(2px)",
									zIndex: 2147483647,
								}
							}
							width={`${chatBoxWidth - 80 - 40}px`} height="60px" borderRadius={20}
							mode="default"
							onMessageInput={onMessageInput} />}
					</div>
				</div>
			</div>
	);
};

function clamp(min, num, max) {
	return num <= min
		? min
		: num >= max
			? max
			: num
}