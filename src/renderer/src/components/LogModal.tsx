import { X, Terminal as TerminalIcon, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface LogModalProps {
    isOpen: boolean;
    onClose: () => void;
    serviceName: string;
    servicePath: string;
}

export function LogModal({ isOpen, onClose, serviceName, servicePath }: LogModalProps) {
    const [logs, setLogs] = useState<string[]>([]);
    const endOfLogsRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const autoScrollEnabled = useRef(true);

    const [isLaunching, setIsLaunching] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setLogs([]);
            return;
        }

        const fetchLogs = async () => {
            const data = await window.api.getLogs({ path: servicePath });
            setLogs(data.logs || []);
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 1500);

        return () => clearInterval(interval);
    }, [isOpen, servicePath]);

    useEffect(() => {
        if (autoScrollEnabled.current) {
            endOfLogsRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs]);

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        autoScrollEnabled.current = isAtBottom;
    };

    if (!isOpen) return null;

    const handleOpenExternalTerminal = () => {
        if (isLaunching) return;
        setIsLaunching(true);
        window.api.openTerminal(servicePath);
        setTimeout(() => setIsLaunching(false), 5000);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-slate-900 border border-slate-700/50 shadow-2xl relative">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <TerminalIcon className="h-48 w-48 text-cyan-500" />
                </div>
                <div className="relative z-10 flex items-center justify-between border-b border-slate-800/60 bg-slate-950/40 px-6 py-5 backdrop-blur-md">
                    <div className="flex items-center gap-4 text-white">
                        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                            <TerminalIcon className="h-6 w-6 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black">{serviceName} Logs</h2>
                            <p className="text-[10px] text-cyan-500/60 font-mono tracking-widest uppercase mt-0.5">
                                Channel: {servicePath.split(/[\/\\]/).pop()}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleOpenExternalTerminal}
                            disabled={isLaunching}
                            className="flex items-center gap-2 rounded-xl bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-400 hover:bg-cyan-500/20 transition-all border border-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/5"
                            title="Open in OS Terminal"
                        >
                            {isLaunching ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <ExternalLink className="h-4 w-4" />
                            )}
                            <span>{isLaunching ? 'Launching...' : 'OS Terminal'}</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="rounded-full p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors ml-2 cursor-pointer"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto bg-slate-950/80 p-8 font-mono text-sm leading-relaxed text-slate-300 selection:bg-cyan-500/30"
                >
                    {logs.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-gray-600">
                            No logs available yet...
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {logs.map((log, index) => (
                                <div key={index} className="break-all hover:bg-white/5 px-2 py-0.5 rounded transition-colors whitespace-pre-wrap">
                                    {log}
                                </div>
                            ))}
                            <div ref={endOfLogsRef} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
