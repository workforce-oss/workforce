import { ChatBubble, ChatBubbleOutline, ExpandMore } from "@mui/icons-material";
import { Accordion, AccordionDetails, AccordionSummary, Card, CardContent, Grid } from "@mui/material";
import { useState } from "react";
import { MessageRequest } from "workforce-core/model";

export const ChannelRequestComponent = (props: { channelMessage: MessageRequest }) => {
	const { channelMessage } = props;
	const [expanded, setExpanded] = useState(false);

	if (channelMessage.message === undefined || channelMessage.message === null || channelMessage.message === "") {
		return null;
	}
	return (
		<Accordion
			style={{ marginLeft: "10px", marginTop: 1 }}
			expanded={expanded}
			onChange={() => setExpanded(!expanded)}
		>
			<AccordionSummary expandIcon={<ExpandMore />}>
				<Grid container spacing={2}>
					<Grid item xs={2}>
						<ChatBubbleOutline style={{marginRight: 10}}/><b>Channel Message</b>
					</Grid>
					<Grid item xs={5} alignContent={"flex-end"} alignItems={"end"}>
						<b>Timestamp:</b> {new Date(channelMessage.timestamp).toISOString()}
					</Grid>
					<Grid item xs={12}>
						<b>Sender:</b> {channelMessage.senderId}
					</Grid>
					<Grid item xs={12}>
						{channelMessage.message}
					</Grid>
				</Grid>
			</AccordionSummary>
			<AccordionDetails key="item0">
				<Grid container spacing={2}>
					<Grid item xs={12}>
						<b>Channel ID:</b> {channelMessage.channelId}
					</Grid>
					<Grid item xs={12}>
						<b>Worker ID:</b> {channelMessage.workerId}
					</Grid>
					<Grid item xs={12}>
						<b>Message ID:</b> {channelMessage.messageId}
					</Grid>
				</Grid>
			</AccordionDetails>
		</Accordion>
	);
};
