import { create } from "zustand";
import { ChatBoxMessage, ChatBoxSession } from "../model/chat.js";

export type ChatBoxState = {
	sessions: ChatBoxSession[];
	selectedSession: ChatBoxSession | undefined;
	selectedMessages: ChatBoxMessage[];

	addSession: (session: ChatBoxSession) => void;
	removeSession: (session: ChatBoxSession) => void;
	selectSession: (id: string) => void;


	setSessionMessages: (sessionId: string, messages: ChatBoxMessage[]) => void;

	addMessage: (message: ChatBoxMessage) => void;
	removeMessage: (message: ChatBoxMessage) => void;
	updateMessage: (message: ChatBoxMessage) => void;
};

export const chatStore = create<ChatBoxState>()(
	(set, get: () => ChatBoxState) => ({
		sessions: [],
		selectedSession: undefined,
		selectedMessages: [],
		addSession: (session: ChatBoxSession) => {
			console.log("addSession", session);
			set({
				sessions: [...get().sessions, session],
			});
		},
		removeSession: (session: ChatBoxSession) => {
			console.log("removeSession", session);
			set({
				sessions: get().sessions.filter((s) => s.sessionId !== session.sessionId),
			});
			if (get().selectedSession?.sessionId === session.sessionId) {
				set({
					selectedSession: undefined,
					selectedMessages: [],
				});
			}
		},
		selectSession: (id: string) => {
			console.log("selectSession", id);
			const session = get().sessions.find((s) => s.sessionId === id);
			if (!session) {
				console.log("selectSession", id, "not found");
				// create new session
				const newSession: ChatBoxSession = {
					sessionId: id,
					messages: [],
				};
				console.log("selectSession", "new session", newSession);
				set({
					sessions: [...get().sessions, newSession],
					selectedSession: newSession,
				});
				// select new session
				return;
			}
			set({
				selectedSession: session,
				selectedMessages: session?.messages || [],
			});
		},
		setSessionMessages: (sessionId: string, messages: ChatBoxMessage[]) => {
			const session = get().sessions.find((s) => s.sessionId === sessionId);
			console.log("setSessionMessages", sessionId, messages, session);
			if (session) {
				session.messages = messages;
				console.log("setSessionMessages", "session found", session);
				set({
					sessions: [...get().sessions],
				});
			} else {
				console.log("setSessionMessages", "session not found");
				const newSession: ChatBoxSession = {
					sessionId: sessionId,
					messages: messages,
				};
				console.log("setSessionMessages", "new session", newSession);
				set({
					sessions: [...get().sessions, newSession],
				});
			}
			if (get().selectedSession?.sessionId === sessionId) {
				console.log("setSessionMessages", "selectedSession", get().selectedSession);
				set({
					selectedMessages: [...messages],
				});
			}
		},
		addMessage: (message: ChatBoxMessage) => {
			const session = get().sessions.find((s) => s.sessionId === message.sessionId);
			console.log("addMessage", message, session);
			if (!session) {
				console.log("addMessage", "session not found");
				const newSession: ChatBoxSession = {
					sessionId: message.sessionId,
					messages: [message],
				};
				set({
					sessions: [...get().sessions, newSession],
					selectedSession: get().selectedSession ?? newSession,
					selectedMessages: get().selectedSession ? get().selectedMessages : [message],
				});
				return;
			}
			session.messages = [...session.messages, message];
			session.messages?.sort((a, b) => a.timestamp - b.timestamp);
			set({
				sessions: [...get().sessions],
			});

            console.log("addMessage", "selectedSession", get().selectedSession);
			if (get().selectedSession?.sessionId === message.sessionId) {
                console.log("addMessage", "selectedSession found");
				set({
					selectedMessages: [...get().selectedMessages, message],
				});
			} else {
				console.log("addMessage", "selectedSession not found");
			}
		},
		removeMessage: (message: ChatBoxMessage) => {
			console.log("removeMessage", message);
			const session = get().sessions.find((s) => s.sessionId === message.sessionId);
			if (session) {
				session.messages = session.messages.filter((m) => m.sessionId !== message.sessionId);
				set({
					sessions: [...get().sessions],
				});
			}
			if (get().selectedSession?.sessionId === message.sessionId) {
				set({
					selectedMessages: get().selectedMessages.filter((m) => m.sessionId !== message.sessionId),
				});
			}
		},
		updateMessage: (message: ChatBoxMessage) => {
			console.log("updateMessage", message);
			const session = get().sessions.find((s) => s.sessionId === message.sessionId);
			if (session) {
				const index = session.messages.findIndex((m) => m.sessionId === message.sessionId);
				if (index > -1) {
					session.messages[index] = message;
					set({
						sessions: [...get().sessions],
					});
				}
			}
			if (get().selectedSession?.sessionId === message.sessionId) {
				const index = get().selectedMessages.findIndex((m) => m.sessionId === message.sessionId);
				if (index > -1) {
					get().selectedMessages[index] = message;
					set({
						selectedMessages: [...get().selectedMessages],
					});
				}
			}
		},
	})
);
