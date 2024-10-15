import { ChatBoxMessage } from "workforce-ui-core";
import { ChatInputComponent } from "./ChatInputComponent";
import { ChatOutputComponent } from "./ChatOutputComponent";

export const ChatComponent = (props: {
    sessionId: string,
    onMessageInput: (message: string) => void,
    messages: ChatBoxMessage[],
    localSenderId: string,
}) => {
    const headerClasses = props.messages.length > 0 ? "opacity-0 scale-0 -translate-y-48" : "opacity-100 scale-1 px-4 max-w-3xl w-full pt-1 translate-y-48";
    return (
        <div className={"relative mx-auto flex h-full w-full max-w-3xl flex-1 flex-col md:px-2"} >
            <div className={`absolute transition-opacity ease-in-out duration-500 ${headerClasses}`}
            >
                <div>
                    <div className="gap-2 flex-col shadow-[0_2px_16px_rgba(0,0,0,0.025)]">
                        <div className="flex flex-row gap-2">
                            <h1 className="text-7xl mx-auto italic font-excelsior"
                            >Excelsior
                            </h1>
                        </div>
                    </div>
                </div>
            </div>
            <ChatOutputComponent messages={props.messages} localSenderId={props.localSenderId} />

            {/* <ChatOutputComponent messages={props.messages} localSenderId={props.localSenderId}
                    innerWidth={"90vw"}
                    innerHeight={"80vh"}
                /> */}
            <ChatInputComponent
                messagesLength={props.messages.length}
                onMessageInput={props.onMessageInput} />
        </div>
    )
}