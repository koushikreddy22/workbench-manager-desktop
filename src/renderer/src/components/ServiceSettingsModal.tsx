import { useState, useEffect } from 'react';
import { X, Save, Command } from 'lucide-react';

interface CustomButton {
    name: string;
    command: string;
    color: string;
}

interface ServiceConfig {
    devCommand?: string;
    prodCommand?: string;
    buildCommand?: string;
    installCommand?: string;
    customButtons?: CustomButton[];
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
        installCommand: '',
        customButtons: [
            { name: '', command: '', color: '#06b6d4' },
            { name: '', command: '', color: '#06b6d4' },
            { name: '', command: '', color: '#06b6d4' }
        ]
    });

    const [hasInitialized, setHasInitialized] = useState(false);

    useEffect(() => {
        if (isOpen && !hasInitialized) {
            const btns = initialConfig?.customButtons || [];
            const paddedBtns = [...btns];
            while (paddedBtns.length < 3) {
                paddedBtns.push({ name: '', command: '', color: '#06b6d4' });
            }

            setConfig({
                devCommand: initialConfig?.devCommand || '',
                prodCommand: initialConfig?.prodCommand || '',
                buildCommand: initialConfig?.buildCommand || '',
                installCommand: initialConfig?.installCommand || '',
                customButtons: paddedBtns.slice(0, 3)
            });
            setHasInitialized(true);
        } else if (!isOpen) {
            setHasInitialized(false);
        }
    }, [isOpen, initialConfig, hasInitialized]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(servicePath, config);
        onClose();
    };

    const updateCustomButton = (index: number, field: keyof CustomButton, value: string) => {
        const newBtns = [...(config.customButtons || [])];
        newBtns[index] = { ...newBtns[index], [field]: value };
        setConfig({ ...config, customButtons: newBtns });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-2xl bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-700/50 relative">
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
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest">Base Commands</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Dev Command</label>
                                    <input
                                        type="text"
                                        value={config.devCommand}
                                        onChange={(e) => setConfig({ ...config, devCommand: e.target.value })}
                                        placeholder="npm run dev"
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 font-mono transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Prod Command</label>
                                    <input
                                        type="text"
                                        value={config.prodCommand}
                                        onChange={(e) => setConfig({ ...config, prodCommand: e.target.value })}
                                        placeholder="npm start"
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 font-mono transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Build Command</label>
                                    <input
                                        type="text"
                                        value={config.buildCommand}
                                        onChange={(e) => setConfig({ ...config, buildCommand: e.target.value })}
                                        placeholder="npm run build"
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 font-mono transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Install Command</label>
                                    <input
                                        type="text"
                                        value={config.installCommand}
                                        onChange={(e) => setConfig({ ...config, installCommand: e.target.value })}
                                        placeholder="npm install"
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 font-mono transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest">Custom Action Buttons</h3>
                            <div className="space-y-6">
                                {[0, 1, 2].map((idx) => (
                                    <div key={idx} className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/50 space-y-3">
                                        <div className="flex gap-3">
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Button Name</label>
                                                <input
                                                    type="text"
                                                    value={config.customButtons?.[idx]?.name || ''}
                                                    onChange={(e) => updateCustomButton(idx, 'name', e.target.value)}
                                                    placeholder={`Button ${idx + 1}`}
                                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 font-bold"
                                                />
                                            </div>
                                            <div className="w-20">
                                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Color</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={config.customButtons?.[idx]?.color || '#06b6d4'}
                                                        onChange={(e) => updateCustomButton(idx, 'color', e.target.value)}
                                                        className="h-8 w-full bg-transparent border-none cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Command</label>
                                            <input
                                                type="text"
                                                value={config.customButtons?.[idx]?.command || ''}
                                                onChange={(e) => updateCustomButton(idx, 'command', e.target.value)}
                                                placeholder="e.g., npm run test"
                                                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-400 focus:outline-none focus:border-indigo-500/50 font-mono"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 p-6 border-t border-slate-800/60 bg-slate-950/40 backdrop-blur-md flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-black text-white bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 rounded-xl transition-all shadow-xl shadow-indigo-600/20 cursor-pointer"
                    >
                        <Save className="h-4 w-4" />
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
}
