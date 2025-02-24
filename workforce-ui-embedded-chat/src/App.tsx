import { useEffect, useRef, useState } from 'react';
import { Auth, AuthSession, ChatBoxMessage, ChatBoxState, chatStore, uuidv4 } from 'workforce-ui-core';
import { NativeChatSocketAPI, WorkforceAPIClient } from 'workforce-api-client';
import { shallow } from "zustand/shallow";
import { ChatBoxComponent, ChatBoxMode } from './components/ChatBoxComponent';
import { OpenAIVoiceInterface } from 'workforce-ui-openai-webrtc';


const chatBoxSelector = (state: ChatBoxState) => {
    return {
        selectedMessages: state.selectedMessages,
        addMessage: state.addMessage,
        selectSession: state.selectSession,
    };
};
const senderId = uuidv4();
const fallbackThreadId = uuidv4();

const orgIdKey = 'data-workforce-org-id';
const channelIdKey = 'data-workforce-channel-id';
const taskExecutionIdKey = 'data-workforce-task-execution-id';
const threadIdKey = 'data-workforce-thread-id';
const workforceUrlKey = 'data-workforce-url';
const workforceSocketUrlKey = 'data-workforce-socket-url';
const modeKey = 'data-workforce-mode';
const draggableKey = 'data-workforce-draggable';
const anonymousKey = 'data-workforce-anonymous';
const authTokenKey = 'data-workforce-auth-access-token';
const issuedAtKey = 'data-workforce-auth-issued-at';
const expiresInKey = 'data-workforce-auth-expires-in';
const refreshTokenKey = 'data-workforce-auth-refresh-token';
const tokenTypeKey = 'data-workforce-auth-token-type';
const voiceEnabledKey = 'data-workforce-voice-enabled';

const modes = ['default', 'webview'];

class mockWorkforce {
    public getAttribute(key: string) {
        switch (key) {
            case orgIdKey:
                return "7448b1cd-6131-479c-ba2f-8a949a86df4f";
            case channelIdKey:
                return "e73172be-86ab-41f9-b81d-bda24d7e67d4";
            case draggableKey:
                return 'true';
            case anonymousKey:
                return 'false';
            case voiceEnabledKey:
                return 'true';
            default:
                return undefined;
        }
    }
}

function App() {
    let workforce = document.querySelector(`script[${channelIdKey}]`);

    if (!workforce) {
        workforce = new mockWorkforce() as unknown as HTMLScriptElement;
    }

    const orgId = workforce.getAttribute(orgIdKey);
    const channelId = workforce.getAttribute(channelIdKey);
    const taskExecutionId = workforce.getAttribute(taskExecutionIdKey);
    const threadId = workforce.getAttribute(threadIdKey) ?? fallbackThreadId;
    const workforceUrl = workforce.getAttribute(workforceUrlKey) ?? 'http://localhost:8084';
    const workforceSocketUrl = workforce.getAttribute(workforceSocketUrlKey) ?? 'ws://localhost:8084';
    const anonymous = (workforce.getAttribute(anonymousKey) ?? 'false') === 'true';
    const authToken = workforce.getAttribute(authTokenKey) ?? '';
    const issuedAt = workforce.getAttribute(issuedAtKey) ?? '';
    const expiresIn = workforce.getAttribute(expiresInKey) ?? '';
    const refreshToken = workforce.getAttribute(refreshTokenKey) ?? '';
    const tokenType = workforce.getAttribute(tokenTypeKey) ?? '';
    const draggable = workforce.getAttribute(draggableKey) ? workforce.getAttribute(draggableKey) === 'true' : false;
    const voiceEnabled = workforce.getAttribute(voiceEnabledKey) ? workforce.getAttribute(voiceEnabledKey) === 'true' : false;
    const workforceAuthUrl = workforce.getAttribute('data-workforce-auth-url') ?? 'http://localhost:8084/insecure';
    let mode = workforce.getAttribute(modeKey) ?? 'default';

    const [authSession, setAuthSession] = useState<{
        session: AuthSession | undefined,
        userId: string
    } | undefined>(undefined);
    const [apiVersion, setApiVersion] = useState<number | undefined>(undefined);
    const [chatSocketApi, setChatSocketAPI] = useState<NativeChatSocketAPI | undefined>(undefined);
    const authActive = useRef<boolean>(false);

    const { addMessage, selectSession, selectedMessages } = chatStore(chatBoxSelector, shallow);

    const [voiceService, setVoiceService] = useState<OpenAIVoiceInterface | undefined>(undefined);

    
    if (!modes.includes(mode)) {
        mode = 'default';
    }

    useEffect(() => {
        if (!anonymous && !authSession?.userId) {
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
            accessToken: anonymous ? undefined : authSession.session?.auth.accessToken,
            basePath: `/workforce-api`,
            baseUrl: `${workforceUrl}`,
            baseSocketUrl: `${workforceSocketUrl}`,
            unauthorizedCallBack
        })

        setApiVersion(apiVersion ? apiVersion + 1 : 1);

    }, [authSession]);

    useEffect(() => {
        if (!apiVersion) {
            return;
        }
        const socketApi = WorkforceAPIClient.NativeChatSocketAPI(`${orgId}/${channelId}/chat`, anonymous);
        setChatSocketAPI(socketApi);
        return () => {
            console.log("Closing Chat Socket API");
            socketApi.close();
        }
    }, [apiVersion]);

    useEffect(() => {
        if (!chatSocketApi) {
            return;
        }
        const registerSocket = (newSenderId) => {
            chatSocketApi.setChatMessageCallback((message) => {
                const chatBoxMessage: ChatBoxMessage = {
                    final: message.final_part,
                    message: message.text,
                    senderId: message.senderId,
                    sessionId: threadId,
                    timestamp: message.timestamp,
                    messageId: message.messageId,
                    senderName: message.displayName,
                    taskExecutionId: message.taskExecutionId,

                };
                addMessage(chatBoxMessage);
                selectSession(threadId);
            });
            chatSocketApi.sendChatMessage({
                messageId: uuidv4(),
                senderId: newSenderId,
                text: '',
                threadId: threadId,
                taskExecutionId: taskExecutionId,
                timestamp: Date.now(),
                command: 'join',
            });

        }

        registerSocket(anonymous ? senderId : authSession?.userId);

    }, [chatSocketApi]);

    useEffect(() => {
        if (!voiceEnabled || !chatSocketApi) {
            return;
        }

        // if (!selectedMessages || selectedMessages.length === 0) {
        //     return;
        // }

        let workerId = "";
        const userId = authSession?.userId ?? senderId;
        for (const message of selectedMessages ?? []) {
            if (message.senderId !== userId) {
                workerId = message.senderId;
                break;
            
            }
        }

        if (!workerId) {
            workerId = "worker"
            // return;
        }

        if (workerId === voiceService?.metadata?.workerId) {
            return;
        }

        const voiceInterface = new OpenAIVoiceInterface(chatSocketApi, {
            taskExecutionId: taskExecutionId,
            threadId: threadId,
            userId,
            workerId, 
        })

        setVoiceService(voiceInterface);
        
    }, [chatSocketApi])

    useEffect(() => {
        if (authActive.current) {
            return;
        }

        Auth.init(`${workforceAuthUrl}`, "workforce-ui");
        if (anonymous) {
            setAuthSession({ session: undefined, userId: senderId });
        } else if (authToken) {
            Auth.instance.session = {
                auth: {
                    accessToken: authToken,
                    issuedAt: new Date(issuedAt),
                    expiresIn: +expiresIn,
                    refreshToken: refreshToken,
                    tokenType: tokenType,
                }
            }
            setAuthSession({ session: Auth.instance.session, userId: Auth.getUserId() });
        } else {
            Auth.session().then((session) => {
                const userId = Auth.getUserId();
                setAuthSession({ session, userId });
                authActive.current = false;
            }).catch((err) => {
                authActive.current = false;
                console.error(err);
            });

            authActive.current = true;
        }
        return () => { }
    }, []);

    return (
        <div>
            {
                authSession ?
                    <ChatBoxComponent
                        messages={selectedMessages ?? []}
                        sessionId={threadId}
                        localSenderId={authSession?.userId ?? senderId}
                        draggingEnabled={draggable}
                        mode={mode as ChatBoxMode}
                        voiceEnabled={voiceEnabled}
                        voiceService={voiceService}
                        onMessageInput={(message) => {
                            try {
                                const messageId = uuidv4();
                                const timestamp = Date.now();
                                chatSocketApi.sendChatMessage({
                                    senderId: authSession?.userId,
                                    messageId: messageId,
                                    text: message,
                                    threadId: threadId,
                                    taskExecutionId: taskExecutionId,
                                    timestamp: timestamp,
                                });
                                addMessage({
                                    final: true,
                                    message,
                                    senderId: authSession?.userId,
                                    sessionId: threadId,
                                    timestamp: timestamp,
                                    messageId
                                });
                            } catch (error) {
                                console.error(error);
                            }
                        }}
                    />
                    :
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="flex flex-col items-center gap-4">
                            <h1 className="text-2xl">Loading...</h1>
                        </div>
                    </div>

            }
        </div>
    );
}

export default App;