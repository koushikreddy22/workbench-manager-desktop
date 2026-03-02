import { useEffect, useState } from "react";
import { ServiceCard } from "./components/ServiceCard";
import { GroupCard } from "./components/GroupCard";
import { GroupModal } from "./components/GroupModal";
import { LogModal } from "./components/LogModal";
import { BranchModal } from "./components/BranchModal";
import { ServiceSettingsModal } from "./components/ServiceSettingsModal";
import { Loader2, RefreshCw, FolderOpen, Plus, Code, LayoutGrid, List, Search } from "lucide-react";
import logo from "../../../resources/icon.png";

interface Service {
  name: string;
  path: string;
  status: "running" | "stopped" | "error" | "starting";
  mode: "dev" | "prod" | null; // Added mode
  port?: number;
  gitBranch?: string;
  gitStatus?: {
    hasLocalChanges: boolean;
    ahead: number;
    behind: number;
  };
}

interface Group {
  id: string;
  name: string;
  servicePaths: string[];
}

function App() {
  const [workbenchPath, setWorkbenchPath] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [defaultIde, setDefaultIde] = useState<string>("vscode");
  const [availableIdes, setAvailableIdes] = useState<{ id: string, name: string }[]>([]);

  // UI State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<{ name: string, path: string } | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | undefined>(undefined);
  const [loadingIdePaths, setLoadingIdePaths] = useState<string[]>([]);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchModalService, setBranchModalService] = useState<{ name: string, path: string, branch?: string } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Service Settings State
  const [serviceConfigs, setServiceConfigs] = useState<Record<string, any>>({});
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsModalService, setSettingsModalService] = useState<{ name: string, path: string } | null>(null);

  useEffect(() => {
    loadConfig();
    fetchAvailableIdes();
  }, []);

  useEffect(() => {
    let interval: any;
    if (workbenchPath) {
      fetchData();
      interval = setInterval(fetchData, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [workbenchPath]);

  const loadConfig = async () => {
    const config = await window.api.getConfig();
    if (config.workbenchPath) {
      setWorkbenchPath(config.workbenchPath);
    }
    if (config.defaultIde) {
      setDefaultIde(config.defaultIde);
    }
    setIsLoading(false);
  };

  const fetchAvailableIdes = async () => {
    const ides = await window.api.checkIdes();
    setAvailableIdes(ides);
  };

  const handleSelectWorkbench = async () => {
    const p = await window.api.selectWorkbench();
    if (p) {
      setWorkbenchPath(p);
      setIsLoading(true);
    }
  };

  const fetchData = async () => {
    if (!workbenchPath) return;
    try {
      window.api.getGroups().then(groupsData => {
        setGroups(groupsData.groups || []);
      }).catch(console.error);

      // Defensively check if the function exists on window.api so the app doesn't crash if the preload script is stale
      if (typeof window.api.getServiceConfigs === 'function') {
        window.api.getServiceConfigs().then(configsData => {
          setServiceConfigs(configsData.configs || {});
        }).catch(console.error);
      }

      const servicesData = await window.api.getServices(workbenchPath);
      setServices(servicesData.services || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
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
    if (action === 'git-checkout-modal') {
      const svc = services.find((s) => s.path === path);
      if (svc) {
        setBranchModalService({ name: svc.name, path: svc.path, branch: svc.gitBranch });
        setIsBranchModalOpen(true);
      }
      return;
    }

    if (action === 'service-settings') {
      console.log("Setting action triggered for path:", path);
      const svc = services.find((s) => s.path === path);
      console.log("Found service:", svc);
      if (svc) {
        setSettingsModalService({ name: svc.name, path: svc.path });
        setIsSettingsModalOpen(true);
        console.log("Set modal open state to true");
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
    fetchData();
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

    await window.api.saveGroups({ group, action, id });
    // Groups are already updated optimistically and fetchData will run async
    fetchData();
  };

  const handleGroupAction = async (groupId: string, action: "start" | "stop") => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const targetStatus = action === 'start' ? 'starting' : 'stopped';
    setServices(prev => prev.map(s => {
      if (group.servicePaths.includes(s.path)) {
        return { ...s, status: targetStatus };
      }
      return s;
    }));

    await Promise.all(group.servicePaths.map(path => {
      const service = services.find(s => s.path === path);
      return window.api.controlService({ path, action, port: service?.port });
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-neutral-900">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!workbenchPath) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-neutral-900 text-center p-6">
        <div className="w-full max-w-md bg-white dark:bg-neutral-800 rounded-2xl shadow-xl p-10 border border-gray-100 dark:border-neutral-700">
          <FolderOpen className="h-16 w-16 text-indigo-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent mb-4">
            Welcome to Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
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
        <header className="mb-12 flex items-center justify-between pb-8 border-b border-slate-800/60 backdrop-blur-sm">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-900/40 backdrop-blur-md shadow-2xl border border-slate-700/50 p-2.5 flex items-center justify-center transform hover:scale-105 transition-all">
              <img src={logo} alt="Vantage" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(14,165,233,0.4)]" />
            </div>
            <div>
              <h1 className="text-5xl font-black tracking-tight text-white mb-2">
                <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-sky-400 bg-clip-text text-transparent">Vantage</span> Dashboard
              </h1>
              <p className="text-slate-400 font-medium font-mono text-xs max-w-lg truncate px-1 border-l-2 border-cyan-500/50 ml-0.5" title={workbenchPath}>
                {workbenchPath}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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

            <button
              onClick={handleSelectWorkbench}
              className="flex items-center gap-2 rounded-xl bg-slate-800/40 px-5 py-2.5 border border-slate-700/50 text-sm font-bold text-slate-300 shadow-xl hover:bg-slate-700/60 hover:text-white hover:border-slate-500 transition-all active:scale-95"
            >
              <FolderOpen className="h-4 w-4 text-cyan-500" />
              Switch Workspace
            </button>

            <button
              onClick={handleRefresh}
              className={`flex items-center justify-center rounded-xl bg-slate-900/60 p-2.5 border border-slate-700/50 text-slate-400 shadow-xl hover:bg-slate-800 hover:text-cyan-400 transition-all ${isRefreshing ? "opacity-50" : ""} active:scale-95`}
              disabled={isRefreshing}
              title="Rescan Channels"
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>

            <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-700/50 ml-4 shadow-inner backdrop-blur-md">
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
        </header>

        <div className="space-y-12">
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
              <div className={viewMode === 'grid' ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "flex flex-col gap-4"}>
                {services.map((service) => (
                  <ServiceCard
                    key={service.path}
                    {...service}
                    onToggle={handleToggleService}
                    onCommand={handleCommand}
                    onOpenIde={handleOpenIde}
                    isIdeLoading={loadingIdePaths.includes(service.path)}
                    layout={viewMode}
                  />
                ))}
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
    </main>
  );
}

export default App;
