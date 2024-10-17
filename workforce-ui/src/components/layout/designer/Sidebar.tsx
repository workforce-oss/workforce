import { Color } from "@mui/material";
import { ObjectSubtype, ObjectType } from "workforce-core/model";
import { CustomColors } from "../../../util/util";
import { ObjectSection } from "../../objects/ObjectSection";

type ItemType = {
	type: ObjectType | "document-reference";
	subtype: ObjectSubtype | "documentation";
	name: string;
	color: Color;
};

type ItemCategoryType = {
	name: string;
	items: ItemType[];
};

const itemCategories: ItemCategoryType[] = [
	{
		name: "Documentation",
		items: [
			{
				type: "documentation",
				subtype: "default-documentation",
				name: "Documentation",
				color: CustomColors.documentRepository,
			}
		]
	},
	{
		name: "Tasks",
		items: [
			{
				type: "task",
				subtype: "simple-task",
				name: "Simple Task",
				color: CustomColors.task,
			},
		],
	},
	{
		name: "Trackers",
		items: [
			{
				type: "tracker",
				subtype: "trello-tracker",
				name: "Trello",
				color: CustomColors.tracker,
			},
			{
				type: "tracker",
				subtype: "github-board-tracker",
				name: "GitHub Project Board",
				color: CustomColors.tracker,
			},
		],
	},
	{
		name: "Resources",
		items: [
			{
				type: "resource",
				subtype: "github-repo-resource",
				name: "GitHub Repository",
				color: CustomColors.resource,
			},
			{
				type: "resource",
				subtype: "github-pull-request-resource",
				name: "GitHub Pull Request",
				color: CustomColors.resource,
			},
			{
				type: "resource",
				subtype: "raw-text-resource",
				name: "Raw Text",
				color: CustomColors.resource,
			},
		],
	},

	{
		name: "Tools",
		items: [
			{
				type: "tool",
				subtype: "openapi-tool",
				name: "OpenAPI Tool",
				color: CustomColors.tool,
			},
			{
				type: "tool",
				subtype: "excalidraw-tool",
				name: "Excalidraw Tool",
				color: CustomColors.tool,
			},
			{
				type: "tool",
				subtype: "template-tool",
				name: "Template Tool",
				color: CustomColors.tool,
			},
			{
				type: "tool",
				subtype: "coding-tool",
				name: "Coding Tool",
				color: CustomColors.tool,
			},
			{
				type: "tool",
				subtype : "google-drive-tool",
				name: "Google Drive Tool",
				color: CustomColors.tool,
			},
			{
				type: "tool",
				subtype: "google-slides-tool",
				name: "Google Slides Tool",
				color: CustomColors.tool,
			},
			{
				type: "tool",
				subtype: "trello-ticket-tool",
				name: "Trello Ticket Tool",
				color: CustomColors.tool,
			},
			{
				type: "tool",
				subtype: "github-board-ticket-tool",
				name: "GitHub Board Ticket Tool",
				color: CustomColors.tool,
			},
			{
				type: "tool",
				subtype: "message-channel-tool",
				name: "Message Channel Tool",
				color: CustomColors.tool,
			}
		],
	},
	{
		name: "Channels",
		items: [
			{
				type: "channel",
				subtype: "slack-channel",
				name: "Slack Channel",
				color: CustomColors.channel,
			},
			{
				type: "channel",
				subtype: "discord-channel",
				name: "Discord Channel",
				color: CustomColors.channel,
			},
			{
				type: "channel",
				subtype: "native-channel",
				name: "Native Channel",
				color: CustomColors.channel,
			},
		],
	},
];

export const SideBar = () => {
	function onDragStart(event: React.DragEvent<HTMLDivElement>, data: { type: string; subType: string }) {
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData("json", JSON.stringify(data));
	}

	return (
		<div className="w-full overflow-auto" style={{
			paddingTop: '1rem',
		}}>
			{itemCategories.map((category, i) => (
				<div key={i}>
					<div className="text-gray-800 text-center">{category.name}</div>
						<ObjectSection objects={category.items} key={i} />					
				</div>
			))}
		</div>
	);
};
