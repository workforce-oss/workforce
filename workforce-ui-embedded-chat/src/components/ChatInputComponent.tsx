import { useState } from "react";

export const ChatInputComponent = (props: { 
    style: React.CSSProperties,
    height: string,
    width: string,
    borderRadius: number
    mode: "default" | "webview",
    
    onMessageInput: (message: string) => void }) => {
    const { onMessageInput, style, width, height, mode, borderRadius } = props;

    const [message, setMessage] = useState("");

    return (
        <div
            style={style}
        >
            <textarea
                style={{
                    colorScheme: "light dark",
                    fontFamily: "monospace",
                    width: width,
                    minWidth: width,
                    maxWidth: width,
                    minHeight: height,
                    height: height,
                    border: "1px solid rgba(0, 0, 0, 0.28)",
                    margin: mode === "default" ? 10 : -1,
                    outline: "none",
                    borderRadius: borderRadius,
                    padding: mode === "default" ? 10 : 10,
                    fontSize: mode === "default" ? 16 : 14,
                    fontWeight: "bold",
                    resize: "vertical",
                    color: "light-dark(#333b3c, #dcdcdc)",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                }}
                value={message}
                onChange={(e) => {
                    setMessage(e.target.value);
                }}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        onMessageInput(message);
                        setMessage("");
                    }
                }}
            />
        </div>
    );
}