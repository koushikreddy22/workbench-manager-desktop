import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";

interface Service {
    name: string;
    path: string;
}

interface Group {
    id: string;
    name: string;
    servicePaths: string[];
}

interface GroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (group: Group, action: 'create' | 'delete', id?: string) => void;
    initialGroup?: Group;
    availableServices: Service[];
}

export function GroupModal({
    isOpen,
    onClose,
    onSave,
    initialGroup,
    availableServices,
}: GroupModalProps) {
    const [name, setName] = useState("");
    const [selectedPaths, setSelectedPaths] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            setName(initialGroup?.name || "");
            setSelectedPaths(initialGroup?.servicePaths || []);
        }
    }, [isOpen, initialGroup]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({
            id: initialGroup?.id || crypto.randomUUID(),
            name,
            servicePaths: selectedPaths,
        }, 'create');
        onClose();
    };

    const handleDelete = () => {
        if (initialGroup?.id) {
            onSave(initialGroup, 'delete', initialGroup.id);
            onClose();
        }
    }

    const toggleService = (path: string) => {
        if (selectedPaths.includes(path)) {
            setSelectedPaths(selectedPaths.filter((p) => p !== path));
        } else {
            setSelectedPaths([...selectedPaths, path]);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/50 shadow-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                    <Trash2 className="h-32 w-32 text-red-500" />
                </div>
                <div className="relative z-10 flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-white">
                        {initialGroup ? "Modify" : "Create"} <span className="text-indigo-400">Cluster</span>
                    </h2>
                    <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            Group Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-lg border-gray-300 bg-white placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-500/20 sm:text-sm p-3 border outline-none transition-all shadow-sm"
                            placeholder="e.g. Core Services"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 mt-4">
                            Select Services
                        </label>
                        <div className="max-h-60 overflow-y-auto space-y-1.5 border border-gray-200 rounded-lg p-3 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-900/50 shadow-inner">
                            {availableServices.length === 0 ? (
                                <p className="text-sm text-gray-500 p-2 text-center">No services available</p>
                            ) : availableServices.map(service => (
                                <label key={service.path} className="flex items-center space-x-3 p-2 rounded-md hover:bg-white dark:hover:bg-neutral-800 cursor-pointer transition-colors border border-transparent hover:border-gray-200 dark:hover:border-neutral-700">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:bg-neutral-700 dark:border-neutral-600 dark:ring-offset-neutral-800"
                                        checked={selectedPaths.includes(service.path)}
                                        onChange={() => toggleService(service.path)}
                                    />
                                    <span className="text-sm font-medium dark:text-gray-200 truncate" title={service.path}>{service.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="relative z-10 flex items-center justify-between pt-6 mt-4 border-t border-slate-800/60">
                        {initialGroup ? (
                            <button
                                onClick={handleDelete}
                                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </button>
                        ) : (
                            <div className="w-20" />
                        )}
                        <div className="flex gap-4">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl border border-slate-700 text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-all shadow-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!name.trim() || selectedPaths.length === 0}
                                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-sm font-black text-white shadow-xl shadow-indigo-600/20 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-30 disabled:grayscale transition-all"
                            >
                                Save Cluster
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
