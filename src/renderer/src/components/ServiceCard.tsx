import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Play, Square, FileText, GitBranch, MoreVertical, Download, Settings, RefreshCw, Wrench, Rocket, Code, ArrowUp, ArrowDown, FolderOpen, Copy, Check, Database, Plus, Edit2 } from "lucide-react";
import { cn } from "../lib/utils";

interface GitStatus {
    hasLocalChanges: boolean;
    ahead: number;
    behind: number;
}

interface CustomButton {
    name: string;
    command: string;
    color: string;
}

interface ServiceProps {
    name: string;
    path: string;
    status: "running" | "stopped" | "error" | "starting" | "building" | "installing" | "build-error" | "install-error";
    mode: "dev" | "prod" | null;
    port?: number;
    gitBranch?: string;
    gitStatus?: GitStatus;
    customButtons?: CustomButton[];
    onToggle: (path: string, action: "start" | "stop" | "log", mode?: "dev" | "prod") => void;
    onCommand: (path: string, action: string, payload?: any) => Promise<void>;
    onOpenIde: (path: string) => void;
    isIdeLoading?: boolean;
    isEnvSwitching?: boolean;
    activeEnv?: { name: string; color: string } | null;
    envProfiles?: { id: string; name: string; color: string }[];
    activeEnvId?: string | null;
}

export function ServiceCard({ name, path, status, mode, port, gitBranch, gitStatus, envProfiles, activeEnvId, customButtons, onToggle, onCommand, onOpenIde, isIdeLoading, isEnvSwitching }: ServiceProps) {
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number, left: number | 'auto', right: number | 'auto' }>({ top: 0, left: 0, right: 'auto' });
    const menuRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);

    const handleCopyPath = () => {
        navigator.clipboard.writeText(path);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleMenu = () => {
        if (!menuOpen && menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const spaceOnRight = window.innerWidth - rect.right;
            if (spaceOnRight < 224) {
                setMenuPosition({ top: rect.bottom + 8, left: 'auto', right: window.innerWidth - rect.right });
            } else {
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
            setActionLoading(null);
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
            "group relative rounded-2xl border transition-all duration-300 shadow-2xl backdrop-blur-md p-6",
            status === "running" 
                ? mode === "prod"
                    ? "bg-amber-950/20 border-amber-500/30 hover:border-amber-500/60 hover:shadow-amber-500/10 hover:bg-amber-950/30"
                    : "bg-cyan-950/20 border-cyan-500/30 hover:border-cyan-500/60 hover:shadow-cyan-500/10 hover:bg-cyan-950/30"
                : "bg-slate-900/40 border-slate-800/50 hover:border-slate-700/60 hover:bg-slate-900/60"
        )}>
            <div className="flex flex-col gap-4 w-full">
                {/* Header Row: Full Width Name/Status + Menu */}
                <div className="flex items-start justify-between gap-4 w-full">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                            <div className={cn("h-3 w-3 shrink-0 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]", statusColor)} />
                            <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors break-words leading-tight" title={name}>
                                {name}
                            </h3>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                            {isEnvSwitching ? (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-800/80 border border-slate-700/80">
                                    <div className="h-3 w-3 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                                    <span className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">Switching...</span>
                                </div>
                            ) : envProfiles && envProfiles.length > 0 ? (
                                <div className="flex items-center rounded-full bg-slate-800/90 border border-slate-700/60 p-0.5 gap-0.5">
                                    {envProfiles.map((profile) => (
                                        <button
                                            key={profile.id}
                                            onClick={(e) => { e.stopPropagation(); if (activeEnvId !== profile.id) onCommand(path, 'switch-env', { profileId: profile.id }); }}
                                            className={cn(
                                                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide transition-all duration-200 whitespace-nowrap",
                                                activeEnvId === profile.id
                                                    ? "bg-cyan-500/15 text-cyan-300 shadow-sm border border-cyan-500/30"
                                                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 border border-transparent"
                                            )}
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: profile.color }} />
                                            {profile.name}
                                        </button>
                                    ))}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onCommand(path, 'open-env-settings', { initialMode: 'add' }); }}
                                        className="flex items-center justify-center w-5 h-5 rounded-full text-slate-500 hover:text-cyan-400 hover:bg-slate-700/50 transition-all"
                                        title="Add Profile"
                                    >
                                        <Plus className="h-2.5 w-2.5" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onCommand(path, 'open-env-settings', { initialMode: 'edit' }); }}
                                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-all group/env"
                                >
                                    <Settings className="h-3 w-3" />
                                    <span className="text-[9px] font-bold uppercase tracking-wide">Setup Env</span>
                                </button>
                            )}
                            {envProfiles && envProfiles.length > 0 && !isEnvSwitching && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onCommand(path, 'open-env-settings', { initialMode: 'edit' }); }}
                                    className="flex items-center justify-center w-5 h-5 rounded-full text-slate-600 hover:text-cyan-400 hover:bg-slate-800/80 transition-all"
                                    title="Edit Profiles"
                                >
                                    <Edit2 className="h-2.5 w-2.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" ref={menuRef}>
                        <button
                            onClick={toggleMenu}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors border border-slate-700/50 bg-slate-800/40 text-slate-400 hover:bg-slate-700/60 hover:text-white"
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
                                <button
                                    onClick={() => handleAction('open-env-settings', { initialMode: 'edit' })}
                                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                                >
                                    <Database className="h-4 w-4 text-slate-500" /> Environment...
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
                </div>

                {/* Sub-Header Row: Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onToggle(path, "log")}
                        className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg bg-slate-800/40 text-slate-400 hover:bg-slate-700/60 hover:text-white transition-all border border-slate-700/50 text-[11px] font-bold"
                    >
                        <FileText className="h-3.5 w-3.5" /> Logs
                    </button>
                    <button
                        onClick={() => handleAction('npm-build')}
                        disabled={actionLoading === 'npm-build' || status === 'building'}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg transition-all border text-[11px] font-bold",
                            status === 'build-error' ? "bg-red-500/10 text-red-500 border-red-500/40 hover:bg-red-500/20" : "bg-slate-800/40 text-slate-400 hover:bg-slate-700/60 hover:text-cyan-400 border-slate-700/50"
                        )}
                    >
                        {status === 'building' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />} Build
                    </button>
                    <button
                        onClick={() => onOpenIde(path)}
                        disabled={isIdeLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg bg-slate-800/40 text-slate-400 hover:bg-slate-700/60 hover:text-cyan-400 transition-all border border-slate-700/50 text-[11px] font-bold"
                    >
                        {isIdeLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Code className="h-3.5 w-3.5" />} IDE
                    </button>
                </div>

                {/* Body Content */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between text-[11px] mt-2 bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 text-slate-400 group-hover:border-cyan-500/40 transition-all shadow-inner">
                        <span className="opacity-70 flex items-center gap-2 font-bold uppercase tracking-tighter"><FolderOpen className="h-3.5 w-3.5 text-cyan-500" /> Location</span>
                        <button 
                            onClick={handleCopyPath}
                            className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono transition-all text-[10px]"
                        >
                            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                            {copied ? "Copied" : "Copy Path"}
                        </button>
                    </div>

                    {port && (
                        <div className="flex items-center justify-between text-sm shrink-0">
                            <span className="text-slate-500">Network URL</span>
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
                        <div className="flex items-center gap-2 mt-4">
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

                            <button
                                onClick={() => handleAction('git-pull')}
                                disabled={actionLoading === 'git-pull'}
                                className="flex h-8 w-8 items-center justify-center rounded bg-slate-800/40 text-slate-400 hover:bg-slate-700/60 hover:text-cyan-400 transition-all border border-slate-700/50 ml-auto shrink-0"
                                title="Pull Latest"
                            >
                                <RefreshCw className={cn("h-4 w-4", actionLoading === 'git-pull' && "animate-spin")} />
                            </button>
                        </div>
                    )}

                    {/* Custom Shortcut Buttons */}
                    {customButtons && customButtons.length > 0 && customButtons.some(b => b.name && b.command) && (
                        <div className="flex flex-wrap gap-2 mt-2 pt-4 border-t border-slate-800/30">
                            {customButtons.map((btn, idx) => {
                                if (!btn.name || !btn.command) return null;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleAction('custom-command', { command: btn.command, name: btn.name })}
                                        disabled={actionLoading === 'custom-command'}
                                        style={{ 
                                            backgroundColor: `${btn.color}15`, 
                                            borderColor: `${btn.color}30`,
                                            color: btn.color 
                                        }}
                                        className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[10px] font-black transition-all border hover:bg-opacity-20 cursor-pointer"
                                    >
                                        <Code className="h-3 w-3" />
                                        {btn.name.toUpperCase()}
                                    </button>
                                );
                            })}
                        </div>
                    )}

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
                </div>
            </div>

        </div>
    );
}
