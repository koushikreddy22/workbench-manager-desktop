import { useEffect, useState } from "react";
import { ServiceCard } from "./components/ServiceCard";
import { ServiceRow } from "./components/ServiceRow";
import { GroupCard } from "./components/GroupCard";
import { GroupModal } from "./components/GroupModal";
import { LogModal } from "./components/LogModal";
import { BranchModal } from "./components/BranchModal";
import { ServiceSettingsModal } from "./components/ServiceSettingsModal";
import { GitProfilesModal } from "./components/GitProfilesModal";
import { CloneRepoModal } from "./components/CloneRepoModal";
import { GitPluginsModal } from "./components/GitPluginsModal";
import { ArchivedServicesModal } from "./components/ArchivedServicesModal";
import { HelpModal } from "./components/HelpModal";
import { EnvSettingsModal } from "./components/EnvSettingsModal";
import { Loader2, RefreshCw, FolderOpen, Plus, Code, LayoutGrid, List, Search, HelpCircle, X, Shield, Copy, Link, ChevronDown, Github, Terminal } from "lucide-react";
import logo from "../../../build/icon.png";
import { useRef } from "react";

interface Service {
  name: string;
  path: string;
  status: "running" | "stopped" | "error" | "starting" | "building" | "installing" | "build-error" | "install-error";
  mode: "dev" | "prod" | null; // Added mode
  port?: number;
  gitBranch?: string;
  gitStatus?: {
    hasLocalChanges: boolean;
    ahead: number;
    behind: number;
  };
  activeEnv?: { name: string; color: string } | null;
  envProfiles?: { id: string; name: string; color: string }[];
  activeEnvId?: string | null;
}

interface Group {
  id: string;
  name: string;
  servicePaths: string[]; // Keep for compatibility
  serviceModes?: Record<string, "dev" | "prod">;
  serviceEnvs?: Record<string, string>;
}

interface Workbench {
  id: string;
  name: string;
  path: string;
}

function App() {
  const [workbenches, setWorkbenches] = useState<Workbench[]>([]);
  const [activeWorkbenchId, setActiveWorkbenchId] = useState<string | null>(null);

  const activeWorkbench = workbenches.find(w => w.id === activeWorkbenchId);
  const workbenchPath = activeWorkbench?.path || null;

  const [services, setServices] = useState<Service[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [defaultIde, setDefaultIde] = useState<string>("vscode");
  const [availableIdes, setAvailableIdes] = useState<{ id: string, name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<{ name: string, path: string } | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | undefined>(undefined);
  const [loadingIdePaths, setLoadingIdePaths] = useState<string[]>([]);
  const [envSwitchingPaths, setEnvSwitchingPaths] = useState<string[]>([]);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchModalService, setBranchModalService] = useState<{ name: string, path: string, branch?: string } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [envModalOpen, setEnvModalOpen] = useState<{
    isOpen: boolean;
    servicePath: string;
    serviceName: string;
    initialMode?: 'add' | 'edit';
    discoveredFiles: string[];
  }>({
    isOpen: false,
    servicePath: '',
    serviceName: '',
    discoveredFiles: []
  });

  // Service Settings State
  const [serviceConfigs, setServiceConfigs] = useState<Record<string, any>>({});
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsModalService, setSettingsModalService] = useState<{ name: string, path: string } | null>(null);
  const [isGitProfilesModalOpen, setIsGitProfilesModalOpen] = useState(false);
  const [isCloneRepoModalOpen, setIsCloneRepoModalOpen] = useState(false);
  const [isGitPluginsModalOpen, setIsGitPluginsModalOpen] = useState(false);
  const [isGitMenuOpen, setIsGitMenuOpen] = useState(false);
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false);
  const gitMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConfig();
    fetchAvailableIdes();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (gitMenuRef.current && !gitMenuRef.current.contains(event.target as Node)) {
        setIsGitMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeWorkbenchId && workbenchPath) {
      fetchData(true); // Deep scan on workbench change

      // Refresh data when window returns to focus
      const onFocus = () => {
        // "Light" refresh: uses cache for git status, but deep checks process status
        fetchData(false);
      };

      window.addEventListener('focus', onFocus);
      return () => window.removeEventListener('focus', onFocus);
    }
    return;
  }, [activeWorkbenchId, workbenchPath]);

  const loadConfig = async () => {
    try {
      const config = await window.api.getConfig();
      if (config.workbenches && config.workbenches.length > 0) {
        setWorkbenches(config.workbenches);
        setActiveWorkbenchId(config.activeWorkbenchId);
      } else if (config.workbenchPath) {
        const legacyId = "legacy";
        setWorkbenches([{ id: legacyId, name: "Legacy", path: config.workbenchPath }]);
        setActiveWorkbenchId(legacyId);
      }
      if (config.defaultIde) {
        setDefaultIde(config.defaultIde);
      }
    } catch (err: any) {
      console.error("Failed to load config:", err);
      setError(err.message || "Failed to load application configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableIdes = async () => {
    const ides = await window.api.checkIdes();
    setAvailableIdes(ides);
  };

  const handleSelectWorkbench = async () => {
    const config = await window.api.selectWorkbench();
    if (config && config.workbenches) {
      setWorkbenches(config.workbenches);
      setActiveWorkbenchId(config.activeWorkbenchId);
      setIsLoading(true);
    }
  };

  const handleSwitchWorkbench = async (id: string) => {
    if (id === activeWorkbenchId) return;
    setActiveWorkbenchId(id);
    setIsLoading(true);
    await window.api.updateConfig({ activeWorkbenchId: id });
  };

  const handleRemoveWorkbench = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newWorkbenches = workbenches.filter(w => w.id !== id);
    if (newWorkbenches.length === 0) {
      // Don't allow removing last workbench if needed, or handle empty state
      setWorkbenches([]);
      setActiveWorkbenchId(null);
      await window.api.updateConfig({ workbenches: [], activeWorkbenchId: null });
    } else {
      let nextActiveId = activeWorkbenchId;
      if (id === activeWorkbenchId) {
        nextActiveId = newWorkbenches[0].id;
      }
      setWorkbenches(newWorkbenches);
      setActiveWorkbenchId(nextActiveId);
      await window.api.updateConfig({ workbenches: newWorkbenches, activeWorkbenchId: nextActiveId });
    }
  };

  const handleReorderWorkbenches = async (draggedId: string, targetId: string) => {
    const draggedIdx = workbenches.findIndex(w => w.id === draggedId);
    const targetIdx = workbenches.findIndex(w => w.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;

    const newWorkbenches = [...workbenches];
    const [draggedItem] = newWorkbenches.splice(draggedIdx, 1);
    newWorkbenches.splice(targetIdx, 0, draggedItem);

    setWorkbenches(newWorkbenches);
    await window.api.updateConfig({ workbenches: newWorkbenches });
  };

    const fetchData = async (forceRefresh = false) => {
    if (!workbenchPath) return;
    try {
      window.api.getGroups({ workbenchId: activeWorkbenchId }).then(groupsData => {
        setGroups(groupsData.groups || []);
      }).catch(console.error);

      // Defensively check if the function exists on window.api so the app doesn't crash if the preload script is stale
      if (typeof window.api.getServiceConfigs === 'function') {
        window.api.getServiceConfigs().then(configsData => {
          setServiceConfigs(configsData.configs || {});
        }).catch(console.error);
      }

      const servicesData = await window.api.getServices(workbenchPath, forceRefresh);
      setServices(servicesData.services || []);
      setError(null); // Clear any previous errors on success
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      setError(err.message || "An unexpected error occurred while fetching service data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleToggleService = async (path: string, action: "start" | "stop" | "log", mode: "dev" | "prod" = "dev") => {
    if (action === "log") {
      const svc = services.find((s) => s.path === path);
      if (svc) {
        setSelectedService({ name: svc.name, path: svc.path });
        setIsLogModalOpen(true);
      }
      return;
    }

    const svc = services.find((s) => s.path === path);
    if (!svc) return;

    setServices(prev => prev.map(s => s.path === path ? { ...s, status: action === "start" ? "starting" : "stopped", mode: action === "start" ? mode : null } : s));

    const config = serviceConfigs[path] || {};
    let customCommand = undefined;
    if (action === "start") {
      customCommand = mode === 'prod' ? config.prodCommand : config.devCommand;
    }

    await window.api.controlService({ path, action, port: svc.port, mode, customCommand });
    fetchData();
  };

  const handleCommand = async (path: string, action: string, payload?: any) => {
    if (action === 'custom-command') {
      await window.api.npmCommand({ action: 'custom', path, customCommand: payload.command });
      setTimeout(fetchData, 1000);
      return;
    }

    if (action === 'git-checkout-modal') {
      const svc = services.find((s) => s.path === path);
      if (svc) {
        setBranchModalService({ name: svc.name, path: svc.path, branch: svc.gitBranch });
        setIsBranchModalOpen(true);
      }
      return;
    }

    if (action === 'service-settings') {
      const svc = services.find((s) => s.path === path);
      if (svc) {
        setSettingsModalService({ name: svc.name, path: svc.path });
        setIsSettingsModalOpen(true);
      }
      return;
    }

    if (action === 'open-env-settings' || action === 'env-settings') {
      const svc = services.find((s) => s.path === path);
      if (svc) {
        // Fetch env data to get discovered files immediately
        window.api.getEnv({ path }).then(res => {
          setEnvModalOpen({
            isOpen: true,
            servicePath: svc.path,
            serviceName: svc.name,
            initialMode: (payload?.initialMode === 'add' || payload?.mode === 'add') ? 'add' : 'edit',
            discoveredFiles: res.discoveredFiles || []
          });
        }).catch(err => {
          console.error("Failed to fetch discovered files", err);
          setEnvModalOpen({
            isOpen: true,
            servicePath: svc.path,
            serviceName: svc.name,
            initialMode: (payload?.initialMode === 'add' || payload?.mode === 'add') ? 'add' : 'edit',
            discoveredFiles: []
          });
        });
      }
      return;
    }

    if (action === 'switch-env') {
      setEnvSwitchingPaths(prev => [...prev, path]);
      try {
        await window.api.switchEnv({ path, profileId: payload.profileId });
        await fetchData();
      } finally {
        setEnvSwitchingPaths(prev => prev.filter(p => p !== path));
      }
      return;
    }

    if (action === 'archive') {
      const svc = services.find((s) => s.path === path);
      if (svc && workbenchPath) {
        await window.api.archiveService({ workbenchPath, serviceName: svc.name });
        fetchData();
      }
      return;
    }

    if (action.startsWith('npm-')) {
      const cmdAction = action.replace('npm-', '');
      const config = serviceConfigs[path] || {};
      let customCommand = undefined;

      if (cmdAction === 'build') customCommand = config.buildCommand;
      else if (cmdAction === 'install' || cmdAction === 'install-legacy') customCommand = config.installCommand;

      await window.api.npmCommand({ action: cmdAction, path, customCommand });
    } else if (action.startsWith('git-')) {
      await window.api.gitCommand({ action: action.replace('git-', ''), path, branch: payload?.branch });
    }

    setTimeout(fetchData, 1000);
  };

  const handleAddService = async () => {
    if (!workbenchPath) return;
    try {
      const res = await window.api.addService({ workbenchPath });
      if (res.success) {
        fetchData();
      }
    } catch (err: any) {
      console.error("Failed to add service:", err);
      alert(err.message || "Failed to add service.");
    }
  };

  const handleCheckoutBranch = async (path: string, branch: string) => {
    await window.api.gitCommand({ action: 'checkout', path, branch });
    fetchData(); // refresh services
  };

  const handleSaveServiceConfig = async (path: string, config: any) => {
    if (typeof window.api.saveServiceConfig === 'function') {
      await window.api.saveServiceConfig({ servicePath: path, config });
    }
    setServiceConfigs(prev => ({ ...prev, [path]: config }));
  };

  const handleOpenIde = async (path: string) => {
    setLoadingIdePaths(prev => [...prev, path]);
    try {
      await window.api.openIde({ path, ide: defaultIde });
    } finally {
      // Small timeout to ensure the user sees the spinner for at least a bit
      setTimeout(() => {
        setLoadingIdePaths(prev => prev.filter(p => p !== path));
      }, 1000);
    }
  };

  const handleSetIde = async (ide: string) => {
    setDefaultIde(ide);
    await window.api.updateConfig({ defaultIde: ide });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData(true); // Manual refresh triggers deep scan
  };

  const handleSaveGroup = async (group: Group, action: 'create' | 'delete', id?: string) => {
    if (action === 'create') {
      setGroups(prev => {
        const idx = prev.findIndex(g => g.id === group.id);
        if (idx >= 0) {
          const newGroups = [...prev];
          newGroups[idx] = group;
          return newGroups;
        }
        return [...prev, group];
      });
    } else if (action === 'delete') {
      setGroups(prev => prev.filter(g => g.id !== id));
    }

    await window.api.saveGroups({ workbenchId: activeWorkbenchId, group, action, id });
    // Groups are already updated optimistically and fetchData will run async
    fetchData();
  };

  const handleGroupAction = async (groupId: string, action: "start" | "stop") => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const targetStatus = action === 'start' ? 'starting' : 'stopped';

    setServices(prev => prev.map(s => {
      if (group.servicePaths.includes(s.path)) {
        const activeMode = group.serviceModes?.[s.path] || "dev";
        return { ...s, status: targetStatus, mode: action === 'start' ? activeMode : null };
      }
      return s;
    }));

    await Promise.all(group.servicePaths.map(async path => {
      const service = services.find(s => s.path === path);
      const activeMode = group.serviceModes?.[path] || "dev";
      const envId = group.serviceEnvs?.[path];

      if (action === 'start' && envId) {
        try {
          await window.api.switchEnv({ path, profileId: envId });
        } catch (err) {
          console.error(`Failed to switch environment for ${path}:`, err);
        }
      }

      const config = serviceConfigs[path] || {};
      const customCommand = action === 'start' ? (activeMode === 'prod' ? config.prodCommand : config.devCommand) : undefined;

      return window.api.controlService({
        path,
        action,
        port: service?.port,
        mode: activeMode,
        customCommand
      });
    }));

    fetchData();
  };

  const openCreateGroupModal = () => {
    setEditingGroup(undefined);
    setIsGroupModalOpen(true);
  };

  const openEditGroupModal = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setEditingGroup(group);
      setIsGroupModalOpen(true);
    }
  };

  if (isLoading && !workbenchPath) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
          <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.15)]">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
          <p className="text-slate-400 font-bold tracking-widest uppercase text-xs animate-pulse">Initializing Vantage...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-center p-6">
        <div className="h-20 w-20 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
          <Terminal className="h-10 w-10 text-red-400" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">System <span className="text-red-500">Error</span></h1>
        <p className="text-slate-400 max-w-md mx-auto mb-8 font-medium">Vantage encountered a critical issue while initializing the workspace. Check your logs for more details.</p>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/60 max-w-lg w-full mb-8 text-left font-mono">
          <p className="text-red-400 text-sm whitespace-pre-wrap">{error}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all shadow-xl hover:shadow-slate-900/40 border border-slate-700"
        >
          Attempt Re-initialization
        </button>
      </div>
    );
  }

  if (!workbenchPath) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-center p-6">
        <div className="w-full max-w-md bg-slate-900 rounded-2xl shadow-xl p-10 border border-slate-800">
          <FolderOpen className="h-16 w-16 text-indigo-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent mb-4">
            Welcome to Dashboard
          </h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            To get started, please select your workbench directory containing your service projects.
          </p>
          <button
            onClick={handleSelectWorkbench}
            className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            Select Workbench Folder
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0F19] p-8 pt-12 text-slate-200 relative overflow-x-hidden bg-vantage-mesh">
      <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden opacity-[0.08] dark:opacity-[0.12]">
        <img src={logo} alt="" className="w-2/3 min-w-[800px] h-auto object-contain blur-[2px] transition-all duration-1000" />
      </div>
      <div className="mx-auto max-w-7xl relative z-10 transition-all">
        <header className="px-[20px] fixed top-0 left-0 w-full mb-12 flex flex-col lg:flex-row items-center justify-between gap-6 pb-6 pt-4 border-b border-slate-800/60 backdrop-blur-md z-50 bg-[#0B0F19]/95 text-center lg:text-left transition-all">          <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-slate-900/40 backdrop-blur-md shadow-2xl border border-slate-700/50 p-2.5 flex items-center justify-center transform hover:scale-105 transition-all">
            <img src={logo} alt="Vantage" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(14,165,233,0.4)]" />
          </div>
          <div>
            <h1 className="text-5xl font-black tracking-tight text-white mb-2">
              <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-sky-400 bg-clip-text text-transparent">Vantage</span> Dashboard
            </h1>

            {/* Workbench Tabs */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {workbenches.map(wb => (
                <div
                  key={wb.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("workbenchId", wb.id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const draggedId = e.dataTransfer.getData("workbenchId");
                    if (draggedId && draggedId !== wb.id) {
                      handleReorderWorkbenches(draggedId, wb.id);
                    }
                  }}
                  className={`flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-move ${wb.id === activeWorkbenchId ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'bg-slate-800/40 text-slate-400 overflow-hidden border border-slate-700/50 hover:bg-slate-700 hover:text-white'}`}
                >
                  <button
                    onClick={() => handleSwitchWorkbench(wb.id)}
                    title={wb.path}
                    className="flex-1 text-left whitespace-nowrap overflow-hidden"
                  >
                    {wb.name}
                  </button>
                  <button
                    onClick={(e) => handleRemoveWorkbench(e, wb.id)}
                    className="p-0.5 hover:text-red-400 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={handleSelectWorkbench}
                title="Add Workspace"
                className="px-3 py-1 bg-slate-800/40 border border-slate-700/50 rounded-lg text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-all flex items-center gap-2 text-[10px] font-bold"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Workbench</span>
              </button>
            </div>

          </div>
        </div>

          <div className="flex flex-wrap items-center justify-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-2.5 shadow-inner backdrop-blur-md group hover:border-cyan-500/30 transition-all">
              <Code className="h-4 w-4 text-slate-500 group-hover:text-cyan-400" />
              <select
                value={defaultIde}
                onChange={(e) => handleSetIde(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-300 outline-none cursor-pointer appearance-none pr-1 focus:text-cyan-400 transition-colors"
                title="Target IDE"
              >
                {availableIdes.length > 0 ? (
                  availableIdes.map(ide => (
                    <option key={ide.id} value={ide.id} className="bg-slate-900 text-white font-sans">{ide.name}</option>
                  ))
                ) : (
                  <option value="" className="bg-slate-900">No IDEs</option>
                )}
              </select>
            </div>

            <button
              onClick={openCreateGroupModal}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-5 py-2.5 text-sm font-black text-white shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:from-indigo-500 hover:to-cyan-500 hover:scale-[1.02] transition-all active:scale-95"
            >
              <Plus className="h-4 w-4 stroke-[3px]" />
              New Cluster
            </button>

            {/* Hexagonal Menu - Git Section */}
            <div className="relative" ref={gitMenuRef}>
              <button
                onClick={() => setIsGitMenuOpen(!isGitMenuOpen)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all font-black text-sm shadow-lg group ${isGitMenuOpen ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20' : 'bg-slate-900/60 text-slate-300 border-slate-700/50 hover:border-indigo-500/50 hover:text-white'}`}
              >
                <Github className={`h-4 w-4 transition-transform duration-300 ${isGitMenuOpen ? 'rotate-12' : 'group-hover:rotate-12'}`} />
                <span>Git</span>
                <ChevronDown className={`h-4 w-4 opacity-50 transition-transform duration-300 ${isGitMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isGitMenuOpen && (
                <div className="absolute top-full right-0 mt-3 w-56 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[60]">
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => {
                        setIsCloneRepoModalOpen(true);
                        setIsGitMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-purple-500/10 text-slate-300 hover:text-purple-400 transition-all group/item text-left"
                    >
                      <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover/item:border-purple-500/40">
                        <Copy className="h-4 w-4 text-purple-400" />
                      </div>
                      <div>
                        <div className="text-sm font-bold">Clone Repository</div>
                        <div className="text-[10px] text-slate-500">Checkout from remote</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setIsGitProfilesModalOpen(true);
                        setIsGitMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-orange-500/10 text-slate-300 hover:text-orange-400 transition-all group/item text-left"
                    >
                      <div className="h-8 w-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center group-hover/item:border-orange-500/40">
                        <Shield className="h-4 w-4 text-orange-400" />
                      </div>
                      <div>
                        <div className="text-sm font-bold">Identity Profiles</div>
                        <div className="text-[10px] text-slate-500">Manage personas</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setIsGitPluginsModalOpen(true);
                        setIsGitMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-cyan-500/10 text-slate-300 hover:text-cyan-400 transition-all group/item text-left"
                    >
                      <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center group-hover/item:border-cyan-500/40">
                        <Link className="h-4 w-4 text-cyan-400" />
                      </div>
                      <div>
                        <div className="text-sm font-bold">Git Plugins</div>
                        <div className="text-[10px] text-slate-500">GitHub & Oracle VBS</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 
              We removed the old "Switch Workspace" button from here since we use the
              compact tabs above the title. 
            */}

            <button
              onClick={handleRefresh}
              className={`flex items-center justify-center rounded-xl bg-slate-900/60 p-2.5 border border-slate-700/50 text-slate-400 shadow-xl hover:bg-slate-800 hover:text-cyan-400 transition-all ${isRefreshing ? "opacity-50" : ""} active:scale-95`}
              disabled={isRefreshing}
              title="Rescan Channels"
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={() => setIsHelpModalOpen(true)}
              className="flex items-center justify-center rounded-xl bg-slate-900/60 p-2.5 border border-slate-700/50 text-slate-400 shadow-xl hover:bg-slate-800 hover:text-cyan-400 transition-all active:scale-95 ml-2"
              title="Help & Documentation"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="space-y-12 mt-30">
          {groups.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold tracking-tight text-white mb-8 flex items-center gap-4">
                <span className="bg-gradient-to-br from-indigo-500 to-cyan-500 text-white py-1.5 px-4 rounded-xl text-sm shadow-lg shadow-indigo-500/20">
                  {groups.length}
                </span>
                Project Clusters
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {groups.map(group => (
                  <GroupCard
                    key={group.id}
                    id={group.id}
                    name={group.name}
                    serviceCount={group.servicePaths.length}
                    modes={group.serviceModes}
                    onRun={(id) => handleGroupAction(id, 'start')}
                    onStop={(id) => handleGroupAction(id, 'stop')}
                    onEdit={openEditGroupModal}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-4">
                <span className="bg-gradient-to-br from-cyan-500 to-sky-500 text-white py-1.5 px-4 rounded-xl text-sm shadow-lg shadow-cyan-500/20">
                  {services.length}
                </span>
                Active Channels
              </h2>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleAddService}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all font-bold text-xs shadow-inner"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Channel
                </button>

                <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-700/50 shadow-inner backdrop-blur-md items-center">
                  <button
                    onClick={() => setIsArchivedModalOpen(true)}
                    className="p-2 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-slate-800/40 transition-all"
                    title="Archived Services"
                  >
                    <FolderOpen className="h-4 w-4" />
                  </button>
                  <div className="w-px h-4 bg-slate-800 mx-1"></div>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)] border border-cyan-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'}`}
                    title="Grid View"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)] border border-cyan-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'}`}
                    title="List View"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {isLoading && services.length === 0 ? (
              <div className={viewMode === 'grid' ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "flex flex-col gap-4"}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`animate-pulse rounded-xl bg-gray-200 dark:bg-neutral-800 ${viewMode === 'grid' ? 'h-48' : 'h-24'}`} />
                ))}
              </div>
            ) : services.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-slate-800 p-20 text-center bg-slate-900/20 backdrop-blur-sm shadow-inner group hover:border-cyan-500/30 transition-all">
                <div className="mx-auto w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-6 border border-slate-700/50 group-hover:bg-cyan-500/10 group-hover:border-cyan-500/20 transition-all">
                  <Search className="h-10 w-10 text-slate-500 group-hover:text-cyan-400 transition-all" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Active Channels Found</h3>
                <p className="text-slate-500 max-w-sm mx-auto mb-8">This workspace doesn't seem to contain any services. Select a different entry point to begin monitoring.</p>
                <button
                  onClick={handleSelectWorkbench}
                  className="px-6 py-3 rounded-xl bg-cyan-500 text-slate-950 font-black text-sm hover:bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all active:scale-95"
                >
                  Change Workspace
                </button>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "flex flex-col gap-2"}>
                {viewMode === 'list' && (
                  <div className="flex items-center gap-4 px-6 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800/50 mb-2">
                    <div className="flex-1">Service Name</div>
                    <div className="w-20 text-center">Port</div>
                    <div className="w-[180px] text-left">Git Context</div>
                    <div className="w-[140px] text-left">Control</div>
                    <div className="w-[260px] text-right pr-6">Actions</div>
                  </div>
                )}
                {services.map((service) => {
                  const config = serviceConfigs[service.path] || {};
                  return viewMode === 'grid' ? (
                    <ServiceCard
                      key={service.path}
                      {...service}
                      customButtons={config.customButtons}
                      onToggle={handleToggleService}
                      onCommand={handleCommand}
                      onOpenIde={handleOpenIde}
                      isIdeLoading={loadingIdePaths.includes(service.path)}
                      isEnvSwitching={envSwitchingPaths.includes(service.path)}
                    />
                  ) : (
                    <ServiceRow
                      key={service.path}
                      {...service}
                      envProfiles={service.envProfiles}
                      activeEnvId={service.activeEnvId}
                      customButtons={config.customButtons}
                      onToggle={handleToggleService}
                      onCommand={handleCommand}
                      onOpenIde={handleOpenIde}
                      isIdeLoading={loadingIdePaths.includes(service.path)}
                      isEnvSwitching={envSwitchingPaths.includes(service.path)}
                    />
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      <GroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onSave={handleSaveGroup}
        initialGroup={editingGroup}
        availableServices={services}
      />

      <LogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        serviceName={selectedService?.name || ""}
        servicePath={selectedService?.path || ""}
      />

      <BranchModal
        isOpen={isBranchModalOpen}
        onClose={() => setIsBranchModalOpen(false)}
        onCheckout={handleCheckoutBranch}
        servicePath={branchModalService?.path}
        serviceName={branchModalService?.name}
        currentBranch={branchModalService?.branch}
      />

      {settingsModalService && (
        <ServiceSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          servicePath={settingsModalService.path}
          serviceName={settingsModalService.name}
          initialConfig={serviceConfigs[settingsModalService.path]}
          onSave={handleSaveServiceConfig}
        />
      )}

      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        onReset={() => window.api.resetApp()}
      />

      <ArchivedServicesModal
        isOpen={isArchivedModalOpen}
        onClose={() => setIsArchivedModalOpen(false)}
        workbenchPath={workbenchPath || ""}
        onRestore={() => fetchData()}
      />

      <EnvSettingsModal
        isOpen={envModalOpen.isOpen}
        onClose={() => setEnvModalOpen(prev => ({ ...prev, isOpen: false }))}
        servicePath={envModalOpen.servicePath}
        serviceName={envModalOpen.serviceName}
        initialMode={envModalOpen.initialMode}
        onSaved={() => {
          if (activeWorkbenchId && workbenchPath) {
            fetchData();
          }
        }}
        discoveredFiles={envModalOpen.discoveredFiles}
      />

      <GitProfilesModal
        isOpen={isGitProfilesModalOpen}
        onClose={() => setIsGitProfilesModalOpen(false)}
      />

      <GitPluginsModal
        isOpen={isGitPluginsModalOpen}
        onClose={() => setIsGitPluginsModalOpen(false)}
      />

      <CloneRepoModal
        isOpen={isCloneRepoModalOpen}
        onClose={() => setIsCloneRepoModalOpen(false)}
        workbenchPath={workbenchPath || ""}
        onCloneSuccess={() => {
          setIsRefreshing(true);
          fetchData(true);
        }}
      />
    </main>
  );
}

export default App;
