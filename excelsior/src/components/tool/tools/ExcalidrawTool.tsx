import { Excalidraw, convertToExcalidrawElements, exportToBlob } from "@excalidraw/excalidraw";
import { ExcalidrawElementSkeleton, ValidLinearElement } from "@excalidraw/excalidraw/types/data/transform";
import { ExcalidrawElement, ExcalidrawTextElement } from "@excalidraw/excalidraw/types/element/types";
import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";
import { useEffect, useRef, useState } from "react";
import { NativeChatSocketAPI } from "workforce-api-client";
import { Auth, ChatBoxState, ToolState, chatStore, toolStore, uuidv4 } from "workforce-ui-core";
import { shallow } from "zustand/shallow";


const chatSelector = (state: ChatBoxState) => {
    return {
        selectedSession: state.selectedSession,
    }
}

const selector = (state: ToolState) => {
    return {
        selectedToolSessionId: state.selectedToolSessionId,
        selectedToolCalls: state.selectedToolCalls,
        selectedMachineState: state.selectedMachineState,
        addToolCalls: state.addToolCalls,
        updateMachineState: state.updateMachineState,
    }
}

export const ExcalidrawToolComponent = (props: {
    chatSocketAPI: NativeChatSocketAPI,
}) => {
    const { chatSocketAPI } = props;
    const [excalidrawApi, setExcalidrawApi] = useState<ExcalidrawImperativeAPI | null>(null);
    const [ apiReady, setApiReady ] = useState(false);
    const { selectedToolSessionId, selectedToolCalls, selectedMachineState, updateMachineState, addToolCalls } = toolStore(selector, shallow);
    const { selectedSession } = chatStore(chatSelector, shallow);
    const localState = useRef(selectedMachineState ?? []);
    
    
    const loaded = useRef(false);
    loaded.current = false;


    const onChange = (elements, state, files) => {
        if (!loaded.current) {
            loaded.current = true;
            return;
        }
        const labelIds = [];
        const stateElements = elements.filter((element: ExcalidrawElement) => element && element.isDeleted !== true).map((element: ExcalidrawElement) => {
            const transformedElement: Record<string, any> = {
                type: element.type,
                id: element.id,
                x: element.x,
                y: element.y,
            }

            if (element.strokeColor) {
                transformedElement.strokeColor = element.strokeColor;
            }
            if (element.strokeWidth) {
                transformedElement.strokeWidth = element.strokeWidth;
            }
            if (element.backgroundColor) {
                transformedElement.backgroundColor = element.backgroundColor;
            }
            if (element.width) {
                transformedElement.width = element.width;
            }
            if (element.height) {
                transformedElement.height = element.height;
            }
            if (element.boundElements) {
                for (const boundElement of element.boundElements) {
                    if (boundElement.type === "text") {
                        const textElement = elements.find((e) => e.id === boundElement.id) as ExcalidrawTextElement | undefined;
                        if (textElement) {
                            labelIds.push(textElement.id);
                            transformedElement.label = {
                                text: textElement.text,
                            }
                            if (textElement.fontSize) {
                                transformedElement.label.fontSize = textElement.fontSize;
                            }
                            if (textElement.strokeColor) {
                                transformedElement.label.strokeColor = textElement.strokeColor;
                            }
                            if (textElement.textAlign) {
                                transformedElement.label.textAlign = textElement.textAlign;
                            }
                            if (textElement.verticalAlign) {
                                transformedElement.label.verticalAlign = textElement.verticalAlign;
                            }
                        }
                    }
                }
            }
            if (element.type === "text") {
                transformedElement.text = element.text;
                if (element.fontSize) {
                    transformedElement.fontSize = element.fontSize;
                }
            }
            if (element.type === "arrow" || element.type === "line") {
                if (element.startBinding) {
                    const startElement = elements.find((e) => e.id === element.startBinding.elementId);
                    if (startElement) {
                        transformedElement.start = {
                            id: startElement.id,
                        }
                    }
                }
                if (element.endBinding) {
                    const endElement = elements.find((e) => e.id === element.endBinding.elementId);
                    if (endElement) {
                        transformedElement.end = {
                            id: endElement.id,
                        }
                        transformedElement.width = element.points[1][0] - element.points[0][0];
                        transformedElement.height = element.points[1][1] - element.points[0][1];
                    }
                }
            }

            return transformedElement;
        });
        const stateElementsFiltered = stateElements.filter((element) => !labelIds.includes(element.id));
        localState.current = stateElementsFiltered;
        // updateMachineState(selectedToolSessionId, stateElementsFiltered);
    }

    useEffect(() => {
        if (!apiReady) {
            return;
        }
        if (!selectedToolSessionId) {
            console.log("no selected tool session");
            return;
        }
        if (!excalidrawApi) {
            console.log("no excalidrawApi");
            return;
        }
        if (!selectedToolCalls) {
            console.log("no tool calls");
            return;
        }
        if (selectedToolCalls.length === 0) {
            console.log("selected tool calls empty");
            return;
        }

        const toolCallsToProcess = selectedToolCalls.filter((toolCall) => !toolCall.result).filter((toolCall) => toolCall.toolType === "excalidraw-tool");
        if (toolCallsToProcess.length === 0) {
            console.log("no tool calls to process");
            return;
        }

        toolCallsToProcess.sort((a, b) => a.timestamp - b.timestamp);

        let machineState = localState.current;
        if (!machineState || !Array.isArray(machineState)) {
            machineState = [];
        }

        for (const toolCall of toolCallsToProcess) {
            console.log("processing tool call", toolCall);
            if (toolCall.name === "get_excalidraw_elements") {
                toolCall.result = JSON.stringify({
                    status: "success",
                    machineState: machineState,
                });

                // updateMachineState(selectedToolSession.sessionId, machineState);
                console.log("get_excalidraw_elements", Date.now().toLocaleString());
                exportToBlob({
                    elements: excalidrawApi.getSceneElements(),
                    appState: excalidrawApi.getAppState(),
                    files: excalidrawApi.getFiles(),
                    mimeType: "image/png",

                }).then((blob) => {
                    console.log("exportToBlob", Date.now().toLocaleString());
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        console.log("onloadend", Date.now().toLocaleString());
                        let b64 = reader.result as string;
                        b64 = b64.substring(b64.indexOf(",") + 1);
                    
                        NativeChatSocketAPI.instance?.sendChatMessage({
                            messageId: uuidv4(),
                            senderId: Auth.getUserId(),
                            text: "",
                            threadId: selectedSession.sessionId,
                            timestamp: Date.now(),
                            toolCalls: [{
                                ...toolCall,
                                image: b64,
                                result: JSON.stringify({
                                    status: "success",
                                    machineState: machineState,
                                }),
                            }],
                        });
                    };
                    reader.readAsDataURL(blob);
                }).catch((err) => {
                    console.error("Error exporting to blob", err);
                });
                addToolCalls([toolCall]);
                return;
            } else if (toolCall.name === "post_excalidraw_elements") {
                if (machineState) {
                    const element = toolCall.arguments as ExcalidrawElementSkeleton;
                    for (const e of machineState) {
                        if (e.id === element.id) {
                            toolCall.result = JSON.stringify({
                                status: "error",
                                message: "Element with id already exists",
                            });
                            break;
                        }
                    }
                    if (!toolCall.result) {
                        machineState.push(element);
                        toolCall.result = JSON.stringify({
                            status: "success",
                            machineState: machineState,
                        });
                    }
                }
            } else if (toolCall.name === "put_excalidraw_elements") {
                if (machineState) {
                    const elements = toolCall.arguments.elements as ExcalidrawElementSkeleton[];
                    for (const element of elements) {
                        const index = machineState.findIndex((e) => e.id === element.id);
                        if (index > -1) {
                            machineState[index] = element;
                        } else {
                            machineState.push(element);
                        }
                    }
                    toolCall.result = JSON.stringify({
                        status: "success",
                        machineState: machineState,
                    });
                }
            } else if (toolCall.name === "put_excalidraw_elements_by_elementId") {
                if (machineState) {
                    const element = toolCall.arguments.element as ExcalidrawElementSkeleton;
                    const index = machineState.findIndex((e) => e.id === toolCall.arguments.id);
                    if (index > -1) {
                        machineState[index] = element;
                    } else {
                        machineState.push(element);
                    }
                    toolCall.result = JSON.stringify({
                        status: "success",
                        machineState: machineState,
                    });
                }
            } else if (toolCall.name === "delete_excalidraw_elements_by_elementId") {
                if (machineState) {
                    machineState = machineState.filter((e) => e.id !== toolCall.arguments.elementId);
                    toolCall.result = JSON.stringify({
                        status: "success",
                        machineState: machineState,
                    });
                }
            }
        }

        updateMachineState(selectedToolSessionId, machineState);
        addToolCalls(toolCallsToProcess);
        const elements = convertElements(machineState);
        excalidrawApi.updateScene({
            elements,
        });
        setTimeout(() => {
            excalidrawApi.scrollToContent(elements, {
                animate: true,
            })
        }, 100);
        console.log("sending chat message", Date.now().toLocaleString(), toolCallsToProcess);
        chatSocketAPI.sendChatMessage({
            messageId: uuidv4(),
            senderId: Auth.getUserId(),
            text: "",
            threadId: selectedSession.sessionId,
            timestamp: Date.now(),
            toolCalls: toolCallsToProcess,
        });
    }, [selectedToolCalls, apiReady, excalidrawApi]);

    useEffect(() => {
        if (excalidrawApi && !apiReady) {
            setApiReady(true);
        }
    }, [excalidrawApi]);

    return (
        <div className="flex flex-col h-full w-full bg-bg-200 overflow-y-none overflow-x-hidden">
            <div className="flex-1 w-full h-full">
                <Excalidraw
                    excalidrawAPI={(api) => setExcalidrawApi(api)}
                    initialData={{
                        elements: convertElements(localState.current ? Array.isArray(localState.current) ? localState.current : [] : []),
                    }}
                    onChange={onChange}
                />
            </div>

        </div>
    )
}

function convertElements(elements: ExcalidrawElementSkeleton[]) {
    for (const element of elements) {
        if (!element) {
            continue;
        }
        if (element.type === "line" || element.type === "arrow") {
            const endId = (element as ValidLinearElement).end?.id;
            if (endId) {
                const endElement = elements.find((e) => e.id === endId);
                if (endElement) {
                    const x = endElement.x + endElement.width / 2;
                    const y = endElement.y + endElement.height / 2;
                    if (element.x > x) {
                        (element as any).width = -1 * Math.abs(element.width);
                    }
                    if (element.y > y) {
                        (element as any).height = -1 * Math.abs(element.height);
                    }
                }
            }
        }
    }
    const excalidrawElements = convertToExcalidrawElements(elements, {
        regenerateIds: false,
    });
    return excalidrawElements;
}

function fixLinearElements(elements: ExcalidrawElement[]) {
    // for each element, check if it is a line or arrow
    // if so, get points[1], which is the end of the line
    // get the elementId of endBinding
    // get the element with that elementId
    // if x of the line is greater than the midpoint of the element, set points[1][0] to a negative value
    // if y of the line is greater than the midpoint of the element, set points[1][1] to a negative value
    console.log("fixLinearElements", elements);

    for (const element of elements) {
        if (element.type === "line" || element.type === "arrow") {
            const end = element.points[1];
            const endElement = elements.find((e) => e && e.id === element.endBinding?.elementId);
            if (endElement) {
                const midpointX = endElement.x + endElement.width / 2;
                const midpointY = endElement.y + endElement.height / 2;
                if (end[0] > midpointX) {
                    end[0] = -1 * Math.abs(end[0]);
                }
                if (end[1] > midpointY) {
                    end[1] = -1 * Math.abs(end[1]);
                }
            }
            (element as any).width = Math.abs(end[0] - element.points[0][0]);
            (element as any).height = Math.abs(end[1] - element.points[0][1]);
        }
    }

}