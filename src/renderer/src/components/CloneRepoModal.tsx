import { useState, useEffect } from "react";
import { X, Globe, Folder, Shield, Copy, AlertCircle, Loader2, Terminal, Search, Link } from "lucide-react";

interface GitProfile {
    id: string;
    name: string;
    email: string;
    description: string;
}

interface CloneRepoModalProps {
    isOpen: boolean;
    onClose: () => void;
    workbenchPath: string;
    onCloneSuccess: () => void;
}

export function CloneRepoModal({ isOpen, onClose, workbenchPath, onCloneSuccess }: CloneRepoModalProps) {
    const [url, setUrl] = useState("");
    const [folderName, setFolderName] = useState("");
    const [profiles, setProfiles] = useState<GitProfile[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<string>("");
    const [isCloning, setIsCloning] = useState(false);
    const [progress, setProgress] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Repository Browser States
    const [connections, setConnections] = useState<any[]>([]);
    const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
    const [remoteRepos, setRemoteRepos] = useState<any[]>([]);
    const [isLoadingRepos, setIsLoadingRepos] = useState(false);
    const [repoSearch, setRepoSearch] = useState("");

    useEffect(() => {
        if (isOpen) {
            loadProfiles();
            loadConnections();
            // Reset state
            setUrl("");
            setFolderName("");
            setProgress([]);
            setError(null);
            setIsCloning(false);
            setRepoSearch("");
        }
    }, [isOpen]);

    const loadConnections = async () => {
        const data = await window.api.gitPluginGetConnections();
        setConnections(data || []);
        if (data && data.length > 0) {
            setSelectedConnectionId(data[0].id);
        }
    };

    useEffect(() => {
        if (selectedConnectionId) {
            fetchRemoteRepos();
        }
    }, [selectedConnectionId]);

    const fetchRemoteRepos = async () => {
        setIsLoadingRepos(true);
        try {
            const result = await window.api.gitPluginListRepos({ connectionId: selectedConnectionId });
            if (result.success) {
                setRemoteRepos(result.repos || []);
            }
        } catch (e) { }
        setIsLoadingRepos(false);
    };

    const handleSelectRemoteRepo = (repo: any) => {
        handleUrlChange(repo.url);
        setFolderName(repo.name);
    };

    const loadProfiles = async () => {
        const data = await window.api.getGitProfiles();
        const savedProfiles = data.profiles || [];
        setProfiles(savedProfiles);
        if (savedProfiles.length > 0) {
            setSelectedProfileId(savedProfiles[0].id);
        }
    };

    const handleUrlChange = (newUrl: string) => {
        setUrl(newUrl);
        // Try to extract folder name from URL
        try {
            const parts = newUrl.split('/');
            const lastPart = parts[parts.length - 1];
            if (lastPart) {
                setFolderName(lastPart.replace('.git', ''));
            }
        } catch (e) { }
    };

    const handleClone = async () => {
        if (!url || !folderName) {
            setError("Repository URL and Folder Name are required");
            return;
        }

        setIsCloning(true);
        setError(null);
        setProgress(["Starting git clone..."]);

        const selectedProfile = profiles.find(p => p.id === selectedProfileId);
        const targetPath = `${workbenchPath}/${folderName}`;

        const removeListener = window.api.onGitCloneProgress((message) => {
            setProgress(prev => [...prev.slice(-10), message]);
        });

        try {
            const result = await window.api.gitClone({ 
                url, 
                targetPath, 
                profile: selectedProfile 
            });

            if (result.success) {
                setProgress(prev => [...prev, "Clone successful! Identity applied."]);
                setTimeout(() => {
                    onCloneSuccess();
                    onClose();
                }, 1500);
            } else {
                setError(result.error || "Clone failed. Check the URL and your connection.");
                setIsCloning(false);
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
            setIsCloning(false);
        } finally {
            removeListener();
        }
    };

    if (!isOpen) return null;

    const filteredRepos = remoteRepos.filter(r => 
        r.name.toLowerCase().includes(repoSearch.toLowerCase()) || 
        r.fullName.toLowerCase().includes(repoSearch.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                            <Copy className="h-6 w-6 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Clone <span className="text-purple-400">Repository</span></h2>
                            <p className="text-slate-400 text-sm font-medium">Add a new project to your workbench</p>
                        </div>
                    </div>
                    {!isCloning && (
                        <button
                            onClick={onClose}
                            className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all border border-transparent hover:border-slate-700"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-hidden flex divide-x divide-slate-800">
                    {/* Left Side: Repo Browser */}
                    <div className="w-72 flex flex-col bg-slate-950/30">
                        <div className="p-4 border-b border-slate-800 space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Connect Plugin</label>
                                <select 
                                    value={selectedConnectionId}
                                    onChange={(e) => setSelectedConnectionId(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-purple-500 transition-all"
                                >
                                    <option value="">Select Account</option>
                                    {connections.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.providerId})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                                <input 
                                    type="text"
                                    placeholder="Search repos..."
                                    value={repoSearch}
                                    onChange={(e) => setRepoSearch(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-200 outline-none focus:border-purple-500 transition-all"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
                            {isLoadingRepos ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <Loader2 className="h-6 w-6 text-purple-500 animate-spin" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Loading Repos...</span>
                                </div>
                            ) : filteredRepos.length === 0 ? (
                                <div className="text-center py-12 px-4">
                                    <Globe className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">No Repos Found</p>
                                </div>
                            ) : (
                                filteredRepos.map(repo => (
                                    <button
                                        key={repo.fullName}
                                        onClick={() => handleSelectRemoteRepo(repo)}
                                        className={`w-full text-left p-2.5 rounded-lg transition-all group ${url === repo.url ? 'bg-purple-500/10 border border-purple-500/30 shadow-lg' : 'hover:bg-slate-800/50 border border-transparent'}`}
                                    >
                                        <div className="font-bold text-xs text-slate-200 truncate group-hover:text-white transition-colors">
                                            {repo.name}
                                        </div>
                                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                            {repo.fullName}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Side: Clone Config */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* URL Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase px-1 flex items-center gap-2">
                                <Globe className="h-3 w-3" /> Repository Git URL
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    disabled={isCloning}
                                    value={url}
                                    onChange={e => handleUrlChange(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-sm focus:border-purple-500 outline-none transition-all placeholder:text-slate-600"
                                    placeholder="https://github.com/username/repo.git or git@github.com:..."
                                />
                                <Link className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                            </div>
                        </div>

                        {/* Folder & Profile Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase px-1 flex items-center gap-2">
                                    <Folder className="h-3 w-3" /> Folder Name
                                </label>
                                <input
                                    type="text"
                                    disabled={isCloning}
                                    value={folderName}
                                    onChange={e => setFolderName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-sm focus:border-purple-500 outline-none transition-all"
                                    placeholder="my-awesome-service"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase px-1 flex items-center gap-2">
                                    <Shield className="h-3 w-3" /> Identity Profile
                                </label>
                                <select
                                    disabled={isCloning}
                                    value={selectedProfileId}
                                    onChange={e => setSelectedProfileId(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-sm focus:border-purple-500 outline-none transition-all appearance-none text-slate-200"
                                >
                                    <option value="">None (Global Config)</option>
                                    {profiles.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Progress / Terminal Style */}
                        {isCloning && (
                            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                <label className="text-xs font-bold text-slate-400 uppercase px-1 flex items-center gap-2">
                                    <Terminal className="h-3 w-3" /> Cloning Progress
                                </label>
                                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] h-32 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
                                    {progress.map((line, i) => (
                                        <div key={i} className="text-slate-400 break-all">{line}</div>
                                    ))}
                                    <div className="flex items-center gap-2 text-purple-400">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>Processing repository...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-3 text-red-400 text-xs font-bold bg-red-400/5 p-4 rounded-xl border border-red-400/20">
                                <AlertCircle className="h-5 w-5 shrink-0" /> {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
                    {!isCloning ? (
                        <>
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 rounded-xl text-slate-400 hover:text-white transition-all font-bold text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleClone}
                                className="px-8 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm shadow-xl shadow-purple-600/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                            >
                                <Copy className="h-4 w-4" /> Start Clone
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-3 text-slate-500 text-sm font-bold pr-4">
                            <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                            Please wait while we set up your repository...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
