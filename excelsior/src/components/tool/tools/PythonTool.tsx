import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';


export const PythonToolComponent = (props: {
    index: number,
    codeText: string,
}) => {
    const { codeText, index } = props;
    const [waiting, setWaiting] = useState(true);
    const [running, setRunning] = useState(false);

    useEffect(() => {
        console.log('Python tool component');
        const onStart = (e: any) => {
            console.log('Python start');
            console.log(e);
            setWaiting(false);
            setRunning(true);
        }
        const onDone = (e: any) => {
            console.log('Python done');
            console.log(e);
            setRunning(false);
        }
        window.addEventListener('py:done', onDone);
        window.addEventListener('py:ready', onStart);

        return () => {
            window.removeEventListener('py:done', onDone);
            window.removeEventListener('py:ready', onStart);
        }
    }, [codeText]);
    return (
        <div className="h-full w-full bg-bg-200 overflow-y-none overflow-x-hidden">
            <div className="group h-full relative inline-flex gap-2 bg-gradient-to-b from-bg-300 from-50%  to-bg-400 ml-px pl-2.5 py-2.5 break-words text-text-200 transition-all flex-col shadow-[0_2px_16px_rgba(0,0,0,0.025)] min-w-[16ch] pr-2.5
             w-full">
                <div className="flex flex-row gap-2 h-1/2 lg:h-[calc(50vh-6rem)] border-border-300 border-0.5 p-2">
                    <div className="flex flex-column">
                        <div className="shrink-0">
                            <div className="flex shrink-0 items-center justify-center rounded-full font-bold h-7 w-12 text-[12px] bg-accent-pro-100 text-bg-100">Python</div>
                        </div>
                    </div>
                    <div className="flex flex-column w-full overflow-y-auto overflow-x-auto p-0">
                        <Markdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            className='font-user-message prose dark:prose-invert overflow-x-hidden w-full max-w-none'>
                            {"```python" +
                                codeText +
                                "\n```"}
                        </Markdown>
                    </div>
                </div>
                <div className="mt-1 flex flex-row gap-2 h-1/2 lg:h-[calc(50vh-8rem)] bg-bg-300 border-border-300 border-0.5 p-2">
                    <div className="flex flex-column h-full">
                        <div className="shrink-0">
                            <div className="flex shrink-0 items-center justify-center rounded-full font-bold h-7 w-12 text-[12px] bg-accent-main-100 text-bg-100">Output</div>
                        </div>
                    </div>
                    <div className="flex flex-column w-full h-full overflow-y-auto overflow-x-auto">
                        <section className='pyscript w-full'>
                            <div dangerouslySetInnerHTML={{
                                __html:
                                    `
                            <script type="py" target="py-out-${index}" worker >
                        from pyscript import display
                        ${codeText}
                        </script>`
                            }} />
                            <div id={`py-status-${index}`} />
                            
                            <div id={`py-out-${index}`} className='bg-bg-300 flex w-full h-full flex-col'>

                                {//If running do a spinner
                                    (waiting || running) ?
                                    <div className="flex flex-col justify-center content-center items-center h-full w-full">
                                            <span className="pt-4">{waiting ? "Waiting on Dependencies..." : "Running Code..."}</span>
                                            <div className="flex justify-center content-center items-center h-full w-full">
                                                <div className="animate-spin rounded-full h-[calc(25vh-8rem)] w-[calc(25vh-8rem)] border-t-2 border-b-2 border-accent-pro-100" />
                                            </div>
                                        </div>
                                        : null}

                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}