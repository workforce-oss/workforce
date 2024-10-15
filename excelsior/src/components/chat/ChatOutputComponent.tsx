import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatBoxMessage, TaskExecutionDataState, taskExecutionDataStore } from "workforce-ui-core";
import { TaskExecution } from "workforce-core/model";

const taskExecutionSelector = (state: TaskExecutionDataState) => {
    return {
        taskExecutions: state.taskExecutions,
    };
}
export const ChatOutputComponent = (props: {
    messages: ChatBoxMessage[],
    localSenderId: string,
}) => {
    const { messages, localSenderId } = props;
    const [heightClass, setHeightClass] = useState<string>("h-80");
    const { taskExecutions } = taskExecutionDataStore(taskExecutionSelector);

    const messageEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(() => {
        if (messages.length > 0 && heightClass === "h-80") {
            setTimeout(() => {
                setHeightClass("h-auto");
            }, 1000);
        }
        scrollToBottom();
    }, [messages]);


    const displayClasses = messages.length === 0 ? "opacity-0 w-0 h-0 z-0" : "opacity-100 flex-1 flex-grow-1 gap-3 px-4 max-w-3xl w-full pt-1";

    return (

        <div className={`flex flex-col transition-[flex] ease-out duration-700 ${displayClasses}`}
        > <div className={`${heightClass}`}>
                {chatMessages(messages, localSenderId, taskExecutions)}
            </div>
            <div ref={messageEndRef} />
        </div>)

}

type ChatBoxMessageItem = {
    message: string;
    senderId: string;
    timestamp: number;
    done: boolean;
    taskExecutionId?: string,
    senderName?: string;
    taskName?: string;
    isToolMessage?: boolean;
}


function chatMessages(messages: ChatBoxMessage[], localSenderId: string, taskExecutions?: TaskExecution[]): JSX.Element[] {
    if (!messages) {
        return [(<div className="mb-1 mt-1">
            <div className="group relative inline-flex gap-2 bg-gradient-to-b from-bg-300 from-50%  to-bg-400 rounded-xl ml-px pl-2.5 py-2.5 break-words text-text-200 transition-all max-w-[75ch] flex-col shadow-[0_2px_16px_rgba(0,0,0,0.025)] min-w-[16ch] pr-6">
                <div className="flex flex-row gap-2">
                    <div className="shrink-0">
                        <div className="flex shrink-0 items-center justify-center rounded-full font-bold h-7 w-7 text-[12px] bg-text-200 text-bg-100">You</div>
                    </div>
                    {/* <Markdown
                        remarkPlugins={[remarkGfm]}
                        className="font-user-message  prose dark:prose-invert max-w-none"
                    >
                        {`${formatMessage(message.message)}`}
                    </Markdown> */}
                    {/* <div className="font-user-message grid grid-cols-1 gap-2 py-0.5 text-[0.9375rem] leading-6"><p className="whitespace-pre-wrap break-words">{formatMessage(message.message)}</p></div> */}
                </div>
            </div>
        </div>)];
    }

    try {
        const components: JSX.Element[] = [];
        let messageMap = new Map<string, ChatBoxMessageItem>();
        const taskNameMap = new Map<string, string>();
        for (let i = 0; i < messages.length; i++) {
            if (messages[i].taskExecutionId && !taskNameMap.has(messages[i].taskExecutionId)) {
                console.log("taskExecutions", taskExecutions);
                console.log("messageTaskExecutionId")
                const taskExecution = taskExecutions?.find((taskExecution) => taskExecution?.id === messages[i].taskExecutionId);
                if (taskExecution) {
                    taskNameMap.set(messages[i].taskExecutionId, taskExecution.taskName);
                }
            }
            const message = messages[i];
            if (!message.message) {
                continue;
            }
            if (!messageMap.has(message.messageId)) {
                messageMap.set(message.messageId, {
                    message: message.message,
                    senderId: message.senderId,
                    done: !message.toolCalls && (message.final || message.message?.includes("Click here to authorize")),
                    timestamp: message.timestamp,
                    senderName: message.senderName,
                    taskName: taskNameMap.get(message.taskExecutionId) ?? "unknown",
                    isToolMessage: message.toolCalls && message.toolCalls.length > 0
                });
            } else if (!message.final) {
                messageMap.set(message.messageId, {
                    message: messageMap.get(message.messageId)?.message + message.message,
                    senderId: message.senderId,
                    done: message.toolCalls && (message.toolCalls.length) > 0 && message.toolCalls.every((toolCall) => (toolCall.result !== undefined && toolCall.result !== null && toolCall.result !== "")),
                    timestamp: message.timestamp,
                    senderName: message.senderName,
                    taskName: taskNameMap.get(message.taskExecutionId) ?? "unknown",
                    isToolMessage: message.toolCalls && message.toolCalls.length > 0
                });
            } else if (message.final && message.message !== "" && messageMap.has(message.messageId)) {
                messageMap.set(message.messageId, {
                    message: message.message,
                    senderId: message.senderId,
                    done: true,
                    timestamp: message.timestamp,
                    senderName: message.senderName,
                    taskName: taskNameMap.get(message.taskExecutionId) ?? "unknown",
                    isToolMessage: message.toolCalls && message.toolCalls.length > 0
                });
            } else if (message.final) {
                messageMap.set(message.messageId, {
                    message: messageMap.get(message.messageId)?.message,
                    senderId: message.senderId,
                    done: message.final || (message.toolCalls && (message.toolCalls.length > 0) && message.toolCalls.every((toolCall) => (toolCall.result !== undefined && toolCall.result !== null && toolCall.result !== ""))),
                    timestamp: message.timestamp,
                    senderName: message.senderName,
                    taskName: taskNameMap.get(message.taskExecutionId) ?? "unknown",
                    isToolMessage: message.toolCalls && message.toolCalls.length > 0
                });
            }
        }

        const messageArray = Array.from(messageMap.values());
        messageArray.sort((a, b) => a.timestamp - b.timestamp);

        for (let i = 0; i < messageArray.length; i++) {
            const message = messageArray[i];
            // if (message.done && message.senderId !== localSenderId) {
            //     console.log(`not adding message ${message.message}`)
            //     continue;
            // }
            components.push(
                (
                    chatMessage(message, localSenderId, i)
                )
            );
        }
        return components;
    } catch (e) {
        console.error(e);
        return [];
    }
}

function chatMessage(message: ChatBoxMessageItem, localSenderId: string, index: number) {
    let senderName = message.senderName;

    return (

        <div key={`message-wrapper-${index}`} className="mb-4 mt-4">
            {message.senderId === localSenderId ? (
                <div >
                    {/* <div className="flex flex-row gap-0 z-[500]">

                        <div className="border-0.5 border-border-100 z-[500] bg-bg-200 -mt-1 ml-4 pl-3 pr-3 pb-1 pt-0.5 rounded-full">
                            <div className="w-auto inline-block z-[500] font-bold">
                                You
                            </div>å
                        </div>
                    </div> */}
                    <div className="group relative inline-flex border-0.5 border-border-100 bg-gradient-to-b from-bg-300 from-80%  to-bg-300 rounded-xl py-2 px-4 break-words text-text-200 transition-all max-w-[75ch] shadow-[0_2px_16px_rgba(0,0,0,0.025)] min-w-[5.125rem]">
                        <div className="flex flex-row gap-2">
                            <Markdown
                                remarkPlugins={[remarkGfm]}
                                className="font-user-message max-w-none transition-all duration-500"
                                children={formatMessage(message.message)}
                            >

                            </Markdown>
                            {/* <div className="font-user-message grid grid-cols-1 gap-2 py-0.5 text-[0.9375rem] leading-6"><p className="whitespace-pre-wrap break-words">{formatMessage(message.message)}</p></div> */}
                        </div>
                    </div>
                </div>
            ) : (
                <div>
                    <div className="flex flex-row gap-0 z-[500]">
                        {/* <div className="border-t-0.5 border-border-100 w-4 mt-3 rounded-l-lg z-[500]"></div> */}
                        {/* <div className="border-0.5 border-border-100 z-[500] bg-bg-200 -mt-1 pl-3 pr-3 pb-1 pt-0.5 rounded-full">
                        <div className="w-auto inline-block z-[500] font-bold font-shadow">
                            {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                        </div> */}
                        <div className="border-0.5 border-border-100 z-[500] bg-bg-300 -mt-1 ml-4 pl-3 pr-3 pb-1 pt-0.5 rounded-full">
                            <div className="w-auto inline-block z-[500] font-bold">
                                {message.senderName ?? "Assistant"}
                            </div>
                        </div>
                        {(message.taskName && message.taskName !== "unknown" && message.taskName !== message.senderName) && (
                            <div className="border-0.5 border-border-100 z-[500] bg-bg-300 -mt-1 ml-4 pl-3 pr-3 pb-1 pt-0.5 rounded-full">
                                <div className="w-auto inline-block z-[500] font-bold">
                                    {message.taskName}
                                </div>
                            </div>
                        )}
                        {/* <div className="border-t-0.5 border-border-100 grow mt-3 rounded-r-lg z-[500]"></div> */}
                    </div>
                    <div data-is-streaming={!message.done} className="-mt-4 group border-0.5 rounded-lg border-border-100 relative  pt-6  pb-[1.125rem]  px-4  relative  -tracking-[0.015em]  bg-[linear-gradient(to_bottom,_hsla(var(--bg-000)/50%)_10%,_hsla(var(--bg-000)_/_0)_100%)]  ">
                        <div className="font-excelsior-message prose dark:prose-invert max-w-none">
                            <Markdown
                                components={{
                                    a: renderLink
                                }}
                                remarkPlugins={[remarkGfm]}
                                children={formatMessage(message.message)}

                            >

                            </Markdown>
                        </div>
                        {(!message.done) && (
                            <div className="mt-3 left-0">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-border-400"></div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
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
    let replaced = message;
    //Turn vscode:// urls into markdown links
    replaced = replaced.replace(/(vscode:\/\/)([^?]*)([^\s]*)/g, "[$1$2$3]($1$2$3)");

    // let replaced = message.replace(/(\d+\.\s)/g, "\n\n$1");
    // now strip leading and trailing whitespace
    replaced = replaced.replace(/^\s+|\s+$/g, "");
    return replaced;
}