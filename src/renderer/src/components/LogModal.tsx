import { X, Terminal as TerminalIcon, ExternalLink, Search } from "lucide-react";
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

    const [searchTerm, setSearchTerm] = useState("");
    const [isClearing, setIsClearing] = useState(false);
    const [isLaunching, setIsLaunching] = useState(false);
    const [clearedCount, setClearedCount] = useState(0);

    useEffect(() => {
        if (!isOpen) {
            setLogs([]);
            setSearchTerm("");
            setClearedCount(0);
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
        if (autoScrollEnabled.current && !searchTerm) {
            endOfLogsRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, searchTerm]);

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        autoScrollEnabled.current = isAtBottom;
    };

    const handleClearLogs = () => {
        setIsClearing(true);
        setClearedCount(logs.length);
        setTimeout(() => setIsClearing(false), 500);
    };

    if (!isOpen) return null;

    const handleOpenExternalTerminal = () => {
        if (isLaunching) return;
        setIsLaunching(true);
        window.api.openTerminal(servicePath);
        setTimeout(() => setIsLaunching(false), 5000);
    };

    const visibleLogs = logs.slice(clearedCount);
    const filteredLogs = searchTerm 
        ? visibleLogs.filter(log => log.toLowerCase().includes(searchTerm.toLowerCase()))
        : visibleLogs;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-900 border border-slate-700/50 shadow-2xl relative">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <TerminalIcon className="h-48 w-48 text-cyan-500" />
                </div>
                <div className="relative z-10 flex flex-col border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-md">
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-4 text-white">
                            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                                <TerminalIcon className="h-6 w-6 text-cyan-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black">{serviceName} Console</h2>
                                <p className="text-[10px] text-cyan-500/60 font-mono tracking-widest uppercase mt-0.5">
                                    Path: {servicePath}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleClearLogs}
                                disabled={isClearing}
                                className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-all border border-red-500/20 disabled:opacity-50 cursor-pointer"
                            >
                                {isClearing ? 'Clearing...' : 'Clear Logs'}
                            </button>
                            <button
                                onClick={handleOpenExternalTerminal}
                                disabled={isLaunching}
                                className="flex items-center gap-2 rounded-xl bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-400 hover:bg-cyan-500/20 transition-all border border-cyan-500/20 disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-500/5"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>OS Terminal</span>
                            </button>
                            <button
                                onClick={onClose}
                                className="rounded-full p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="px-6 pb-4">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search logs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/30 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
                            />
                        </div>
                    </div>
                </div>

                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto bg-slate-950/80 p-8 font-mono text-[13px] leading-relaxed text-slate-300 selection:bg-cyan-500/30 custom-scrollbar"
                >
                    {filteredLogs.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-slate-600 gap-3">
                            <Search className="h-8 w-8 opacity-20" />
                            <p className="font-mono text-sm tracking-tight italic">
                                {searchTerm ? `No logs matching "${searchTerm}"` : "Waiting for logs..."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredLogs.map((log, index) => (
                                <div key={index} className="group break-all hover:bg-white/5 px-2 py-0.5 rounded transition-colors whitespace-pre-wrap flex gap-4">
                                    <span className="text-slate-700 select-none min-w-[32px] text-right">{index + 1}</span>
                                    <span className="flex-1">{log}</span>
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
