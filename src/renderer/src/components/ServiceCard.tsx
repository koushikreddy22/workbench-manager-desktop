import { useState, useRef, useEffect } from "react";
import { Play, Square, FileText, GitBranch, MoreVertical, Download, Settings, RefreshCw, Wrench, Rocket, Code, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "../lib/utils";

interface GitStatus {
    hasLocalChanges: boolean;
    ahead: number;
    behind: number;
}

interface ServiceProps {
    name: string;
    path: string;
    status: "running" | "stopped" | "error" | "starting";
    mode: "dev" | "prod" | null;
    port?: number;
    gitBranch?: string;
    gitStatus?: GitStatus;
    onToggle: (path: string, action: "start" | "stop" | "log", mode?: "dev" | "prod") => void;
    onCommand: (path: string, action: string, payload?: any) => void;
    onOpenIde: (path: string) => void;
    isIdeLoading?: boolean;
}

export function ServiceCard({ name, path, status, mode, port, gitBranch, gitStatus, onToggle, onCommand, onOpenIde, isIdeLoading }: ServiceProps) {
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAction = async (action: string, payload?: any) => {
        setMenuOpen(false);
        setActionLoading(action);
        try {
            await onCommand(path, action, payload);
        } finally {
            if (action !== 'git-pull' && action !== 'npm-build') {
                setActionLoading(null);
            } else if (action === 'git-pull') {
                setTimeout(() => setActionLoading(null), 2000);
            } else if (action === 'npm-build') {
                setTimeout(() => setActionLoading(null), 5000);
            }
        }
    };

    const statusColor =
        status === "running"
            ? "bg-green-500"
            : status === "starting"
                ? "bg-yellow-500"
                : status === "error"
                    ? "bg-red-500"
                    : "bg-gray-400";

    return (
        <div className="group relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800">
            <div className="flex items-start justify-between mb-4 gap-3">
                <div className="flex items-center gap-2.5 min-w-0 pt-1">
                    <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full", statusColor)} />
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate" title={name}>
                        {name}
                    </h3>
                    {mode && status === "running" && (
                        <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ml-1",
                            mode === 'prod' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                        )}>
                            {mode}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-neutral-700 transition-colors"
                        >
                            <MoreVertical className="h-4 w-4" />
                        </button>

                        {menuOpen && (
                            <div className="absolute right-0 top-10 z-20 w-56 rounded-md border border-gray-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800 py-1">
                                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                    Git Operations
                                </div>
                                <button
                                    onClick={() => handleAction('git-checkout-modal')}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-700"
                                >
                                    <GitBranch className="h-4 w-4" /> Switch Branch...
                                </button>

                                <div className="border-t border-gray-100 dark:border-neutral-700 my-1"></div>
                                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                    NPM Commands
                                </div>
                                <button
                                    onClick={() => handleAction('npm-install')}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-700"
                                >
                                    <Download className="h-4 w-4" /> Install
                                </button>
                                <button
                                    onClick={() => handleAction('npm-install-legacy')}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-700"
                                >
                                    <Settings className="h-4 w-4" /> Install (Legacy)
                                </button>
                                <button
                                    onClick={() => handleAction('npm-start-prod')}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-700"
                                >
                                    <Play className="h-4 w-4" /> Run Prod (start)
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => handleAction('npm-build')}
                        disabled={actionLoading === 'npm-build'}
                        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-neutral-700 transition-colors"
                        title="Build Service"
                    >
                        {actionLoading === 'npm-build' && (
                            <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                        )}
                        <Wrench className="h-4 w-4" />
                    </button>

                    <button
                        onClick={() => onOpenIde(path)}
                        disabled={isIdeLoading}
                        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-neutral-700 transition-colors"
                        title="Open in IDE"
                    >
                        {isIdeLoading && (
                            <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                        )}
                        <Code className="h-4 w-4" />
                    </button>

                    <button
                        onClick={() => onToggle(path, "log")}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-neutral-700 transition-colors"
                        title="View Logs"
                    >
                        <FileText className="h-4 w-4" />
                    </button>

                    <button
                        onClick={() => onToggle(path, status === "running" ? "stop" : "start", "dev")}
                        className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                            status === "running" && mode === "dev"
                                ? "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                                : (status === "running" && mode === "prod")
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                                    : "bg-indigo-100 text-indigo-600 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                        )}
                        disabled={status === "running" && mode === "prod"}
                        title={status === "running" && mode === "dev" ? "Stop Service" : "Start Dev Mode"}
                    >
                        {status === "running" && mode === "dev" ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                    </button>

                    <button
                        onClick={() => onToggle(path, status === "running" ? "stop" : "start", "prod")}
                        className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                            status === "running" && mode === "prod"
                                ? "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                                : (status === "running" && mode === "dev")
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                                    : "bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                        )}
                        disabled={status === "running" && mode === "dev"}
                        title={status === "running" && mode === "prod" ? "Stop Service" : "Start Production Mode"}
                    >
                        {status === "running" && mode === "prod" ? <Square className="h-3.5 w-3.5" /> : <Rocket className="h-3.5 w-3.5" />}
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Path</span>
                    <span className="font-mono text-gray-900 dark:text-gray-200 truncate">{path.split(/[\/\\]/).pop()}</span>
                </div>

                {port && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Local URL</span>
                        <a
                            href={`http://localhost:${port}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                            http://localhost:{port}
                        </a>
                    </div>
                )}

                {gitBranch && (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-neutral-700">
                        <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-800 font-mono">
                            <GitBranch className="h-3 w-3" />
                            {gitBranch}
                            {gitStatus?.hasLocalChanges && (
                                <span className="flex h-1.5 w-1.5 rounded-full bg-orange-500 ml-0.5" title="Local Changes" />
                            )}
                        </div>

                        {gitStatus && (gitStatus.ahead > 0 || gitStatus.behind > 0) && (
                            <div className="flex items-center gap-1.5">
                                {gitStatus.ahead > 0 && (
                                    <div className="flex items-center gap-0.5 text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-100 dark:border-green-900/40" title={`${gitStatus.ahead} commits ahead`}>
                                        <ArrowUp className="h-2.5 w-2.5" />
                                        {gitStatus.ahead}
                                    </div>
                                )}
                                {gitStatus.behind > 0 && (
                                    <div className="flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 px-1.5 py-0.5 rounded border border-red-100 dark:border-red-900/40" title={`${gitStatus.behind} commits behind`}>
                                        <ArrowDown className="h-2.5 w-2.5" />
                                        {gitStatus.behind}
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => handleAction('git-pull')}
                            disabled={actionLoading === 'git-pull'}
                            className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:bg-neutral-700 dark:text-gray-400 dark:hover:bg-neutral-600 dark:hover:text-gray-200 transition-colors ml-auto"
                            title="Pull Latest"
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", actionLoading === 'git-pull' && "animate-spin")} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
