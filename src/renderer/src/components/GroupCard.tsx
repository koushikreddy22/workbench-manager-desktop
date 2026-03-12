import { useState } from "react";
import { Play, Square, Settings, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

interface GroupCardProps {
    id: string;
    name: string;
    serviceCount: number;
    modes?: Record<string, "dev" | "prod">;
    onRun: (id: string) => Promise<void>;
    onStop: (id: string) => Promise<void>;
    onEdit: (id: string) => void;
}

export function GroupCard({
    id,
    name,
    serviceCount,
    modes,
    onRun,
    onStop,
    onEdit,
}: GroupCardProps) {
    const [loading, setLoading] = useState(false);

    const handleRun = async () => {
        setLoading(true);
        await onRun(id);
        setLoading(false);
    };

    const handleStop = async () => {
        setLoading(true);
        await onStop(id);
        setLoading(false);
    };

    const hasProd = modes && Object.values(modes).some(m => m === 'prod');

    return (
        <div className={cn(
            "group rounded-2xl border transition-all duration-300 shadow-2xl backdrop-blur-md p-6",
            hasProd
                ? "bg-amber-950/20 border-amber-500/30 hover:border-amber-500/60 hover:shadow-amber-500/10 hover:bg-amber-950/30"
                : "bg-cyan-950/20 border-cyan-500/30 hover:border-cyan-500/60 hover:shadow-cyan-500/10 hover:bg-cyan-950/30"
        )}>
            <div className="flex items-start justify-between mb-6 gap-4">
                <h3 className={cn(
                    "text-xl font-bold transition-colors break-words leading-tight",
                    hasProd ? "text-white group-hover:text-amber-400" : "text-white group-hover:text-cyan-400"
                )}>
                    {name}
                </h3>
                <button
                    onClick={() => onEdit(id)}
                    className="p-2.5 rounded-xl bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white transition-all border border-slate-700/50 shrink-0"
                >
                    <Settings className="h-4 w-4" />
                </button>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800/60 pt-6 mt-4 flex-wrap gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 shrink-0">{serviceCount} Channels</span>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleRun}
                        disabled={loading}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all shadow-lg shadow-cyan-500/5"
                        title="Pulse All"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Play className="h-5 w-5 fill-current ml-0.5" />
                        )}
                    </button>
                    <button
                        onClick={handleStop}
                        disabled={loading}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-all shadow-lg shadow-red-500/5"
                        title="Silence All"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Square className="h-5 w-5 fill-current" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
