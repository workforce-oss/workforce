import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { metaStore } from "../../state/store.meta";
import { shallow } from "zustand/shallow";

const metaSelector = (state) => ({
    chatActive: state.chatActive,
    setChatActive: state.setChatActive,
})

export const ChatChannelComponent = (props: { channelId: string }) => {
    const {
        chatActive,
        setChatActive,
    } = metaStore(metaSelector, shallow);

    const [messages, setMessages] = useState([]);
    const [enabled, setEnabled] = useState(false);
    const [currentMessage, setCurrentMessage] = useState("");

    const chatEndRef = useRef(null);
    const chatRef = useRef(null);

    const scrollToBottom = () => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <div className="flex flex-col h-full border border-gray-800 bg-white rounded-lg mt-2 p-1 whitespace-pre-line">
            <div className="flex-grow h-full overflow-y-auto border-b border-gray-200">
                {messages.map((message, index) => {
                    return (
                        <div
                            key={index}
                            className={`flex flex-row ${message.sender === "Assistant"
                                ? "justify-start"
                                : "justify-end"
                                }`}
                        >
                            <div
                                className={`${message.sender === "Assistant"
                                    ? "bg-gray-200 dark:bg-gray-700"
                                    : "bg-blue-400 dark:bg-blue-600"
                                    } rounded-lg p-2 m-2`}
                            >
                                {message.message}
                            </div>
                        </div>
                    );
                })}
                <div ref={chatEndRef} />
            </div>
            <div className="flex flex-row justify-center items-center p-4">
               
            </div>
        </div>
    );
};