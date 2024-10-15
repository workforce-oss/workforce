import { ChatBubbleOutline, ExpandMore } from "@mui/icons-material";
import { Accordion, AccordionDetails, AccordionSummary, Grid } from "@mui/material";
import { useState } from "react";
import { ChatSession } from "workforce-core/model";
import { WorkerChatMessageComponent } from "./WorkerChatMessage";


export const WorkerChatSessionComponent = (props: { chatSession: ChatSession }) => {
    const { chatSession } = props;
    const [expanded, setExpanded] = useState(false);

    return (
        <Accordion
            style={{ marginLeft: "10px", marginTop: 1 }}
            expanded={expanded}
            onChange={() => setExpanded(!expanded)}
        >
            <AccordionSummary expandIcon={<ExpandMore />}>
                <Grid container spacing={2}>
                    <Grid item xs={2}>
                        <ChatBubbleOutline style={{ marginRight: 10 }} /><b>Chat Session</b>
                    </Grid>
                    <Grid item xs={5} alignContent={"flex-end"} alignItems={"end"}>
                        <b>Session Id:</b> {chatSession.id}
                    </Grid>
                    <Grid item xs={12}>
                        <b>Channel Id:</b> {chatSession.channelId}
                    </Grid>
                </Grid>
            </AccordionSummary>
            <AccordionDetails key="item0">
                <div style={{ marginTop: 10 }}>
                    {chatSession.messages.filter(message => message.text || message.toolCalls).map((message) => {
                        return <WorkerChatMessageComponent message={message} key={message.id} />;
                    })}
                </div>
            </AccordionDetails>
        </Accordion>
    );
}