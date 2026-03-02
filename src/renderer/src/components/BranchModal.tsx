import { useState, useEffect } from "react";
import { X, GitBranch, Search, Loader2 } from "lucide-react";

interface BranchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCheckout: (path: string, branch: string) => void;
    servicePath?: string;
    serviceName?: string;
    currentBranch?: string;
}

export function BranchModal({
    isOpen,
    onClose,
    onCheckout,
    servicePath,
    serviceName,
    currentBranch,
}: BranchModalProps) {
    const [branches, setBranches] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && servicePath) {
            setSearchQuery("");
            setBranches([]);
            fetchBranches();
        }
    }, [isOpen, servicePath]);

    const fetchBranches = async () => {
        if (!servicePath) return;
        setIsLoading(true);
        try {
            const result = await window.api.gitCommand({ action: 'get-branches', path: servicePath });
            if (result.branches) {
                setBranches(result.branches);
            }
        } catch (error) {
            console.error("Failed to fetch branches:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const filteredBranches = branches.filter(b => b.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleCheckout = (branch: string) => {
        if (servicePath) {
            onCheckout(servicePath, branch);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all animate-in fade-in duration-300">
            <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/50 shadow-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <GitBranch className="h-32 w-32 text-indigo-500" />
                </div>
                <div className="relative z-10 flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                            <GitBranch className="h-6 w-6 text-indigo-400" />
                        </div>
                        Switch Branch
                    </h2>
                    <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Select a branch to checkout for <span className="font-medium text-gray-900 dark:text-gray-200">{serviceName}</span>
                    </div>

                    <div className="relative group z-10">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/5 outline-none transition-all text-sm"
                            placeholder="Find a branch..."
                            autoFocus
                        />
                    </div>

                    <div className="mt-4 border border-gray-200 dark:border-neutral-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-neutral-900/50">
                        {isLoading ? (
                            <div className="flex justify-center items-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                            </div>
                        ) : (
                            <div className="max-h-60 overflow-y-auto w-full">
                                {filteredBranches.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-gray-500">
                                        No branches found
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-slate-800/50">
                                        {filteredBranches.map((branch) => (
                                            <li key={branch}>
                                                <button
                                                    onClick={() => handleCheckout(branch)}
                                                    className={`w-full text-left px-5 py-4 text-sm hover:bg-slate-800/40 transition-all flex items-center gap-3 group relative ${currentBranch === branch ? 'bg-indigo-500/5 text-indigo-400 font-bold' : 'text-slate-300 hover:text-white'}`}
                                                >
                                                    <GitBranch className={`h-4 w-4 ${currentBranch === branch ? 'text-indigo-400' : 'text-slate-600 group-hover:text-indigo-400 transition-colors'}`} />
                                                    <span className="truncate">{branch}</span>
                                                    {currentBranch === branch && (
                                                        <>
                                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                                                            <span className="ml-auto text-[10px] bg-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-md font-black uppercase tracking-widest border border-indigo-500/20">
                                                                Current
                                                            </span>
                                                        </>
                                                    )}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
