import { X, BookOpen, Rocket, Play, Settings, GitBranch, Terminal, FolderOpen, LayoutGrid, Wrench, Code, Shield, Copy, Download, Upload, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onReset: () => void;
    onExport: () => void;
    onImport: () => void;
}

export function HelpModal({ isOpen, onClose, onReset, onExport, onImport }: HelpModalProps) {
    const [activeTab, setActiveTab] = useState<'basics' | 'services' | 'clusters' | 'git' | 'system'>('basics');
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        if (isOpen) {
            setIsVisible(true);
        } else {
            timer = setTimeout(() => setIsVisible(false), 300);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [isOpen]);

    if (!isVisible) return null;

    const tabs = [
        { id: 'basics', label: 'Basics & Setup', icon: BookOpen },
        { id: 'services', label: 'Managing Services', icon: Terminal },
        { id: 'git', label: 'Git & Source', icon: GitBranch },
        { id: 'clusters', label: 'Project Clusters', icon: LayoutGrid },
        { id: 'system', label: 'System & Maintenance', icon: Settings },
    ] as const;

    return createPortal(
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 transition-all duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className={`relative w-full max-w-4xl bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300 ${isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-8"}`}>

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                            <BookOpen className="h-6 w-6 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Vantage <span className="text-cyan-400">Documentation</span></h2>
                            <p className="text-slate-400 text-sm font-medium">Learn how to manage your workspace services efficiently</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-all border border-transparent hover:border-slate-700"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Nav */}
                    <div className="w-56 bg-slate-950/30 border-r border-slate-800/50 p-4 shrink-0 overflow-y-auto hidden sm:block">
                        <div className="space-y-2">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${isActive
                                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner"
                                            : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent"
                                            }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                        {/* Mobile tabs */}
                        <div className="flex sm:hidden overflow-x-auto gap-2 pb-4 mb-4 border-b border-slate-800 scrollbar-hide">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                    className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold border ${activeTab === tab.id
                                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                        : "bg-slate-800/50 text-slate-400 border-slate-700/50"
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="max-w-2xl mx-auto space-y-8 pb-12">
                            {activeTab === 'basics' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <h3 className="text-xl font-bold border-b border-slate-800 pb-2 text-white flex items-center gap-2"><FolderOpen className="h-5 w-5 text-cyan-500" /> Workspace Setup</h3>
                                    <p className="text-slate-300 leading-relaxed bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                                        Vantage Dashboard helps you monitor and manage multiple Node.js/web services from a single folder.
                                        To begin, select a <strong>Workspace Folder</strong> that contains your microservices or projects as subdirectories.
                                    </p>

                                    <div className="space-y-4">
                                        <h4 className="font-bold text-cyan-400">Selecting an IDE</h4>
                                        <p className="text-slate-300 text-sm">
                                            Use the dropdown in the header to select your preferred Code Editor (VS Code, Cursor, WebStorm, etc.).
                                            Clicking the <Code className="inline h-4 w-4 text-slate-400 bg-slate-800 p-0.5 rounded" /> code icon on any service card will open that project directly in your chosen IDE.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="font-bold text-cyan-400">Managing Workbenches</h4>
                                        <p className="text-slate-300 text-sm">
                                            You can add multiple workspace folders as tabs.
                                            <strong> Reorder:</strong> Click and drag a tab to change its position.
                                            <strong> Remove:</strong> Click the small <X className="inline h-3 w-3 text-red-400" /> icon on a tab to remove it from your dashboard.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="font-bold text-cyan-400">View Modes</h4>
                                        <p className="text-slate-300 text-sm">
                                            Toggle between <strong>Grid View</strong> and <strong>List View</strong> using the icons in the top right.
                                            Grid view provides larger statistics, while List view is dense for large volumes of services.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'services' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <h3 className="text-xl font-bold border-b border-slate-800 pb-2 text-white flex items-center gap-2"><Terminal className="h-5 w-5 text-indigo-500" /> Controlling Services</h3>

                                    <div className="grid gap-4">
                                        <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Play className="h-5 w-5 text-cyan-400" />
                                                <h4 className="font-bold text-white">Dev Mode</h4>
                                            </div>
                                            <p className="text-sm text-slate-400">Runs the service using the development server command (default: <code>npm run dev</code>). You can customize this command per-service in Channel Config.</p>
                                        </div>

                                        <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Rocket className="h-5 w-5 text-amber-500" />
                                                <h4 className="font-bold text-white">Prod Mode</h4>
                                            </div>
                                            <p className="text-sm text-slate-400">Runs the service using the production server command (default: <code>npm start</code>). Use this to test production builds locally.</p>
                                        </div>

                                         <div className="bg-indigo-500/10 p-5 rounded-2xl border border-indigo-500/20 shadow-inner">
                                             <h4 className="font-bold text-indigo-400 text-sm uppercase tracking-widest mb-3">Card Color legend</h4>
                                             <div className="space-y-3">
                                                 <div className="flex items-center gap-3">
                                                     <div className="h-4 w-4 rounded bg-cyan-500/20 border border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]"></div>
                                                     <span className="text-sm text-slate-300"><strong>Cyan Glow:</strong> Service is running in <strong>Development</strong> mode.</span>
                                                 </div>
                                                 <div className="flex items-center gap-3">
                                                     <div className="h-4 w-4 rounded bg-amber-500/20 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]"></div>
                                                     <span className="text-sm text-slate-300"><strong>Amber Glow:</strong> Service is running in <strong>Production</strong> mode.</span>
                                                 </div>
                                                 <div className="flex items-center gap-3">
                                                     <div className="h-4 w-4 rounded bg-slate-800 border border-slate-700"></div>
                                                     <span className="text-sm text-slate-400"><strong>Gray/Dark:</strong> Service is currently idle or stopped.</span>
                                                 </div>
                                             </div>
                                         </div>

                                        <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Wrench className="h-5 w-5 text-slate-400" />
                                                <h4 className="font-bold text-white">Building & Installing</h4>
                                            </div>
                                            <p className="text-sm text-slate-400">
                                                Use the Wrench icon to trigger a build (<code>npm run build</code>).
                                                You can access <strong>NPM Install</strong> from the vertical dots menu (&#8942;) on each card to manage dependencies.
                                                If a build fails, the wrench icon will turn red.
                                            </p>
                                        </div>

                                        <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Settings className="h-5 w-5 text-indigo-400" />
                                                <h4 className="font-bold text-white">Channel Config</h4>
                                            </div>
                                            <p className="text-sm text-slate-400">
                                                Click the vertical dots (&#8942;) on a card and select <strong>Channel Config</strong> to define custom npm scripts or terminal commands overrides for Dev, Prod, Build, and Install actions just for that service.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'git' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <h3 className="text-xl font-bold border-b border-slate-800 pb-2 text-white flex items-center gap-2"><GitBranch className="h-5 w-5 text-orange-500" /> Git Operations</h3>

                                    <p className="text-slate-300 text-sm leading-relaxed mb-4">
                                        Vantage tracks the Git state of every service folder without needing to open your terminal.
                                    </p>

                                    <ul className="space-y-4">
                                        <li className="flex items-start gap-3 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                                            <div className="mt-0.5 text-cyan-400 font-bold">&#8226;</div>
                                            <div>
                                                <strong className="text-white block mb-0.5">Branch Switching</strong>
                                                <span className="text-sm text-slate-400">Click on the branch name shown in the card to open the quick-switcher modal. You can choose any remote or local branch.</span>
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-3 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                                            <div className="mt-0.5 text-orange-500 font-bold">&#8226;</div>
                                            <div>
                                                <strong className="text-white block mb-0.5">Status Indicators</strong>
                                                <span className="text-sm text-slate-400">A pulsing orange dot means you have uncommitted local changes. Small up/down arrows show if you are ahead or behind the remote branch.</span>
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-3 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                                            <div className="mt-0.5 text-green-500 font-bold">&#8226;</div>
                                            <div>
                                                <strong className="text-white block mb-0.5">Pull Latest</strong>
                                                <span className="text-sm text-slate-400">Click the circular sync arrow to run `git pull` instantly for that service and fetch the latest code.</span>
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-3 bg-orange-500/10 p-4 rounded-xl border border-orange-500/20">
                                            <div className="mt-0.5 text-orange-400 font-bold">&#8226;</div>
                                            <div>
                                                <strong className="text-white block mb-0.5">Identity Profiles</strong>
                                                <span className="text-sm text-slate-400">Use the <Shield className="inline h-3 w-3 mb-0.5" /> <strong>Identity</strong> button to save multiple Git names and emails (e.g., Work vs Personal). These can be applied automatically when cloning.</span>
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-3 bg-purple-500/10 p-4 rounded-xl border border-purple-500/20">
                                            <div className="mt-0.5 text-purple-400 font-bold">&#8226;</div>
                                            <div>
                                                <strong className="text-white block mb-0.5">Repository Cloning</strong>
                                                <span className="text-sm text-slate-400">Use the <Copy className="inline h-3 w-3 mb-0.5" /> <strong>Clone Repo</strong> button to pull new projects into your workbench. Vantage will automatically apply your selected Identity Profile to the repository's local config upon completion.</span>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            )}

                            {activeTab === 'clusters' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <h3 className="text-xl font-bold border-b border-slate-800 pb-2 text-white flex items-center gap-2"><LayoutGrid className="h-5 w-5 text-purple-500" /> Project Clusters</h3>

                                    <p className="text-slate-300 text-sm leading-relaxed mb-4">
                                        When working on a large microservice architecture, you rarely want to start one service at a time. Project Clusters solve this.
                                    </p>

                                    <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 p-6 rounded-2xl border border-indigo-500/20">
                                        <h4 className="font-bold text-white text-lg mb-2">Creating a Cluster</h4>
                                        <p className="text-sm text-slate-300 mb-4">
                                            Click <strong>"New Cluster"</strong> in the main header. Give it a name and select services from the dropdown. 
                                            For each service, you can now <strong>select a specific environment profile</strong> to use when the cluster starts.
                                        </p>

                                        <h4 className="font-bold text-white text-lg mb-2 pt-4 border-t border-indigo-500/20">Workbench Isolation</h4>
                                        <p className="text-sm text-slate-300 mb-4">
                                            Clusters are <strong>isolated by workbench</strong>. A "Payment Stack" created in Workspace A will not appear when you switch to Workspace B.
                                        </p>

                                        <h4 className="font-bold text-white text-lg mb-2 pt-4 border-t border-indigo-500/20">Managing Multiple Services</h4>
                                        <p className="text-sm text-slate-300">
                                            Once created, clicking "Run All" on a cluster card will switch every service to its assigned environment and boot them up in the selected mode (Dev/Prod) simultaneously.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'system' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <h3 className="text-xl font-bold border-b border-slate-800 pb-2 text-white flex items-center gap-2"><Settings className="h-5 w-5 text-cyan-500" /> System & Maintenance</h3>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-slate-800/30 p-5 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-between text-center group hover:border-cyan-500/30 transition-all">
                                            <div>
                                                <div className="h-12 w-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                                    <Download className="h-6 w-6 text-cyan-400" />
                                                </div>
                                                <h4 className="font-bold text-white mb-2">Export Configuration</h4>
                                                <p className="text-[10px] text-slate-400 leading-relaxed px-4">Save all workbenches, clusters, and AI settings to a portable <code className="text-cyan-500">.vantage</code> file.</p>
                                            </div>
                                            <button 
                                                onClick={onExport}
                                                className="mt-6 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-cyan-600 text-white text-[10px] font-black uppercase tracking-widest transition-all border border-slate-700 hover:border-cyan-500 shadow-lg"
                                            >
                                                Generate Backup
                                            </button>
                                        </div>

                                        <div className="bg-slate-800/30 p-5 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-between text-center group hover:border-purple-500/30 transition-all">
                                            <div>
                                                <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                                    <Upload className="h-6 w-6 text-purple-400" />
                                                </div>
                                                <h4 className="font-bold text-white mb-2">Restore Configuration</h4>
                                                <p className="text-[10px] text-slate-400 leading-relaxed px-4">Restore your entire dashboard from a previous backup. This will overwrite local data.</p>
                                            </div>
                                            <button 
                                                onClick={onImport}
                                                className="mt-6 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest transition-all border border-slate-700 hover:border-purple-500 shadow-lg"
                                            >
                                                Restore from File
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-8 mt-4 border-t border-slate-800/60">
                                        <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/20">
                                            <h4 className="font-bold text-red-400 text-sm mb-2 text-center uppercase tracking-widest flex items-center justify-center gap-2">
                                                <RefreshCcw className="h-4 w-4" /> Master Reset
                                            </h4>
                                            <p className="text-[10px] text-slate-400 mb-6 text-center leading-relaxed">
                                                Permanently wipe all data. Use this for a fresh installation.
                                            </p>

                                            <div className="flex justify-center">
                                                <button
                                                    onClick={onReset}
                                                    className="px-6 py-3 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white font-black text-[10px] border border-red-500/30 transition-all uppercase tracking-widest flex items-center gap-2"
                                                >
                                                    <X className="h-4 w-4" />
                                                    Wipe Everything
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
