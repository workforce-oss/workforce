import { Edit } from "@mui/icons-material";
import { useEffect, useRef, useState } from "react";
import { Handle, Position, useUpdateNodeInternals } from "reactflow";
import { CustomColors, classNames, createHandleId } from "../util/util";

export const ConnectionComponent = (props: { propertyName: string, type: 'input' | 'taskInput' | 'output', nodeId: string, parentExpanded: boolean, descriptionExpanded: boolean, resizeTracker: number, editable?: boolean, configType?: string, onChange?: (value: string) => void }) => {


    const [position, setPosition] = useState(0);
    const [editting, setEditting] = useState(false);
    const updateNodeInternals = useUpdateNodeInternals();

    const ref = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (ref.current && ref.current.offsetTop && ref.current.clientHeight) {
            setPosition(ref.current.offsetTop + ref.current.clientHeight / 2);
            updateNodeInternals(props.nodeId);
        }
    }, [props.nodeId, ref, updateNodeInternals, props.parentExpanded, props.resizeTracker, props.descriptionExpanded, props.configType]);
    useEffect(() => {
        updateNodeInternals(props.nodeId);
    }, [props.nodeId, position, updateNodeInternals]);

    return (
        <div className="w-full flex flex-wrap justify-between items-center bg-gray-50 dark:bg-gray-800 dark:text-white mt-1 px-5 py-2"
            ref={ref}>
            <>
                <Handle
                    type={(props.type === 'input' || props.type === 'taskInput') ? "target" : "source"}
                    position={(props.type === 'input' || props.type === 'taskInput') ? Position.Left : Position.Right}
                    id={createHandleId(props.nodeId, props.propertyName, props.type)}
                    className={classNames(
                        (props.type === 'input' || props.type === 'taskInput') ? "-ml-0.5 " : "-mr-0.5 ",
                        "w-4 h-4 rounded-full border-2 bg-white dark:bg-gray-800"
                    )}
                    style={{
                        borderColor:
                            props.propertyName === 'worker' ?
                                CustomColors.worker[800] :
                                props.propertyName === 'tracker' ?
                                    CustomColors.tracker[800] :
                                    props.propertyName === 'credential' ?
                                        CustomColors.credential[800] :
                                        props.propertyName === 'channel' ?
                                            CustomColors.channel[800] :
                                            (props.type === 'input' || props.type === 'taskInput') ? "rgb(0, 100, 255)" : "rgb(255, 0, 0)",
                        top: position
                    }}
                ></Handle>
                {(props.type === 'input' || props.type === 'taskInput') ?
                    <></> :
                    <div className="w-2"></div>}
                <div
                    className={"text-md truncate w-full " + ((props.type === 'input' || props.type === 'taskInput') ? "" : "text-end")}
                >
                    {props.editable && editting ?
                        <input
                            ref={inputRef}
                            className="w-full bg-gray-50 dark:bg-gray-800 dark:text-white"
                            type="text"
                            value={props.propertyName}
                            onChange={() => {
                                props.onChange(inputRef.current.value || '');
                            }}
                            onBlur={() => {
                                props.onChange(inputRef.current.value || '');
                                setEditting(false);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    props.onChange(inputRef.current.value || '');
                                    setEditting(false);
                                }
                            }}
                            autoFocus
                        /> :
                        <>
                            {props.propertyName}
                            {props.editable ?
                                <button
                                    onClick={() => {
                                        setEditting(true);
                                    }}
                                    className="pl-1 m-0 text-small rounded-full hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                                ><Edit></Edit></button>
                                : <></>}
                        </>
                    }
                </div>
            </>
        </div>
    )
}