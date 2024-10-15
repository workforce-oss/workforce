import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatBoxMessage } from "workforce-ui-core";

export const ChatOutputComponent = (props: {
	messages: ChatBoxMessage[],
	localSenderId: string,
	innerWidth: number | string,
	innerHeight: number | string,
	mode: "default" | "webview",
}) => {
	const { 
		messages,
		localSenderId,
		innerWidth,
		innerHeight,
		mode
	 } = props;
	const messageComponents = chatMessages(messages, localSenderId, innerWidth.toString());
	const messageEndRef = React.useRef<HTMLDivElement>(null);

	const scrollToBottom = () => {
		messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}

	React.useEffect(() => {
		scrollToBottom();
	}, [messages]);

	const height = mode === "webview" ? "auto" : `calc(${innerHeight}px - 10px)`;
	const maxHeight = innerHeight;

	return (
		<div style={{
			overflow: "auto",
			borderRadius: 10,
			width: innerWidth,
			height: height,
			maxHeight: maxHeight,
			border: mode === "default" ? "1px solid rgba(0, 0, 0, 0.28)" : "none",
			boxShadow: mode === "default" ? "rgba(0, 0, 0, 0.25) 1px 4px 4px" : "none",
			background: mode === "default" ? "rgba(255, 255, 255, 0.1)" : "none",
			backdropFilter: "blur(2px)",

		}}>
			<div
				style={{
					width: `calc(${innerWidth} - 10px)`,
					height: height,
					maxHeight: maxHeight,
					paddingTop: 10,
					marginLeft: 10,
					flexDirection: "column",
					justifyContent: "end",
					fontSize: mode === "default" ? 16 : 14,
					color: "black",
					fontWeight: "bold",
				}}
			>
				{messageComponents}
				<div ref={messageEndRef} />
			</div>
		</div>
	);
};

type ChatBoxMessageItem = {
	message: string;
	senderId: string;
	timestamp: number;
	done: boolean;
}

function chatMessages(messages: ChatBoxMessage[], localSenderId: string, boxWidth: string) {
	if (!messages) {
		return [];
	}
	try {
		const components: JSX.Element[] = [];
		let messageMap = new Map<string, ChatBoxMessageItem>();
		for (let i = 0; i < messages.length; i++) {
			const message = messages[i];
			if(!message.message) {
				continue;
			}
			if (!messageMap.has(message.messageId)) {
				messageMap.set(message.messageId, {
					message: message.message,
					senderId: message.senderId,
					done: false,
					timestamp: message.timestamp,
				});
			} else if (!message.final) {
				messageMap.set(message.messageId, {
					message: messageMap.get(message.messageId)?.message + message.message,
					senderId: message.senderId,
					done: false,
					timestamp: message.timestamp,
				});
			} else if (message.final && message.message !== "" && messageMap.has(message.messageId)) {
				messageMap.set(message.messageId, {
					message: message.message,
					senderId: message.senderId,
					done: false,
					timestamp: message.timestamp,
				});
			} else if (message.final) {
				messageMap.set(message.messageId, {
					message: messageMap.get(message.messageId)?.message,
					senderId: message.senderId,
					done: true,
					timestamp: message.timestamp,
				});
			}
		}

		const messageArray = Array.from(messageMap.values());
		messageArray.sort((a, b) => a.timestamp - b.timestamp);
		for (let i = 0; i < messageArray.length; i++) {
			console.log(messageArray[i])
			const message = messageArray[i];
			if (message.done && message.senderId !== localSenderId) {
				console.log(`not adding message ${message.message}`)
				continue;
			}
			components.push(
				(
					<div key={`message-wrapper-${i}`}
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: `${message.senderId === localSenderId ? "flex-end" : "flex-start"}`,
							marginBottom: 5,
						}}
					>
						<div
							key={`wrapper-${i}`}
							// this is chat message, we want a bubble style, with different colors for different senders
							style={{
								marginBottom: 0,
								marginLeft: `${message.senderId === localSenderId ? "30px" : "0px"}`,
								marginRight: `${message.senderId === localSenderId ? "10px" : "40px"}`,
								justifyContent: `${message.senderId === localSenderId ? "flex-end" : "flex-start"}`,
								maxWidth: `calc(${boxWidth} - 80px)`,
								borderRadius: 10,
								paddingLeft: 10,
								paddingRight: 10,
								color: `${message.senderId === localSenderId ? "#dcdcdc" : "#333b3c"}`,
								backgroundColor: `${message.senderId === localSenderId ? "rgba(31, 43, 60, 0.9)" : "rgba(250, 250, 250, 0.9)"}`,
								boxShadow: "2px 2px 10px rgba(0, 0, 0, 0.38)",
								border: "1px solid rgba(0, 0, 0, 0.1)",

							}}
						>

							<Markdown
								components={{
									a: renderLink
								}}
								remarkPlugins={[remarkGfm]}
								children={formatMessage(message.message)}

							></Markdown>
						</div>
					</div>
				)
			);
		}
		return components;
	} catch (e) {
		console.error(e);
		return [];
	}
}

const renderLink = ({ node, ...props }) => {
    // if target is http, open in new tab, otherwise just normal link
    if (props.href.startsWith("http")) {
        return <a {...props} target="_blank" onClick={(e) => {
            if (props.href.includes("response_type=code")) {
                e.preventDefault();
                // open at the cursor
                const width = 360;
                const height = 760;
                const top = e.clientY - (height / 2);
                const left = e.clientX - (width / 2);

                const authPopup = window.open(props.href, 'popup', `width=${width},height=${height},top=${top}, left=${left}`);
                authPopup?.focus();

                const bc = new BroadcastChannel('auth');
                const listener = (e: MessageEvent) => {
                    if (e.data === 'auth') {
                        authPopup?.close();
                        bc.close();
                        window.removeEventListener('message', listener);
                    }
                }
                bc.onmessage = (ev) => {
                    console.log(ev.data);
                    if (ev.data === 'auth') {
                        authPopup?.close();
                        bc.close();
                        window.removeEventListener('message', listener);
                    }
                }

                window.addEventListener('message', listener);
            }
        }}>{props.children}</a>;
    } else {
        console.log("renderLink props", JSON.stringify(props, null, 2));
        console.log("renderLink node", JSON.stringify(node, null, 2));
        if (node.children && node.children.length > 0) {
            const href = node.children[0].value;
            if (href.startsWith("vscode://")) {
                const content = href.replace(/(vscode:\/\/)([^?]*)([^\s]*)/, "$2");
                return <a href={href}>{content}</a>;
            }
        }
        return <a href={props.href}>{props.children}</a>;
    }
}

// Format replaces all instances of "<number>." with "\n\n<number>."
function formatMessage(message?: string): string {
	if (!message) {
		return "";
	}
	let replaced = message.replace(/(\d+\.\s)/g, "\n\n$1");
	replaced = replaced.replace(/(vscode:\/\/)([^?]*)([^\s]*)/g, "[$1$2$3]($1$2$3)");
	replaced = replaced.replace(/^\s+|\s+$/g, "");
	return replaced;
}
