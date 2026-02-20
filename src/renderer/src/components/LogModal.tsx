import { X, Terminal as TerminalIcon, ExternalLink } from "lucide-react";
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
        endOfLogsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    if (!isOpen) return null;

    const handleOpenExternalTerminal = () => {
        if (isLaunching) return;
        setIsLaunching(true);
        window.api.openTerminal(servicePath);
        setTimeout(() => setIsLaunching(false), 5000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-gray-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-800 bg-gray-950 px-6 py-4">
                    <div className="flex items-center gap-3 text-gray-200">
                        <TerminalIcon className="h-5 w-5 text-indigo-400" />
                        <h2 className="text-lg font-semibold">{serviceName} Logs</h2>
                        <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-400 font-mono">
                            {servicePath.split(/[\/\\]/).pop()}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleOpenExternalTerminal}
                            disabled={isLaunching}
                            className="flex items-center gap-1.5 rounded-md bg-indigo-600/20 px-3 py-1.5 text-sm font-medium text-indigo-400 hover:bg-indigo-600/30 transition-colors border border-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Open in OS Terminal"
                        >
                            {isLaunching ? (
                                <div className="h-4 w-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                            ) : (
                                <ExternalLink className="h-4 w-4" />
                            )}
                            <span>{isLaunching ? 'Launching...' : 'Open OS Terminal'}</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="rounded-full p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors ml-2 cursor-pointer"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-[#0d1117] p-6 font-mono text-sm leading-relaxed text-gray-300">
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
