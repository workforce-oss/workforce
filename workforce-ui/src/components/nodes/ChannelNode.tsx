import { ChannelConfig } from "workforce-core/model";
import { CustomNodeData } from "../../nodes/nodeData";
import { CustomColors } from "../../util/util";
import { GenericNode } from "./GenericNode";
import { useState } from "react";
import { ArrowDownward, ArrowUpward } from "@mui/icons-material";


export const ChannelNode = ({ data, selected }: { data: CustomNodeData<ChannelConfig>, selected: boolean }) => {
    // add a button to display a highlightable url popup
    const [showUrl, setShowUrl] = useState(false);

    const getEmbedSnippet = () => {
        return data.config.id ? `<script defer="defer"
        src="${window.location.origin}/embedded-chat/static/js/main.js"
        data-workforce-draggable="true"
        data-workforce-anonymous="${data.config.variables?.anonymous ?? "false"}"
        data-workforce-org-id="${data.config.orgId}"
        data-workforce-channel-id="${data.config.id}">
    </script>` : "";
    }



    return (
        <GenericNode data={data} objectType="channel" selected={selected} children={
            data.config.type === "native-channel" &&
            <div className="w-full">
                <div
                    className="w-full dark:text-white flex items-center justify-between p-4 gap-8 bg-gray-10 dark:bg-gray-800 border dark:border-b-gray-700 "
                    onClick={(e) => {
                        setShowUrl(!showUrl);
                    }}
                    style={{ cursor: "pointer" }}
                >
                    <div className="nodrag w-full flex items-center truncate gap-2 text-lg">
                        <div className="ml-2 truncate">{"Embed URL (Save Flow to Generate)"}</div>
                        <div className="text-end grow pr-2">
                            {showUrl ? <ArrowUpward /> : <ArrowDownward />}{" "}
                        </div>
                    </div>
                </div>
                {showUrl &&
                   <div className="nodrag h-auto w-auto py-4">
                        <textarea className="border-2 border-gray-300 rounded-md p-2 w-full"
                            style={{ fontSize: "14px"}}
                            rows={5}
                            value={getEmbedSnippet()} readOnly />
                    </div>
                }
            </div>
        } headerColor={CustomColors.channel} />
    )
}