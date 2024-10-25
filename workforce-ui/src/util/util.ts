import { AddTask, Assignment, Code, GitHub, Note, SmartToy, TextFields, WifiChannel } from "@mui/icons-material";
import { Color } from "@mui/material";
import SvgIcon from "@mui/material/SvgIcon";
import { blue, brown, green, grey, orange, pink, purple, red, teal } from "@mui/material/colors";
import { Edge } from "reactflow";
import { bindCallback } from "rxjs";
import { ObjectSubtype, ObjectType } from "workforce-core/model";

export function uuidv4() { 
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g, function (c) { 
        const r = Math.random() * 16 | 0,  
            v = c == 'x' ? r : (r & 0x3 | 0x8); 
        return v.toString(16); 
    }); 
}


export function classNames(...classes: Array<string>) {
    return classes.filter(Boolean).join(" ");
}

export function capitalize(input: string) {
    return input.charAt(0).toUpperCase() + input.slice(1);
}

export function createEdge(sourceId: string, sourceParameter: string, targetId: string, targetParameter, type: 'input' | 'taskInput' | 'output'): Edge {
    return {
        id: `reactflow__edge-${sourceId}${createHandleId(sourceId, sourceParameter, 'output')}-${targetId}${createHandleId(targetId, targetParameter, type)}`,
        type: 'custom',
        source: sourceId,
        sourceHandle: createHandleId(sourceId, sourceParameter, 'output'),
        target: targetId,
        targetHandle: createHandleId(targetId, targetParameter, type),
    }
}

export function createHandleId(nodeId: string, parameter: string, type: 'input' | 'taskInput' | 'output') {
    return `${nodeId}|${parameter}|${type}`;
}

export function getHandleIdData(handleId?: string): { nodeId: string, parameter: string, type: string } | null {
    if (!handleId) {
        return null;
    }
    const [nodeId, parameter, type] = handleId.split('|');
    return { nodeId, parameter, type };
}

export function incrementString(input: string) {
    const match = input.match(/(\d+)$/);
    if (match) {
        const number = parseInt(match[0]);
        const prefix = input.substring(0, match.index);
        return `${prefix}${number + 1}`;
    } else {
        return `${input}1`;
    }
}

// variables are in the form of {{variable}}
export function templateVars(input: string, vars: { name: string, value: string}[]): string {
    let output = input;
    vars.forEach((variable) => {
        output = output.replace(`\{\{${variable.name}\}\}`, variable.value);
    });
    return output;
}

export function formatMoney(value?: number): string {
    if (!value) {
        return "$0.00";
    }
    return `$${value.toFixed(5)}`;
}

export class CustomColors {
    static readonly resource: Color = blue;
    static readonly task: Color = green;
    static readonly worker: Color = purple;
    static readonly trigger: Color = red;
    static readonly tracker: Color = orange;
    static readonly channel: Color = pink;
    static readonly tool: Color = grey;
    static readonly credential: Color = brown;
    static readonly documentRepository: Color = teal;
    static readonly colors: Map<ObjectType, Color> = new Map([
        ['resource', CustomColors.resource],
        ['task', CustomColors.task],
        ['worker', CustomColors.worker],
        ['tracker', CustomColors.tracker],
        ['channel', CustomColors.channel],
        ['tool', CustomColors.tool],
        ['credential', CustomColors.credential],
        ['document_repository', CustomColors.documentRepository],
        ['documentation', CustomColors.documentRepository],
    ]);
}

export class CustomIcons {
    static readonly icons: Map<ObjectSubtype, typeof SvgIcon> = new Map([
        ['mock-channel', Code],
        // ['local-chat-channel', WifiChannel],
        ['slack-channel', WifiChannel],
        ['native-channel', WifiChannel],
        ['discord-channel', WifiChannel],
        // ['talkbox-channel', WifiChannel],
        // ['twilio-channel', WifiChannel],
        ['internal-document-repository', TextFields],
        ['github-repo-resource', GitHub],
        ['github-pull-request-resource', GitHub],
        ['raw-text-resource', TextFields],
        ['simple-task', AddTask],
        ['web-service-tool', Code],
        ['coding-tool', Code],
        ['template-tool', Note],
        ['excalidraw-tool', Note],
        ['message-channel-tool', WifiChannel],
        ['github-board-tracker', GitHub],
        ['trello-tracker', Assignment],
        ['ai-worker', SmartToy],
        ['default-documentation', TextFields],
    ]);
}

export function actualTabsAndNewlines(str: string) {
	// Replace "\\n" with newline
	// Replace "\\t" with tab
	const updated = str.replace(/\\\\n/g, "\n").replace(/\\\\t/g, "\t");
    // Replace "\\n" with newline
    // Replace "\\t" with tab
    return updated.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}
