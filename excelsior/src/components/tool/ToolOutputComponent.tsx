import { useEffect, useRef, useState } from "react";
import { PythonToolComponent } from "./tools/PythonTool";
import testCode from "./tools/pythonTest";
import { ToolOutputHeaderComponent } from "./ToolOutputHeaderComponent";
import { ToolOutputFooterComponent } from "./ToolOutputFooter";
import { IframeToolComponent } from "./tools/IframeTool";
import { ExcalidrawToolComponent } from "./tools/ExcalidrawTool";
import { ToolState, toolStore } from "workforce-ui-core";
import { NativeChatSocketAPI } from "workforce-api-client";
import shallow from "zustand/shallow";

export interface ToolCall {
    name?: string;
    arguments?: Record<string, any>;
    call_id?: string;
    sessionId?: string;
    result?: string;
    humanState?: { name: string, type: string, embed?: string, directUrl?: string};
}

const toolStateSelector = (state: ToolState) => {
    return {
        selectedToolSessionId: state.selectedToolSessionId,
        selectedToolCalls: state.selectedToolCalls,
    };
}

export const ToolOutputComponent = (props: {
    // toolOutputs: ToolCall[],
    hidden: boolean,
    onHideClick: () => void,
    chatSocketApi: NativeChatSocketAPI
}) => {
    const { hidden, chatSocketApi } = props;
    const outputsRef = useRef<HTMLDivElement>(null);
    const [horizontalOffset, setHorizontalOffset] = useState(0);
    const [dragging, setDragging] = useState(false);

    const { selectedToolCalls } = toolStore(toolStateSelector);

    if (outputsRef.current) {
        outputsRef.current.scrollTop = 0;
    }
    const hasContent = selectedToolCalls.length > 0;
    let outputClasses = "opacity-0 translate-x-1/2 w-0 h-[4.5rem]";
    let innerOutputClasses = "opacity-0 translate-x-1/2 w-0 h-0";
    if (!hidden && hasContent) {
        outputClasses = `opacity-100 w-auto translate-x-0 lg:w-[var(--tool-output-width)] h-full`;
        innerOutputClasses = "opacity-100 w-[calc(100vw-2rem)] lg:w-full";
    } else if (hidden && hasContent) {
        outputClasses = "opacity-50 translate-x-0 w-[var(--tool-output-width)] lg:w-0 h-[4.5rem]";
        innerOutputClasses = "opacity-50 h-[5rem] lg:w-20";
    }

    if (selectedToolCalls.length === 0) {
        return null;
    }

    const selectedToolCall = selectedToolCalls[0];


    return (
        <>
        <style>{`:root {
            --tool-output-width: calc(50vw - ${String(horizontalOffset)}px);
            --tool-output-transition-mode: ${dragging ? "none" : "width,height"};
            --tool-output-inner-transition-mode: ${dragging ? "none" : "width"};
        }`}</style>
        <div className={`sticky top-0 transition-[var(--tool-output-transition-mode)] duration-500 ml-8  ${outputClasses}`}>
            <div className="fixed flex flex-col top-0 bottom-0 w-4 z-20 -left-6 mt-4 mb-4 cursor-ew-resize md:display-none md:invisible lg:display-block lg:visible lg:z-20"
             onMouseDown={(e) => {
                e.preventDefault();
                setDragging(true);
                let startX = e.clientX;

                const onMouseMove = (e: MouseEvent) => {
                    if (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
                        return;
                    }
                    setHorizontalOffset(horizontalOffset+e.clientX - startX);                    
                };
                const onMouseUp = () => {
                    setDragging(false);
                    window.removeEventListener("mousemove", onMouseMove);
                    window.removeEventListener("mouseup", onMouseUp);
                };

                window.addEventListener("mousemove", onMouseMove);
                window.addEventListener("mouseup", onMouseUp);
            }}
            />

            <div className={`transition-[var(--tool-output-inner-transition-mode)] ${outputClasses}`}></div>
            <div className={`fixed bottom-0 top-0 flex w-full flex-col transition-[var(--tool-output-inner-transition-mode)] z-[5] right-0   pt-4 pb-4 pr-1 lg:pb-4 lg:pr-1
                ${innerOutputClasses}
            `}
                style={{
                    marginRight: "15px",
                    pointerEvents: dragging ? "none" : "auto",
                }}
            >
                <div className="bg-bg-100 border-0.5 border-border-300 flex-1 overflow-clip rounded-xl shadow-lg"
                    // Make this dynamic
                    style={{
                        opacity: 1,
                        transform: hidden ? "translateX(90%) scaleX(0.1), translateZ(-100%)" : "translateX(0%) scaleX(1) translateZ(0%)",
                    }}>
                    <div className="flex h-full flex-col"
                        style={{
                            opacity: 1,
                        }}>
                        <div className="bg-bg-000 flex h-full flex-col">
                            <ToolOutputHeaderComponent
                                type={selectedToolCall?.humanState?.type ?? "interpreter"}
                                onHideClick={props.onHideClick}
                                outputName={selectedToolCall?.humanState?.name ?? ""}
                            />
                            <div className="relative h-full w-full border-none bg-bg-300">
                                {
                                    getToolComponent({toolCall: {
                                        sessionId: selectedToolCall.sessionId,
                                        humanState: {
                                            name: selectedToolCall.humanState?.name ?? "Document",
                                            type: selectedToolCall.humanState?.type ?? "iframe",
                                            embed: selectedToolCall.humanState?.embed,
                                            directUrl: selectedToolCall.humanState?.directUrl,
                                        }
                                    }, chatSocketApi})
                                }
                            </div>
                            <ToolOutputFooterComponent
                                hidden={hidden}
                                openUrl={selectedToolCall?.humanState?.directUrl}
                            />
                        </div>
                    </div>

                </div>
            </div>
        </div>
        </>
    )
}

function getToolComponent(args: {toolCall?: ToolCall, chatSocketApi: NativeChatSocketAPI}) {
    const { toolCall, chatSocketApi } = args;
    switch (toolCall?.humanState?.type) {
        case "interpreter":
            return <PythonToolComponent codeText={testCode} index={0} />;
        case "excalidraw":
            return <ExcalidrawToolComponent chatSocketAPI={chatSocketApi}/>;
        default:
            return <IframeToolComponent src={toolCall?.humanState?.embed ?? ""} />;
    }
}
