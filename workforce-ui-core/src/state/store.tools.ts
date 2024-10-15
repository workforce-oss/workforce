
import { ToolCall } from "workforce-core/model"
import { create } from "zustand";

export type ToolStateSession = {
	sessionId: string;
	toolCalls: ToolCall[];
	machineState?: any;
};

export type ToolState = {
	toolSessions: ToolStateSession[];
	selectedToolSessionId?: string;
	selectedToolCalls: ToolCall[];
	selectedMachineState?: any;
	selectToolSession: (id: string) => void;
	addToolCalls: (toolCalls: ToolCall[], updateSelection?: boolean) => void;
	updateMachineState: (sessionId: string, machineState: any) => void;
};

export const toolStore = create<ToolState>()(
	(set, get: () => ToolState) => ({
		toolSessions: [],
		selectedToolCalls: [],
		selectedToolSessionId: undefined,
		selectedMachineState: undefined,
		selectToolSession: (id: string) => {
			if (get().selectedToolSessionId === id) {
				return;
			}
			set({
				selectedToolSessionId: id,
				selectedToolCalls: get().toolSessions.find((s) => s.sessionId === id)?.toolCalls ?? [],
				selectedMachineState: get().toolSessions.find((s) => s.sessionId === id)?.machineState,
			});
		},

		addToolCalls: (toolCalls: ToolCall[], updateSession?: boolean) => {
			if (!toolCalls || toolCalls.length === 0) {
				return;
			}

			const sessions = get().toolSessions;
			const newSessions = [];
			for (const toolCall of toolCalls) {
				const session = get().toolSessions.find((s) => s.sessionId === toolCall.sessionId);
				console.log("addToolCall", toolCall, session);
				if (!session) {
					const newSession: ToolStateSession = {
						sessionId: toolCall.sessionId,
						toolCalls: [toolCall],
					};
					newSessions.push(newSession);
					continue;
				}
				// check if last toolcall is a temp/dummy call
				if (session?.toolCalls.length > 0) {
					const lastCall = session.toolCalls[session.toolCalls.length - 1];
					if (lastCall.name === "temp") {
						console.log("popping temp in toolCalls");
						session.toolCalls.pop();
					}
				}
				if (!session?.toolCalls.find((c) => c.call_id === toolCall.call_id)) {
					session?.toolCalls.push(toolCall);
				}

				newSessions.push(session);
			}
			const newToolSessions = [...sessions.filter((s) => !newSessions.find((ns) => ns.sessionId === s.sessionId)), ...newSessions];
			const selectedSessionId = updateSession ? toolCalls[0].sessionId : get().selectedToolSessionId;
			const modifiedSelectedSession = newSessions.find((s) => s.sessionId === selectedSessionId);
			if (updateSession) {
				set({
					selectedToolSessionId: toolCalls[0].sessionId,
				});
			}
			if (modifiedSelectedSession) {
				console.log("addToolCalls, modifiedSelectedSession", modifiedSelectedSession);
				set({
					toolSessions: [...newToolSessions],
					selectedToolCalls: [...modifiedSelectedSession.toolCalls] ?? [],
					selectedMachineState: { ...modifiedSelectedSession.machineState },
				});
			} else {
				console.log("addToolCalls, no modifiedSelectedSession");
				set({
					toolSessions: [...newToolSessions],
				});
			}


		},
		updateMachineState: (sessionId: string, machineState: any) => {
			const session = get().toolSessions.find((s) => s.sessionId === sessionId);
			if (!session) {
				console.log("updateMachineState", "session not found", sessionId, machineState);
				return;
			}
			if (get().selectedToolSessionId === sessionId) {
				console.log("updateMachineState", "selected session", sessionId, machineState);
				set({
					selectedMachineState: machineState,
					toolSessions: [...get().toolSessions.filter((s) => s.sessionId !== sessionId), {
						...session,
						machineState: machineState,
					}],
				});
			} else {
				console.log("updateMachineState", "other session", sessionId, machineState);
				set({
					toolSessions: [...get().toolSessions.filter((s) => s.sessionId !== sessionId), {
						...session,
						machineState: machineState,
					}],
				});
			}
		}
	})
);
