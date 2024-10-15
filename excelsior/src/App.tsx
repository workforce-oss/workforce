import { useEffect, useRef, useState } from "react";
import { NativeChatSocketAPI, TaskExecutionAPI, TaskExecutionWatchAPI, WorkforceAPIClient } from "workforce-api-client";
import { Auth, AuthSession, ChatBoxMessage, ChatBoxState, TaskExecutionDataState, ToolState, chatStore, taskExecutionDataStore, toolStore, uuidv4 } from "workforce-ui-core";
import { shallow } from "zustand/shallow";
import { ChatComponent } from "./components/chat/ChatComponent";
import { TaskExecutionListComponent } from "./components/task/TaskExecutionListComponent";
import { ToolOutputComponent } from "./components/tool/ToolOutputComponent";


const chatBoxSelector = (state: ChatBoxState) => {
    return {
        selectedMessages: state.selectedMessages,
        addMessage: state.addMessage,
        selectSession: state.selectSession,
    };
};

const toolStateSelector = (state: ToolState) => {
    return {
        addToolCalls: state.addToolCalls,
        selectToolSession: state.selectToolSession,
    };
}

const taskExecutionSelector = (state: TaskExecutionDataState) => {
    return {
        taskExecutions: state.taskExecutions,
        selectedTaskExecutionId: state.selectedTaskExecutionId,
        addTaskExecutions: state.addTaskExecutions,
        updateTaskExecution: state.updateTaskExecution,
        selectTaskExecutionData: state.selectTaskExecutionData
    };
}

const sessionId = uuidv4();
let orgId = '5104753b-89e5-42c6-9f63-23140029aa50';
let channelId = 'f45dacdc-76fc-4fb1-88ed-71d8895e4c52';
let anonymous = 'false';
const workforceUrl = 'localhost:8085';
const workforceAuthUrl = 'http://localhost:8085/insecure';

const App = () => {

    const { addMessage, selectSession, selectedMessages } = chatStore(chatBoxSelector, shallow);
    const { addToolCalls, selectToolSession } = toolStore(toolStateSelector, shallow);
    const { selectedTaskExecutionId, addTaskExecutions, selectTaskExecutionData, updateTaskExecution } = taskExecutionDataStore(taskExecutionSelector, shallow);
    const [authSession, setAuthSession] = useState<{
        session: AuthSession | undefined,
        userId: string
    } | undefined>(undefined);

    const [messages, setMessages] = useState<ChatBoxMessage[]>([]);
    const [localTurn, setLocalTurn] = useState<boolean>(true);
    const [toolOutputHidden, setToolOutputHidden] = useState<boolean>(true);
    const [chatSocketApi, setChatSocketAPI] = useState<NativeChatSocketAPI | undefined>(undefined);
    const [taskExecutionApi, setTaskExecutionAPI] = useState<TaskExecutionAPI | undefined>(undefined);
    const [taskExecutionSocketAPI, setTaskExecutionSocketAPI] = useState<TaskExecutionWatchAPI | undefined>(undefined);
    const [apiVersion, setApiVersion] = useState<number | undefined>(undefined);

    const authActive = useRef<boolean>(false);

    const clean = selectedMessages?.length === 0;
    const cleanHeaderClasses = clean ? "opacity-0 w-0 h-0 z-1 overflow-hidden -mb-14" : "opacity-100 w-full border-b-0.5 border-border-100 z-10";

    if (window.location.search?.includes("orgId")) {
        const urlParams = new URLSearchParams(window.location.search);
        orgId = urlParams.get('orgId') ?? orgId;
    }
    if (window.location.search?.includes("channelId")) {
        const urlParams = new URLSearchParams(window.location.search);
        channelId = urlParams.get('channelId') ?? channelId;
    }

    useEffect(() => {
        if (!authSession?.userId) {
            return;
        }

        const unauthorizedCallBack = () => {
            Auth.refreshToken().then(() => {
                Auth.session().then((newSession) => {
                    setAuthSession({ session: newSession, userId: Auth.getUserId() });
                }).catch(() => {
                    console.error("Error refreshing token");
                }).catch(() => {
                    console.error("Error refreshing token");
                });
            }).catch(() => {
                console.error("Error refreshing token");
            });
        };

        WorkforceAPIClient.init({
            accessToken: authSession.session?.auth.accessToken,
            basePath: `/workforce-api`,
            baseUrl: `http://${workforceUrl}`,
            baseSocketUrl: `http://${workforceUrl}`,
            unauthorizedCallBack
        })

        setApiVersion(apiVersion ? apiVersion + 1 : 1);

    }, [authSession]);

    useEffect(() => {
        const taskExecutionAPI = WorkforceAPIClient.TaskExecutionAPI;
        setTaskExecutionAPI(taskExecutionAPI);
        return () => {
            console.log("Closing Task Execution API");
        }
    }, [apiVersion]);

    useEffect(() => {
        if (!authSession?.userId || !apiVersion) {
            return;
        }
        const socketApi = WorkforceAPIClient.NativeChatSocketAPI(`${orgId}/${channelId}/chat`);
        setChatSocketAPI(socketApi);
        return () => {
            console.log("Closing Chat Socket API");
            socketApi.close();
        }
    }, [apiVersion]);


    useEffect(() => {
        if (!authSession?.userId || !chatSocketApi || !apiVersion) {
            return;
        }
        const registerSocket = (newSenderId: string) => {
            chatSocketApi.setChatMessageCallback((message) => {
                const chatBoxMessage: ChatBoxMessage = {
                    final: message.final_part,
                    message: message.text,
                    senderId: message.senderId,
                    sessionId: sessionId,
                    timestamp: message.timestamp,
                    messageId: message.messageId,
                    senderName: message.displayName,
                    taskExecutionId: message.taskExecutionId,
                };

                addMessage(chatBoxMessage);
                if (message.toolCalls && message.toolCalls.length > 0) {
                    console.log(`received tool calls: ${JSON.stringify(message.toolCalls)}`);
                    addToolCalls(message.toolCalls.map((toolCall) => {
                        return {
                            name: toolCall.name,
                            call_id: toolCall.call_id,
                            arguments: toolCall.arguments,
                            sessionId: toolCall.sessionId,
                            toolType: toolCall.toolType,
                            humanState: toolCall.humanState,
                            result: toolCall.result,
                            toolRequestId: toolCall.toolRequestId,
                            image: toolCall.image,
                            timestamp: toolCall.timestamp ?? Date.now(),
                        }
                    }), true);
                    if (message.toolCalls.length > 0) {
                        selectToolSession(message.toolCalls[0].sessionId);
                    }
                    setToolOutputHidden(false);
                }
                selectSession(sessionId);
                selectTaskExecutionData(message.taskExecutionId);
            });
            chatSocketApi.sendChatMessage({
                messageId: uuidv4(),
                senderId: newSenderId,
                text: '',
                threadId: sessionId,
                timestamp: Date.now(),
                command: 'join',
            });
        }

        registerSocket(authSession.userId);

        return () => {
        }

    }, [chatSocketApi]);

    useEffect(() => {
        if (!authSession?.userId || !apiVersion) {
            return;
        }
        const taskExecutionWatchAPI = WorkforceAPIClient.TaskExecutionWatchAPI("watch/task-executions")
        setTaskExecutionSocketAPI(taskExecutionWatchAPI);
        return () => {
            console.log("Closing Task Execution Watch API");
            taskExecutionWatchAPI.close();
        }
    }, [apiVersion]);

    useEffect(() => {
        if (!authSession?.userId || !taskExecutionSocketAPI) {
            return;
        }

        taskExecutionSocketAPI.setTaskExecutionWatchCallback((taskExecution) => {
            console.log("Task Execution Watch: ", taskExecution);
            updateTaskExecution(taskExecution);
            console.log("Task Execution Updated: ", taskExecution);
        });

        return () => {
        }

    }, [taskExecutionSocketAPI]);



    useEffect(() => {
        if (!authSession?.userId || !taskExecutionApi) {
            return;
        }
        taskExecutionApi.list({ userId: authSession.userId }).then((response) => {
            addTaskExecutions(response);
        }).catch((error) => {
            console.error(error);
        });

        return () => {

        }
    }, [taskExecutionApi, authSession]);



    useEffect(() => {
        if (authActive.current) {
            return;
        }
        Auth.init(`${workforceAuthUrl}`, "workforce-ui");
        Auth.session().then((session) => {
            const userId = Auth.getUserId();
            setAuthSession({ session, userId });
            authActive.current = false;
        }).catch((err) => {
            authActive.current = false;
            console.error(err);
        });

        authActive.current = true;

        return () => {
        }
    }, []);

    return (
        <div className="flex flex-col h-screen max-h-screen w-full text-text-100">
            <nav className="z-20 h-screen max-md:pointer-events-auto max-md:fixed disable:pointer-events" />
            <div className="min-h-full w-full min-w-0 flex-1">
                <div className="flex h-screen w-full flex-col overflow-hidden">
                    <div className={`sticky top-0 flex h-14 items-center gap-3 bg-bg-100 transition-[margin,height,width] ease-in-out duration-1000 ${cleanHeaderClasses}`}>
                        <h1 className="text-4xl lg:text-6xl mx-auto  italic font-excelsior ">Excelsior</h1>
                    </div>
                    {authSession?.userId ?
                        <div id="main-content" className={`relative flex w-full flex-1 ${!toolOutputHidden ? "flex-col-reverse overflow-y-hidden" : "flex-row overflow-y-scroll"} lg:flex-row overflow-x-hidden  lg:overflow-y-scroll max-md:pr-0`}>
                            {authSession?.userId && <TaskExecutionListComponent
                                selectedTaskExecutionId={selectedTaskExecutionId}
                            />}

                            <div className={`flex flex-col w-full h-full lg:h-full overflow-x-clip ${!toolOutputHidden ? "overflow-y-scroll" : "overflow-y-visible"} lg:overflow-y-visible`}>
                                {authSession?.userId && chatSocketApi && <ChatComponent
                                    localSenderId={authSession?.userId}
                                    messages={selectedMessages ?? []}
                                    onMessageInput={(message) => {
                                        try {
                                            const messageId = uuidv4();
                                            const timestamp = Date.now();
                                            chatSocketApi.sendChatMessage({
                                                senderId: authSession?.userId,
                                                messageId: messageId,
                                                text: message,
                                                threadId: sessionId,
                                                timestamp: timestamp,
                                            });
                                            addMessage({
                                                final: true,
                                                message,
                                                senderId: authSession?.userId,
                                                sessionId,
                                                timestamp: timestamp,
                                                messageId
                                            });
                                        } catch (error) {
                                            console.error(error);
                                        }
                                    }}
                                    // onMessageInput={(message) => {
                                    //     setMessages([...messages, {
                                    //         messageId: new Date().getTime().toString(),
                                    //         senderId: localTurn ? "local" : "remote",
                                    //         message: message,
                                    //         timestamp: new Date().getTime(),
                                    //         final: true,
                                    //     }]);
                                    //     if (messages.length === 3) {
                                    //         // setToolOutputs([{
                                    //         //     arguments: {},
                                    //         //     name: "Python",
                                    //         //     type: "interpreter",
                                    //         // }])
                                    //         setToolOutputs([{
                                    //             name: "Slides",
                                    //             arguments: {},
                                    //             humanState: {
                                    //                 name: "Slides",
                                    //                 embed: "https://docs.google.com/presentation/d/e/2PACX-1vTiWmbyjY6nmVN_uVQVeqof7_NfhProPgV4SER8yEpY1ITXsMBnIWcgAikAWaEgU97FpjsB91usD67B/embed?start=false&loop=false&delayms=3000",
                                    //                 directUrl: "https://docs.google.com/presentation/d/1JAw26SKWGw7SKuiI3CXSUrhnKiLOEqZdr3kWjwVzm3Q/edit?usp=sharing",
                                    //                 type: "iframe",
                                    //             }
                                    //         }]);
                                    //         // setToolOutputs([{
                                    //         //     arguments: {},
                                    //         //     name: "Pull Request",
                                    //         //     type: "iframe",
                                    //         //     humanState: "https://github.com/devbots-llc/workforce-manager/pull/45"
                                    //         // }]);
                                    //         setToolOutputHidden(false);
                                    //     }
                                    //     console.log(messages);
                                    //     setLocalTurn(!localTurn);
                                    // }}
                                    sessionId={sessionId}
                                />
                                }
                            </div>
                            {chatSocketApi && <ToolOutputComponent
                                hidden={toolOutputHidden}
                                onHideClick={() => setToolOutputHidden(!toolOutputHidden)}
                                chatSocketApi={chatSocketApi}
                            />}
                        </div>
                        :
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="flex flex-col items-center gap-4">
                                <h1 className="text-2xl">Loading...</h1>
                            </div>
                        </div>
                    }

                </div>
            </div>

        </div>
    );

}

export default App;