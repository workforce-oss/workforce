import { isUrl } from "workforce-ui-core";


export const IframeToolComponent = (props: { src: string }) => {
    const { src } = props;

    return (
        <div className="flex flex-col h-full w-full bg-bg-200 overflow-y-none overflow-x-hidden">
            <iframe                
                srcDoc={isUrl(src) ? undefined : src}
                src={isUrl(src) ? src : undefined}
                className="flex-1 w-full h-full"
            />
            
        </div>
    )
}