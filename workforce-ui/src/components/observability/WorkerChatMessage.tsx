import { ChatBubbleOutline, ExpandMore, FunctionsOutlined } from "@mui/icons-material";
import { Accordion, AccordionDetails, AccordionSummary, Grid } from "@mui/material";
import { useState } from "react";
import { ChatMessage } from "workforce-core/model";
import { actualTabsAndNewlines } from "../../util/util";

export const WorkerChatMessageComponent = (props: { message: ChatMessage }) => {
    const { message } = props;
    const [expanded, setExpanded] = useState(false);

    let timestamp = message.timestamp as any;
    try {
        timestamp = new Date(message.timestamp / 1).toISOString();
    } catch (e) {
        console.error(e);
    }

    if (message.role === "tool") {
        if (message.toolCalls && message.toolCalls.length > 0) {
            message.toolCalls.forEach((toolCall) => {
                toolCall.arguments = {};
            });
        }
    }

    return (
        <Accordion
            style={{ marginLeft: "10px", marginTop: 1 }}
            expanded={expanded}
            onChange={() => setExpanded(!expanded)}
        >
            <AccordionSummary expandIcon={<ExpandMore />}>
                <Grid container spacing={2}>
                    <Grid item xs={3}>
                        {message.role === "tool" ? <><FunctionsOutlined style={{ marginRight: 10 }} /><b>Tool Responses</b></> : null}
                        {message.role !== "tool" && message.toolCalls ? <><FunctionsOutlined style={{ marginRight: 10 }} /><b>Tool Calls</b></> : null}
                        {message.role !== "tool" && !message.toolCalls && message.text ? <><ChatBubbleOutline style={{ marginRight: 10 }} /><b>Message</b></> : null}

                    </Grid>
                    <Grid item xs={5} alignContent={"flex-end"} alignItems={"end"}>
                        <b>Timestamp:</b> {timestamp}
                    </Grid>
                    <Grid item xs={12}>
                        <b>Role:</b> {message.role}
                    </Grid>
                    <Grid item xs={12}>
                        {message.role === "tool" ? <b>Tool Responses: </b> :
                          message.toolCalls
                                    ? <b>Tool Calls:</b>
                                    : ""

                        }
                        {message.role === "tool" ? <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{actualTabsAndNewlines(JSON.stringify({ response: message.toolCalls }, null, 2))}</pre> :
                           message.toolCalls
                                    ? <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{actualTabsAndNewlines(JSON.stringify(message.toolCalls, null, 2))}</pre>
                                    : ""
                        }
                    </Grid>
                    <Grid item xs={12}>
                        {message.text ? <b>Message:</b> : null}
                        {message.text ? <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}> {message.text}</pre> : null}
                    </Grid>
                                
                    <Grid item xs={12}>
                        {message.state ? <b>State:</b> : null}
                        {message.state ? <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{actualTabsAndNewlines(JSON.stringify(message.state, null, 2))}</pre> : null}
                    </Grid>
                </Grid>
            </AccordionSummary>
            <AccordionDetails key="item0">
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <b>Message ID:</b> {message.id}
                    </Grid>
                </Grid>
            </AccordionDetails>
        </Accordion>
    );
}