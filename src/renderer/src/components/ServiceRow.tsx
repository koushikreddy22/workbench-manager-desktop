import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { FileText, GitBranch, MoreVertical, Download, Settings, RefreshCw, Wrench, Code, Copy, Check, Database, Plus, Edit2, Archive } from "lucide-react";
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

interface ServiceRowProps {
    name: string;
    path: string;
    status: "running" | "stopped" | "error" | "starting" | "building" | "installing" | "build-error" | "install-error";
    mode: "dev" | "prod" | null;
    port?: number;
    gitBranch?: string;
    gitStatus?: GitStatus;
    customButtons?: CustomButton[];
    onToggle: (path: string, action: "start" | "stop" | "log", mode?: "dev" | "prod") => void;
    onCommand: (path: string, action: string, payload?: any) => void;
    onOpenIde: (path: string) => void;
    isIdeLoading?: boolean;
    isEnvSwitching?: boolean;
    activeEnv?: { name: string; color: string } | null;
    envProfiles?: { id: string; name: string; color: string }[];
    activeEnvId?: string | null;
}

export function ServiceRow({ name, path, status, mode, port, gitBranch, gitStatus, envProfiles, activeEnvId, customButtons, onToggle, onCommand, onOpenIde, isIdeLoading, isEnvSwitching }: ServiceRowProps) {
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
        try {
            await onCommand(path, action, payload);
        } catch (error) {
            console.error(error);
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
            "group flex items-center gap-4 px-6 py-3 rounded-xl border transition-all duration-200 w-full",
            status === "running"
                ? mode === "prod"
                    ? "bg-amber-950/10 border-amber-500/20 hover:bg-amber-950/20"
                    : "bg-cyan-950/10 border-cyan-500/20 hover:bg-cyan-950/20"
                : "bg-slate-900/40 border-slate-800/50 hover:bg-slate-900/60"
        )}>
            {/* 1. Status & Name (Flexible) */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full", statusColor)} title={status} />
                <h3 className="text-sm font-bold text-white truncate" title={name}>
                    {name}
                </h3>
                <div className="flex items-center gap-0.5 min-w-0">
                    {isEnvSwitching ? (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/80 shrink-0">
                            <div className="h-2.5 w-2.5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                            <span className="text-[8px] font-bold text-slate-400 tracking-wide uppercase">Switching...</span>
                        </div>
                    ) : envProfiles && envProfiles.length > 0 ? (
                        <div className="flex items-center rounded-full bg-slate-800/90 border border-slate-700/60 p-px gap-px">
                            {envProfiles.map((profile) => (
                                <button
                                    key={profile.id}
                                    onClick={(e) => { e.stopPropagation(); if (activeEnvId !== profile.id) onCommand(path, 'switch-env', { profileId: profile.id }); }}
                                    className={cn(
                                        "flex items-center gap-1 px-1.5 py-px rounded-full text-[8px] font-bold uppercase tracking-wide transition-all duration-200 whitespace-nowrap",
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
                                className="flex items-center justify-center w-4 h-4 rounded-full text-slate-500 hover:text-cyan-400 hover:bg-slate-700/50 transition-all"
                                title="Add Profile"
                            >
                                <Plus className="h-2 w-2" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); onCommand(path, 'open-env-settings', { initialMode: 'edit' }); }}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-all"
                        >
                            <Settings className="h-2.5 w-2.5" />
                            <span className="text-[8px] font-bold uppercase tracking-wide">Env</span>
                        </button>
                    )}
                    {envProfiles && envProfiles.length > 0 && !isEnvSwitching && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onCommand(path, 'open-env-settings', { initialMode: 'edit' }); }}
                            className="flex items-center justify-center w-4 h-4 rounded-full text-slate-600 hover:text-cyan-400 hover:bg-slate-800/80 transition-all"
                            title="Edit Profiles"
                        >
                            <Edit2 className="h-2 w-2" />
                        </button>
                    )}
                </div>
                <button
                    onClick={handleCopyPath}
                    className="flex-shrink-0 p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-cyan-400 transition-colors"
                    title="Copy Path"
                >
                    {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </button>
            </div>

            {/* 2. Port (Fixed 80px) */}
            <div className="w-20 shrink-0 flex justify-center">
                {port ? (
                    <a
                        href={`http://localhost:${port}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-cyan-400/80 hover:text-cyan-400 hover:underline"
                    >
                        :{port}
                    </a>
                ) : (
                    <span className="text-slate-600 font-mono text-xs">-</span>
                )}
            </div>

            {/* 3. Git Status (Fixed 180px) */}
            <div className="w-[180px] shrink-0 min-w-0">
                {gitBranch ? (
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/50 border border-slate-700/50 text-[10px] text-slate-400 font-mono truncate cursor-pointer hover:border-cyan-500/30"
                            onClick={() => handleAction('git-checkout-modal')}
                        >
                            <GitBranch className="h-3 w-3 shrink-0" />
                            <span className="truncate">{gitBranch}</span>
                            {gitStatus?.hasLocalChanges && (
                                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                            )}
                        </div>
                        {gitStatus && (gitStatus.ahead > 0 || gitStatus.behind > 0) && (
                            <div className="flex gap-1 shrink-0">
                                {gitStatus.ahead > 0 && <span className="text-[9px] font-bold text-green-500">+{gitStatus.ahead}</span>}
                                {gitStatus.behind > 0 && <span className="text-[9px] font-bold text-red-500">-{gitStatus.behind}</span>}
                            </div>
                        )}
                    </div>
                ) : (
                    <span className="text-slate-700 text-[10px]">-</span>
                )}
            </div>

            {/* 4. Modes (Fixed 140px) */}
            <div className="w-[140px] shrink-0 flex gap-2">
                <button
                    onClick={() => onToggle(path, status === "running" && mode === "dev" ? "stop" : "start", "dev")}
                    disabled={(status === "running" && mode === "prod") || status === "building"}
                    className={cn(
                        "flex-1 flex items-center justify-center h-7 rounded-lg text-[10px] font-black transition-all border",
                        status === "running" && mode === "dev"
                            ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                            : "bg-cyan-500/5 text-cyan-500/60 border-cyan-500/20 hover:bg-cyan-500/20 hover:text-cyan-400"
                    )}
                >
                    {status === "running" && mode === "dev" ? "STOP" : "DEV"}
                </button>
                <button
                    onClick={() => onToggle(path, status === "running" && mode === "prod" ? "stop" : "start", "prod")}
                    disabled={(status === "running" && mode === "dev") || status === "building"}
                    className={cn(
                        "flex-1 flex items-center justify-center h-7 rounded-lg text-[10px] font-black transition-all border",
                        status === "running" && mode === "prod"
                            ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                            : "bg-amber-500/5 text-amber-500/60 border-amber-500/20 hover:bg-amber-500/20 hover:text-amber-400"
                    )}
                >
                    {status === "building" ? "..." : status === "running" && mode === "prod" ? "STOP" : "PROD"}
                </button>
            </div>

            {/* 5. Quick Actions (Fixed 260px) */}
            <div className="w-[260px] shrink-0 flex items-center justify-end gap-1.5 pr-2">
                {/* Custom Buttons */}
                {customButtons?.map((btn, idx) => {
                    if (!btn.name || !btn.command) return null;
                    return (
                        <button
                            key={idx}
                            onClick={() => handleAction('custom-command', { command: btn.command, name: btn.name })}
                            style={{ color: btn.color }}
                            className="p-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-800 transition-all border border-transparent hover:border-current/20 cursor-pointer"
                            title={btn.name}
                        >
                            <Code className="h-3.5 w-3.5" />
                        </button>
                    );
                })}

                <button
                    onClick={() => handleAction('npm-build')}
                    className="p-1.5 rounded-lg bg-slate-800/40 text-slate-500 hover:text-cyan-400 hover:bg-slate-800 transition-all cursor-pointer"
                    title="Build"
                >
                    <Wrench className="h-3.5 w-3.5" />
                </button>
                <button
                    onClick={() => onOpenIde(path)}
                    disabled={isIdeLoading}
                    className="p-1.5 rounded-lg bg-slate-800/40 text-slate-500 hover:text-cyan-400 hover:bg-slate-800 transition-all"
                    title="IDE"
                >
                    {isIdeLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Code className="h-3.5 w-3.5" />}
                </button>
                <button
                    onClick={() => onToggle(path, "log")}
                    className="p-1.5 rounded-lg bg-slate-800/40 text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
                    title="Logs"
                >
                    <FileText className="h-3.5 w-3.5" />
                </button>

                <div className="relative ml-1" ref={menuRef}>
                    <button
                        onClick={toggleMenu}
                        className="p-1.5 rounded-lg bg-slate-800/40 text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
                    >
                        <MoreVertical className="h-3.5 w-3.5" />
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
                                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all underline-offset-4"
                            >
                                <Settings className="h-4 w-4 text-slate-500" /> Channel Config
                            </button>
                            <button
                                onClick={() => handleAction('git-pull')}
                                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                            >
                                <RefreshCw className="h-4 w-4 text-slate-500" /> Git Pull
                            </button>
                            <button
                                onClick={() => handleAction('open-env-settings', { initialMode: 'edit' })}
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                            >
                                <Database className="h-4 w-4 text-slate-500" /> Environment...
                            </button>
                            <button
                                onClick={() => handleAction('archive')}
                                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-amber-400 transition-all underline-offset-4"
                            >
                                <Archive className="h-4 w-4 text-slate-500 group-hover:text-amber-400" /> Archive Channel
                            </button>
                            <div className="border-t border-slate-800/80 my-1"></div>
                            <button
                                onClick={() => handleAction('npm-install')}
                                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                            >
                                <Download className="h-4 w-4 text-slate-500" /> NPM Install
                            </button>
                        </div>,
                        document.body
                    )}


                </div>
            </div>
        </div>
    );
}
