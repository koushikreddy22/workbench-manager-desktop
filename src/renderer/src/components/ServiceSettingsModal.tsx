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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white dark:bg-neutral-800 rounded-xl shadow-2xl overflow-hidden border border-gray-100 dark:border-neutral-700">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-neutral-700/50 bg-gray-50/50 dark:bg-neutral-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <Command className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Service Settings</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-[200px]">{serviceName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-neutral-700 dark:hover:text-gray-300 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5" />
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

                <div className="p-4 border-t border-gray-100 dark:border-neutral-700/50 bg-gray-50/50 dark:bg-neutral-800/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                    >
                        <Save className="h-4 w-4" />
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
}
