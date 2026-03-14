import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";

interface Group {
    id: string;
    name: string;
    servicePaths: string[]; // Keep for compatibility
    serviceModes?: Record<string, "dev" | "prod">;
    serviceEnvs?: Record<string, string>;
}

interface Service {
    name: string;
    path: string;
    envProfiles?: { id: string; name: string; color: string }[];
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
    const [serviceModes, setServiceModes] = useState<Record<string, "dev" | "prod">>({});
    const [serviceEnvs, setServiceEnvs] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            setName(initialGroup?.name || "");
            setSelectedPaths(initialGroup?.servicePaths || []);
            setServiceModes(initialGroup?.serviceModes || {});
            setServiceEnvs(initialGroup?.serviceEnvs || {});
        }
    }, [isOpen, initialGroup]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({
            id: initialGroup?.id || crypto.randomUUID(),
            name,
            servicePaths: selectedPaths,
            serviceModes,
            serviceEnvs,
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
            const newModes = { ...serviceModes };
            delete newModes[path];
            setServiceModes(newModes);
        } else {
            setSelectedPaths([...selectedPaths, path]);
            setServiceModes({ ...serviceModes, [path]: "dev" });
            const svc = availableServices.find(s => s.path === path);
            if (svc?.envProfiles && svc.envProfiles.length > 0) {
                setServiceEnvs({ ...serviceEnvs, [path]: svc.envProfiles[0].id });
            }
        }
    };

    const setServiceMode = (path: string, mode: "dev" | "prod") => {
        setServiceModes({ ...serviceModes, [path]: mode });
    };

    const setServiceEnv = (path: string, envId: string) => {
        setServiceEnvs({ ...serviceEnvs, [path]: envId });
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
                        <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                            Group Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-lg border-slate-700 bg-slate-800/50 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 sm:text-sm p-3 border outline-none transition-all shadow-sm"
                            placeholder="e.g. Core Services"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2 mt-4">
                            Select Services ({selectedPaths.length})
                        </label>
                        <div className="max-h-60 overflow-y-auto space-y-1.5 border border-slate-700/50 rounded-lg p-3 bg-slate-800/20 shadow-inner">
                            {availableServices.length === 0 ? (
                                <p className="text-sm text-slate-500 p-2 text-center">No services available</p>
                            ) : availableServices.map(service => {
                                const isSelected = selectedPaths.includes(service.path);
                                const currentMode = serviceModes[service.path] || "dev";

                                return (
                                    <div key={service.path} className={`flex items-center justify-between p-2 rounded-md ${isSelected ? 'bg-cyan-500/10 border border-cyan-500/20' : 'hover:bg-slate-800/60 border border-transparent'} cursor-pointer transition-colors`}>
                                        <label className="flex items-center space-x-3 flex-1 cursor-pointer truncate">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900 transition-colors"
                                                checked={isSelected}
                                                onChange={() => toggleService(service.path)}
                                            />
                                            <span className="text-sm font-bold text-slate-100 truncate" title={service.path}>{service.name}</span>
                                        </label>

                                        {isSelected && (
                                            <div className="flex items-center gap-2 ml-2 shrink-0">
                                                {service.envProfiles && service.envProfiles.length > 0 && (
                                                    <select
                                                        value={serviceEnvs[service.path] || ''}
                                                        onChange={(e) => setServiceEnv(service.path, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-[10px] bg-slate-800 border border-slate-700 rounded px-1 py-1 text-slate-300 outline-none focus:border-cyan-500 transition-all font-bold"
                                                    >
                                                        {service.envProfiles.map(p => (
                                                            <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>
                                                        ))}
                                                    </select>
                                                )}
                                                <div className="flex bg-slate-800/50 rounded-lg p-0.5">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setServiceMode(service.path, 'dev'); }}
                                                        className={`px-2 py-1 rounded-md text-[10px] font-black tracking-wider uppercase transition-all ${currentMode === 'dev'
                                                            ? 'bg-cyan-500/20 text-cyan-400 shadow-sm border border-cyan-500/30'
                                                            : 'text-slate-500 hover:text-slate-300'
                                                            }`}
                                                    >
                                                        Dev
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setServiceMode(service.path, 'prod'); }}
                                                        className={`px-2 py-1 rounded-md text-[10px] font-black tracking-wider uppercase transition-all ${currentMode === 'prod'
                                                            ? 'bg-amber-500/20 text-amber-500 shadow-sm border border-amber-500/30'
                                                            : 'text-slate-500 hover:text-slate-300'
                                                            }`}
                                                    >
                                                        Prod
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
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
