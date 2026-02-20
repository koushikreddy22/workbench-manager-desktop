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
        <div className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {name}
                </h3>
                <button
                    onClick={() => onEdit(id)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-500 transition-colors"
                >
                    <Settings className="h-4 w-4" />
                </button>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 dark:border-neutral-700 pt-4 mt-2">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{serviceCount} Services</span>
                <div className="flex gap-2">
                    <button
                        onClick={handleRun}
                        disabled={loading}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Play className="h-4 w-4 fill-current ml-0.5" />
                        )}
                    </button>
                    <button
                        onClick={handleStop}
                        disabled={loading}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Square className="h-4 w-4 fill-current" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
