import { useState, useEffect } from 'react';
import { X, Save, Command } from 'lucide-react';

interface ServiceConfig {
    devCommand?: string;
    prodCommand?: string;
    buildCommand?: string;
    installCommand?: string;
}

interface ServiceSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    servicePath: string;
    serviceName: string;
    initialConfig?: ServiceConfig;
    onSave: (path: string, config: ServiceConfig) => void;
}

export function ServiceSettingsModal({
    isOpen,
    onClose,
    servicePath,
    serviceName,
    initialConfig,
    onSave
}: ServiceSettingsModalProps) {
    const [config, setConfig] = useState<ServiceConfig>({
        devCommand: '',
        prodCommand: '',
        buildCommand: '',
        installCommand: ''
    });

    useEffect(() => {
        if (isOpen) {
            setConfig({
                devCommand: initialConfig?.devCommand || '',
                prodCommand: initialConfig?.prodCommand || '',
                buildCommand: initialConfig?.buildCommand || '',
                installCommand: initialConfig?.installCommand || ''
            });
        }
    }, [isOpen, initialConfig]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(servicePath, config);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-700/50 relative">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                    <Command className="h-32 w-32 text-cyan-500" />
                </div>
                <div className="relative z-10 flex items-center justify-between p-6 border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
                            <Command className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">Channel Settings</h2>
                            <p className="text-[10px] text-cyan-500/60 font-mono tracking-widest uppercase mt-0.5">{serviceName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                        Override the default commands used to run and build this service. Leave blank to use the defaults (e.g., <code className="bg-gray-100 dark:bg-neutral-700 px-1 py-0.5 rounded text-xs text-pink-600 dark:text-pink-400">npm run dev</code>).
                    </p>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">Dev Command</label>
                            <input
                                type="text"
                                value={config.devCommand}
                                onChange={(e) => setConfig({ ...config, devCommand: e.target.value })}
                                placeholder="npm run dev"
                                className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">Prod Command</label>
                            <input
                                type="text"
                                value={config.prodCommand}
                                onChange={(e) => setConfig({ ...config, prodCommand: e.target.value })}
                                placeholder="npm start"
                                className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">Build Command</label>
                            <input
                                type="text"
                                value={config.buildCommand}
                                onChange={(e) => setConfig({ ...config, buildCommand: e.target.value })}
                                placeholder="npm run build"
                                className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">Install Command</label>
                            <input
                                type="text"
                                value={config.installCommand}
                                onChange={(e) => setConfig({ ...config, installCommand: e.target.value })}
                                placeholder="npm install"
                                className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                            />
                        </div>
                    </div>
                </div>

                <div className="relative z-10 p-6 border-t border-slate-800/60 bg-slate-950/40 backdrop-blur-md flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-black text-white bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 rounded-xl transition-all shadow-xl shadow-indigo-600/20"
                    >
                        <Save className="h-4 w-4" />
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
}
