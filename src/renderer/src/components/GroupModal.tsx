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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold dark:text-white">
                        {initialGroup ? "Edit Group" : "Create New Group"}
                    </h2>
                    <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-neutral-700 dark:hover:text-gray-200 transition-colors">
                        <X className="h-5 w-5" />
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

                    <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100 dark:border-neutral-700/60">
                        {initialGroup ? (
                            <button
                                onClick={handleDelete}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </button>
                        ) : (
                            <div className="w-20" /> /* spacer */
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!name.trim() || selectedPaths.length === 0}
                                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Save Group
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
