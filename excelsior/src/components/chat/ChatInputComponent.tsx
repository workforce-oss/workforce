import { useRef, useState } from "react";

export const ChatInputComponent = (props: {
    messagesLength: number,
    onMessageInput: (message: string) => void,
}) => {
    const { onMessageInput, messagesLength } = props;

    const [message, setMessage] = useState("");

    // const [height, setHeight] = useState(undefined);
    const boxRef = useRef<HTMLTextAreaElement>(null);

    const baseClassName = messagesLength > 0 ? "sticky bottom-0" : "translate-y-96";
    const shapingClassName = messagesLength > 0 ? "rounded-t-2xl border-b-0" : "rounded-2xl";

    return (
        <div className={`${baseClassName} mx-auto w-full pt-6 z-[999]`}>
            <fieldset className="flex w-full min-w-0 flex-col-reverse">
                <div className={`flex  flex-col  bg-bg-000  gap-1.5  border-0.5  border-border-300  pl-4  pt-2.5  pr-2.5  pb-2.5  -mx-1  sm:mx-0  items-stretch  transition-all  duration-200  relative  shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.035)]  focus-within:shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.075)]  hover:border-border-200  focus-within:border-border-200  cursor-text  z-10 ${shapingClassName}`}>
                    <div className="flex gap-2">
                        <div className="mt-1 w-full  break-words">
                            <textarea
                                ref={boxRef}
                            className="break-words autosize bg-bg-000 border-b-0.5 border-text-500 text-text-100 w-full focus:outline-none min-h-[5rem] overflow-y-auto max-h-96 p-0 resize-none"
                            placeholder="Type a message..."
                            rows={1}
                                style={{
                                    fontFamily: "monospace",                                    
                                    height: "auto",
                                    minHeight: 70,
                                    resize: "none",
                                    margin: 0,
                                   fontSize: 16,
                                }}
                                value={message}
                                onChange={(e) => {
                                    setMessage(e.target.value);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        onMessageInput(message);
                                        setMessage("");
                                        e.preventDefault();
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            </fieldset>
        </div>
    );
}