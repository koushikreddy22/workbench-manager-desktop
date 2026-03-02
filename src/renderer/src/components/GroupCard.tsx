import { useState } from "react";
import { Play, Square, Settings, Loader2 } from "lucide-react";

interface GroupCardProps {
    id: string;
    name: string;
    serviceCount: number;
    onRun: (id: string) => Promise<void>;
    onStop: (id: string) => Promise<void>;
    onEdit: (id: string) => void;
}

export function GroupCard({
    id,
    name,
    serviceCount,
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

    return (
        <div className="group rounded-2xl border border-slate-800/50 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-indigo-500/30 hover:bg-slate-900/60">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                    {name}
                </h3>
                <button
                    onClick={() => onEdit(id)}
                    className="p-2.5 rounded-xl bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white transition-all border border-slate-700/50"
                >
                    <Settings className="h-4 w-4" />
                </button>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800/60 pt-6 mt-4">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">{serviceCount} Channels</span>
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
