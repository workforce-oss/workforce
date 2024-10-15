export const ToolOutputHeaderComponent = (props: { outputName: string, type: string, onHideClick: (() => void) }) => {
    return (
        <div className="border-border-400   sticky   flex   items-center   gap-1   border-b   px-2   py-2">
        <div className="flex flex-auto items-center gap-1 overflow-hidden">
            <button 
                onClick={props.onHideClick}
            className="inline-flex
                                items-center
                                justify-center
                                relative
                                shrink-0
                                ring-offset-2
                                ring-offset-bg-300
                                ring-accent-main-100
                                focus-visible:outline-none
                                focus-visible:ring-1
                                disabled:pointer-events-none
                                disabled:opacity-50
                                disabled:shadow-none
                                disabled:drop-shadow-none text-text-200
                                        transition-all
                                        font-styrene
                                        active:bg-bg-400
                                        hover:bg-bg-500/40
                                        hover:text-text-100 h-8 w-8 rounded-md active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z">
                    </path>
                </svg>
            </button>
            <h3 className="text-text-100 font-tiempos truncate text-sm">{props.outputName}
            </h3>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-1">
             {props.type === "code" &&(
            <div role="group" dir="ltr" className="bg-bg-300 border-bg-300 inline-flex rounded-full border" tabIndex={0} style={{ outline: "none" }}>
                <button type="button" data-state="on" role="radio" aria-checked="true" className="text-text-500 data-[state=&quot;on&quot;]:text-text-100 border-0.5 data-[state=&quot;on&quot;]:bg-bg-100 data-[state=&quot;on&quot;]:border-border-300 flex items-center rounded-full border-transparent font-medium gap-1 py-1 pl-2.5 pr-2.5 text-xs" data-testid="undefined-normal" tabIndex={-1} data-radix-collection-item="">
                    Preview
                </button>
                <button type="button" data-state="off" role="radio" aria-checked="false" className="text-text-500 data-[state=&quot;on&quot;]:text-text-100 border-0.5 data-[state=&quot;on&quot;]:bg-bg-100 data-[state=&quot;on&quot;]:border-border-300 flex items-center rounded-full border-transparent font-medium gap-1 py-1 pl-2.5 pr-2.5 text-xs" data-testid="undefined-code" tabIndex={-1} data-radix-collection-item="">
                    Code
                </button>
            </div>
             )}
            <button className="inline-flex
                                items-center
                                justify-center
                                relative
                                shrink-0
                                ring-offset-2
                                ring-offset-bg-300
                                ring-accent-main-100
                                focus-visible:outline-none
                                focus-visible:ring-1
                                disabled:pointer-events-none
                                disabled:opacity-50
                                disabled:shadow-none
                                disabled:drop-shadow-none text-text-200
                                        transition-all
                                        font-styrene
                                        active:bg-bg-400
                                        hover:bg-bg-500/40
                                        hover:text-text-100 h-8 w-8 rounded-md active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z">
                    </path>
                </svg>
            </button>
        </div>
    </div>
    );
}