export function getHtml(args: {
    chatScriptUrl: string,
    orgId: string,
    sessionId: string,
    channelId: string,
    codeEditorUrl: string
}): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Code</title>
    <script defer="defer" src="${args.chatScriptUrl}"
        data-workforce-org-id="${args.orgId}"
        data-workforce-channel-id="${args.channelId}"
        data-workforce-session-id="${args.sessionId}"
        data-workforce-draggable="true"
        ></script>
</head>
<body style="margin: 0px; padding: 0px;">
    <div id="code-editor" style="height: 100vh; width: 100vw;">
        <iframe src="${args.codeEditorUrl}" style="height: 100%; width: 100%; border: none;"></iframe>
    </div>
</body>
</html>
`;
}