import { PiArrowSquareOut, PiClipboard, PiDownloadSimple } from "react-icons/pi";

export const ToolOutputFooterComponent = (props: { hidden: boolean, modifiedTime?: string, clipboardEnabled?: boolean, downloadUrl?: string, openUrl?: string }) => {
    return (
        <div className="sticky bottom-0 bg-bg-200 flex  items-center   justify-between   text-sm   text-text-500   py-2   px-2   border-t   border-border-400"
            style={{
                opacity: props.hidden ? 0 : 1,
                pointerEvents: props.hidden ? "none" : "auto"

            }}
        >

            <div className="flex-1">
                {props.modifiedTime && <div className="px-3 text-xs">{props.modifiedTime}</div>}
            </div>
            <div className="flex flex-1 items-center justify-end">
                {props.clipboardEnabled &&
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
          hover:text-text-100 h-8 w-8 rounded-md active:scale-95"
          >
                        <PiClipboard size={16} />
                    </button>
                }
                {props.downloadUrl &&
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
                        <PiDownloadSimple size={18} />
                    </button>
                }
                {props.openUrl &&
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
          hover:text-text-100 h-8 w-8 rounded-md active:scale-95"
          
            onClick={() => {
                window.open(props.openUrl, '_blank');
            }}
          >
                        <PiArrowSquareOut size={18} />
                    </button>
                }
            </div>
        </div>
    )
}