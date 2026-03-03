import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Play, Square, FileText, GitBranch, MoreVertical, Download, Settings, RefreshCw, Wrench, Rocket, Code, ArrowUp, ArrowDown, FolderOpen } from "lucide-react";
import { cn } from "../lib/utils";

interface GitStatus {
    hasLocalChanges: boolean;
    ahead: number;
    behind: number;
}

interface ServiceProps {
    name: string;
    path: string;
    status: "running" | "stopped" | "error" | "starting" | "building" | "installing" | "build-error" | "install-error";
    mode: "dev" | "prod" | null;
    port?: number;
    gitBranch?: string;
    gitStatus?: GitStatus;
    onToggle: (path: string, action: "start" | "stop" | "log", mode?: "dev" | "prod") => void;
    onCommand: (path: string, action: string, payload?: any) => void;
    onOpenIde: (path: string) => void;
    isIdeLoading?: boolean;
    layout?: 'grid' | 'list';
}

export function ServiceCard({ name, path, status, mode, port, gitBranch, gitStatus, onToggle, onCommand, onOpenIde, isIdeLoading, layout = 'grid' }: ServiceProps) {
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number, left: number | 'auto', right: number | 'auto' }>({ top: 0, left: 0, right: 'auto' });
    const menuRef = useRef<HTMLDivElement>(null);

    const toggleMenu = () => {
        if (!menuOpen && menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            // Check if there's enough space on the right (224px is 56 * 4 for w-56)
            const spaceOnRight = window.innerWidth - rect.right;
            if (spaceOnRight < 224) {
                // Not enough space, align to right side of the button
                setMenuPosition({ top: rect.bottom + 8, left: 'auto', right: window.innerWidth - rect.right });
            } else {
                // Enough space, align to left side of the button
                setMenuPosition({ top: rect.bottom + 8, left: rect.left, right: 'auto' });
            }
        }
        setMenuOpen(!menuOpen);
    };

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
            if (action !== 'git-pull' && action !== 'npm-build' && action !== 'npm-install') {
                setActionLoading(null);
            } else if (action === 'git-pull') {
                setTimeout(() => setActionLoading(null), 2000);
            } else {
                // For build/install, we wait for the status from props to change
                setActionLoading(null);
            }
        }
    };

    const statusColor =
        status === "running"
            ? "bg-green-500"
            : (status === "starting" || status === "building" || status === "installing")
                ? "bg-yellow-500"
                : (status === "error" || status === "build-error" || status === "install-error")
                    ? "bg-red-500"
                    : "bg-gray-400";

    return (
        <div className={cn(
            "group relative rounded-2xl border border-slate-800/50 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-cyan-500/30 hover:shadow-cyan-500/10 hover:bg-slate-900/60",
            layout === 'list' ? "flex items-center gap-6" : "block"
        )}>
            <div className={cn(
                "flex items-start justify-between gap-4",
                layout === 'list' ? "w-1/4 shrink-0 mb-0" : "mb-5"
            )}>
                <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("h-3 w-3 shrink-0 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]", statusColor)} />
                    <h3 className="text-lg font-bold text-white truncate group-hover:text-cyan-400 transition-colors" title={name}>
                        {name}
                    </h3>
                    {mode && status === "running" && (
                        <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest mr-5 shadow-sm",
                            mode === 'prod' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        )}>
                            {mode}
                        </span>
                    )}
                </div>

                {layout === 'list' && (
                    <div className="hidden sm:block flex-shrink-0 text-sm font-mono text-gray-500 dark:text-gray-400 truncate w-32 ml-4">
                        {path.split(/[\/\\]/).pop()}
                    </div>
                )}

                <div className="flex items-center gap-1.5 shrink-0">
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={toggleMenu}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-neutral-700 transition-colors"
                        >
                            <MoreVertical className="h-4 w-4" />
                        </button>

                        {menuOpen && createPortal(
                            <div
                                onMouseDown={(e) => e.stopPropagation()}
                                className="fixed z-50 w-56 rounded-xl border border-slate-700/50 bg-slate-900 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
                                style={{
                                    top: menuPosition.top,
                                    ...(menuPosition.left !== 'auto' ? { left: menuPosition.left } : {}),
                                    ...(menuPosition.right !== 'auto' ? { right: menuPosition.right } : {})
                                }}
                            >
                                <div className="px-3 py-2 text-[10px] font-black text-cyan-500/60 uppercase tracking-widest bg-slate-950/40">
                                    Vantage Tools
                                </div>
                                <button
                                    onClick={() => handleAction('service-settings')}
                                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all underline-offset-4"
                                >
                                    <Settings className="h-4 w-4 text-slate-500" /> Channel Config
                                </button>

                                <button
                                    onClick={() => handleAction('git-checkout-modal')}
                                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                                >
                                    <GitBranch className="h-4 w-4 text-slate-500" /> Switch Branch...
                                </button>

                                <div className="border-t border-slate-800/80 my-1"></div>
                                <div className="px-3 py-2 text-[10px] font-black text-cyan-500/60 uppercase tracking-widest bg-slate-950/40">
                                    NPM Utility
                                </div>
                                <button
                                    onClick={() => handleAction('npm-install')}
                                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                                >
                                    <Download className="h-4 w-4 text-slate-500" /> Install
                                </button>
                                <button
                                    onClick={() => handleAction('npm-install-legacy')}
                                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                                >
                                    <Settings className="h-4 w-4 text-slate-500" /> Legacy Install
                                </button>
                                <button
                                    onClick={() => handleAction('npm-start-prod')}
                                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                                >
                                    <Play className="h-4 w-4 text-slate-500" /> Production Start
                                </button>
                            </div>,
                            document.body
                        )}
                    </div>

                    {layout === 'grid' && (
                        <div className="flex items-center gap-1.5 ml-2">
                            <button
                                onClick={() => onToggle(path, "log")}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800/40 text-slate-400 hover:bg-slate-700/60 hover:text-white transition-all border border-slate-700/50"
                                title="View Logs"
                            >
                                <FileText className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => handleAction('npm-build')}
                                disabled={actionLoading === 'npm-build' || status === 'building'}
                                className={cn(
                                    "relative flex h-8 w-8 items-center justify-center rounded-full transition-all border",
                                    status === 'build-error' ? "bg-red-500/10 text-red-500 border-red-500/40 hover:bg-red-500/20" : "bg-slate-800/40 text-slate-400 hover:bg-slate-700/60 hover:text-cyan-400 border-slate-700/50"
                                )}
                                title="Build Service"
                            >
                                {(actionLoading === 'npm-build' || status === 'building') && (
                                    <div className="absolute inset-0 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                                )}
                                <Wrench className={cn("h-4 w-4", status === 'building' && "opacity-20")} />
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => onOpenIde(path)}
                        disabled={isIdeLoading}
                        className="relative flex h-8 w-8 items-center justify-center rounded-full bg-slate-800/40 text-slate-400 hover:bg-slate-700/60 hover:text-cyan-400 transition-all border border-slate-700/50"
                        title="Open in IDE"
                    >
                        {isIdeLoading && (
                            <div className="absolute inset-0 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                        )}
                        <Code className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className={cn(
                "space-y-4",
                layout === 'list' ? "flex items-center gap-6 space-y-0 flex-1 min-w-0" : ""
            )}>
                {layout === 'grid' && (
                    <div className="flex items-center justify-between text-[11px] mt-4 bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 text-slate-400 group-hover:border-cyan-500/40 transition-all shadow-inner">
                        <span className="opacity-70 flex items-center gap-2 font-bold uppercase tracking-tighter"><FolderOpen className="h-3.5 w-3.5 text-cyan-500" /> Path</span>
                        <span className="font-mono text-cyan-400 truncate ml-4 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)] font-bold">{path.split(/[\/\\]/).pop()}</span>
                    </div>
                )}

                {port && (
                    <div className={cn(
                        "flex items-center justify-between text-sm",
                        layout === 'list' ? "shrink-0 w-40" : ""
                    )}>
                        {layout === 'grid' && <span className="text-slate-500">Network URL</span>}
                        <a
                            href={`http://localhost:${port}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                        >
                            localhost:{port}
                        </a>
                    </div>
                )}

                {gitBranch && (
                    <div className={cn(
                        "flex items-center gap-2",
                        layout === 'grid' ? "mt-4" : "flex-1 min-w-0 justify-end"
                    )}>
                        <button
                            onClick={() => handleAction('git-checkout-modal')}
                            className="flex items-center gap-2 text-[11px] text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 rounded-lg border border-cyan-500/20 font-mono truncate max-w-[180px] transition-all cursor-pointer text-left"
                            title="Switch Branch"
                        >
                            <GitBranch className="h-3.5 w-3.5 shrink-0 opacity-70" />
                            <span className="truncate">{gitBranch}</span>
                            {gitStatus?.hasLocalChanges && (
                                <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse ml-1" title="Local Changes" />
                            )}
                        </button>

                        {gitStatus && (gitStatus.ahead > 0 || gitStatus.behind > 0) && (
                            <div className="flex items-center gap-1.5">
                                {gitStatus.ahead > 0 && (
                                    <div className="flex items-center gap-0.5 text-[10px] font-bold text-green-500 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(34,197,94,0.1)]" title={`${gitStatus.ahead} ahead`}>
                                        <ArrowUp className="h-2.5 w-2.5" />
                                        {gitStatus.ahead}
                                    </div>
                                )}
                                {gitStatus.behind > 0 && (
                                    <div className="flex items-center gap-0.5 text-[10px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(239,68,68,0.1)]" title={`${gitStatus.behind} behind`}>
                                        <ArrowDown className="h-2.5 w-2.5" />
                                        {gitStatus.behind}
                                    </div>
                                )}
                            </div>
                        )}

                        {layout === 'grid' && (
                            <button
                                onClick={() => handleAction('git-pull')}
                                disabled={actionLoading === 'git-pull'}
                                className="flex h-8 w-8 items-center justify-center rounded bg-slate-800/40 text-slate-400 hover:bg-slate-700/60 hover:text-cyan-400 transition-all border border-slate-700/50 ml-auto shrink-0"
                                title="Pull Latest"
                            >
                                <RefreshCw className={cn("h-4 w-4", actionLoading === 'git-pull' && "animate-spin")} />
                            </button>
                        )}
                    </div>
                )}

                {layout === 'grid' && (
                    <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800/50">
                        <button
                            onClick={() => onToggle(path, status === "running" ? "stop" : "start", "dev")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all border",
                                status === "running" && mode === "dev"
                                    ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                                    : (status === "running" && mode === "prod")
                                        ? "bg-slate-800/50 text-slate-600 border-transparent cursor-not-allowed opacity-40"
                                        : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20"
                            )}
                            disabled={status === "running" && mode === "prod"}
                        >
                            {status === "running" && mode === "dev" ? <><Square className="h-3.5 w-3.5" /> Stop</> : <><Play className="h-3.5 w-3.5" /> Dev Mode</>}
                        </button>

                        <button
                            onClick={() => onToggle(path, status === "running" ? "stop" : "start", "prod")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all border",
                                status === "running" && mode === "prod"
                                    ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                                    : (status === "running" && mode === "dev") || status === "building"
                                        ? "bg-slate-800/50 text-slate-600 border-transparent cursor-not-allowed opacity-40"
                                        : "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20"
                            )}
                            disabled={(status === "running" && mode === "dev") || status === "building"}
                        >
                            {status === "building" ? (
                                <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Building...</>
                            ) : status === "running" && mode === "prod" ? (
                                <><Square className="h-3.5 w-3.5" /> Stop</>
                            ) : (
                                <><Rocket className="h-3.5 w-3.5" /> Prod</>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {
                layout === 'list' && (
                    <div className="flex items-center gap-1.5 shrink-0 ml-4 pl-4 border-l border-gray-100 dark:border-neutral-700/50">
                        <button
                            onClick={() => handleAction('npm-build')}
                            disabled={actionLoading === 'npm-build' || status === 'building'}
                            className={cn(
                                "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                                status === 'build-error' ? "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-neutral-700"
                            )}
                            title="Build Service"
                        >
                            {(actionLoading === 'npm-build' || status === 'building') && (
                                <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                            )}
                            <Wrench className={cn("h-4 w-4", status === 'building' && "opacity-20")} />
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
                                    : (status === "running" && mode === "prod") || status === "building"
                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                                        : "bg-indigo-100 text-indigo-600 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                            )}
                            disabled={(status === "running" && mode === "prod") || status === "building"}
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
                                    : (status === "running" && mode === "dev") || status === "building"
                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                                        : "bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                            )}
                            disabled={(status === "running" && mode === "dev") || status === "building"}
                            title={status === "running" && mode === "prod" ? "Stop Service" : status === "building" ? "Building..." : "Start Production Mode"}
                        >
                            {status === "building" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : status === "running" && mode === "prod" ? <Square className="h-3.5 w-3.5" /> : <Rocket className="h-3.5 w-3.5" />}
                        </button>

                        <button
                            onClick={() => handleAction('git-pull')}
                            disabled={actionLoading === 'git-pull'}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:bg-neutral-700 dark:text-gray-400 dark:hover:bg-neutral-600 dark:hover:text-gray-200 transition-colors shrink-0 ml-1"
                            title="Pull Latest"
                        >
                            <RefreshCw className={cn("h-4 w-4", actionLoading === 'git-pull' && "animate-spin")} />
                        </button>
                    </div>
                )}
        </div>
    );
}
