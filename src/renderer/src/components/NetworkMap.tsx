import { motion } from "framer-motion";
import { X, Sparkles, Activity } from "lucide-react";

interface ServiceNode {
    name: string;
    status: string;
    dependencies: string[];
}

interface NetworkMapProps {
    isOpen: boolean;
    onClose: () => void;
    services: ServiceNode[];
}

export function NetworkMap({ isOpen, onClose, services }: NetworkMapProps) {
    if (!isOpen) return null;

    // Filter only services with dependencies for the graph
    const nodes = services;
    
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-xl p-8 animate-in fade-in duration-300">
            <div className="w-full h-full max-w-6xl bg-slate-950 border border-purple-500/20 rounded-3xl shadow-[0_0_100px_rgba(168,85,247,0.15)] overflow-hidden flex flex-col relative">
                
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" 
                     style={{ backgroundImage: 'radial-gradient(circle, #4f46e5 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                            <Activity className="h-6 w-6 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight italic">Service Nexus</h2>
                            <p className="text-[10px] text-purple-500 font-bold uppercase tracking-[0.2em]">Live Dependency Topology</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-500 hover:text-white transition-all cursor-pointer">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden relative p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 max-h-full overflow-y-auto custom-scrollbar pr-4">
                        {nodes.map((service, idx) => (
                            <motion.div 
                                key={service.name}
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-purple-500/40 transition-all group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-100 transition-opacity">
                                    <Sparkles className="h-4 w-4 text-purple-500" />
                                </div>

                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`h-2.5 w-2.5 rounded-full ${service.status === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                                    <span className="text-sm font-black text-white tracking-tight">{service.name}</span>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Upstream Dependencies</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {service.dependencies && service.dependencies.length > 0 ? (
                                            service.dependencies.map(dep => (
                                                <span key={dep} className="px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold text-purple-400">
                                                    {dep}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-[10px] italic text-slate-600 font-medium">Independent Node</span>
                                        )}
                                    </div>
                                </div>

                                {/* Flow indicators would go here in a more complex canvas */}
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-800 bg-slate-900/30 flex items-center justify-between text-[10px] text-slate-500 font-mono italic">
                    <span>Topology automatically derived from build manifest analysis.</span>
                    <span className="text-purple-500/60 font-black uppercase tracking-widest">Local Insight Engine v2.0</span>
                </div>
            </div>
        </div>
    );
}
