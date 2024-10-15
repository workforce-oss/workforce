import { SvgIcon } from "@mui/material";
import { CustomColors, CustomIcons } from "../../util/util";
import { Note } from "@mui/icons-material";

export const ObjectSection = (props: { objects: any }) => {
	const { objects } = props;

	function onDragStart(event: React.DragEvent<HTMLDivElement>, data: { id: string; type: string; subtype: string, config: any }) {
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData("json", JSON.stringify(data));
		console.log("drag start", data);
	}

	return (
		<div className="p-2 flex flex-col gap-2">
			{objects.map((item, j) =>
				item.tyep === "credential" ? null : (
                    <div key={j}>
					<div
						draggable
						className="cursor-grab bg-white border-l-8 shadow rounded-md"
						style={{ borderLeftColor: CustomColors.colors.get(item.type)[800] }}
						onDragStart={(event) =>
							onDragStart(event, {
								id: item.id,
								type: item.type,
                                subtype: item.subtype,
								config: undefined,
							})
						}
					>
						<div className="flex w-full justify-between text-sm px-3 py-1 items-center border-gray-400 dark:border-gray-600 border-l-0 rounded-md rounded-l-none border">
							<span className="text-black dark:text-white pr-1 truncate text-xs">{item.name}</span>
							<div className="w-4 h-6 text-gray-400 dark:text-gray-600">
								<SvgIcon component={CustomIcons.icons.get(item.subType) ?? Note}></SvgIcon>
							</div>
						</div>
					</div>
                    </div>
				)
			)}
		</div>
	);
};
