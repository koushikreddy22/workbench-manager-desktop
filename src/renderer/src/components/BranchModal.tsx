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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                        <GitBranch className="h-5 w-5 text-indigo-500" />
                        Switch Branch
                    </h2>
                    <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-neutral-700 dark:hover:text-gray-200 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Select a branch to checkout for <span className="font-medium text-gray-900 dark:text-gray-200">{serviceName}</span>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg pl-9 pr-4 py-2 border-gray-300 bg-white placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white dark:focus:border-indigo-400 sm:text-sm border outline-none transition-all"
                            placeholder="Search branches..."
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
                                    <ul className="divide-y divide-gray-100 dark:divide-neutral-700/50">
                                        {filteredBranches.map((branch) => (
                                            <li key={branch}>
                                                <button
                                                    onClick={() => handleCheckout(branch)}
                                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-white dark:hover:bg-neutral-800 transition-colors flex items-center gap-2 group ${currentBranch === branch ? 'bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                                                >
                                                    <GitBranch className={`h-4 w-4 ${currentBranch === branch ? 'text-indigo-500' : 'text-gray-400 group-hover:text-indigo-500 transition-colors'}`} />
                                                    <span className="truncate">{branch}</span>
                                                    {currentBranch === branch && (
                                                        <span className="ml-auto text-[10px] bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                                                            Current
                                                        </span>
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
