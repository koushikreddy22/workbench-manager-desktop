import { useEffect, useState } from "react";
import { ServiceCard } from "./components/ServiceCard";
import { GroupCard } from "./components/GroupCard";
import { GroupModal } from "./components/GroupModal";
import { LogModal } from "./components/LogModal";
import { Loader2, RefreshCw, FolderOpen, Settings, Plus, Code } from "lucide-react";

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

    await window.api.controlService({ path, action, port: svc.port, mode });
    fetchData();
  };

  const handleCommand = async (path: string, action: string, payload?: any) => {
    if (action.startsWith('npm-')) {
      await window.api.npmCommand({ action: action.replace('npm-', ''), path });
    } else if (action.startsWith('git-')) {
      await window.api.gitCommand({ action: action.replace('git-', ''), path, branch: payload?.branch });
    }
    setTimeout(fetchData, 1000);
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
    <main className="min-h-screen bg-gray-50/50 p-8 pt-12 dark:bg-neutral-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-12 flex items-center justify-between pb-6 border-b border-gray-200 dark:border-neutral-800">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl mb-2">
              Service <span className="text-indigo-600 dark:text-indigo-400">Dashboard</span>
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-400 font-medium font-mono text-sm max-w-lg truncate" title={workbenchPath}>
              {workbenchPath}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 shadow-sm">
              <Code className="h-4 w-4 text-gray-400" />
              <select
                value={defaultIde}
                onChange={(e) => handleSetIde(e.target.value)}
                className="bg-transparent text-sm font-medium text-gray-600 dark:text-gray-300 outline-none cursor-pointer"
              >
                {availableIdes.length > 0 ? (
                  availableIdes.map(ide => (
                    <option key={ide.id} value={ide.id}>{ide.name}</option>
                  ))
                ) : (
                  <option value="">No IDEs found</option>
                )}
              </select>
            </div>
            <button
              onClick={openCreateGroupModal}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 dark:hover:bg-indigo-500 transition-all"
            >
              <Plus className="h-4 w-4" />
              New Group
            </button>
            <button
              onClick={handleSelectWorkbench}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 border border-gray-200 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-300 dark:hover:bg-neutral-700 transition-all"
            >
              <Settings className="h-4 w-4" />
              Change Workbench
            </button>
            <button
              onClick={handleRefresh}
              className={`flex items-center justify-center rounded-lg bg-white p-2 border border-gray-200 text-gray-600 shadow-sm hover:bg-gray-50 dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-300 dark:hover:bg-neutral-700 transition-all ${isRefreshing ? "opacity-50" : ""}`}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        <div className="space-y-12">
          {groups.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold tracking-tight text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-3">
                <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 py-1 px-3 rounded-md text-sm">
                  {groups.length}
                </span>
                Service Groups
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
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight text-gray-800 dark:text-gray-100 flex items-center gap-3">
                <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 py-1 px-3 rounded-md text-sm">
                  {services.length}
                </span>
                Discovered Services
              </h2>
            </div>

            {isLoading && services.length === 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-200 dark:bg-neutral-800" />
                ))}
              </div>
            ) : services.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center dark:border-neutral-700">
                <p className="text-gray-500 dark:text-gray-400 text-lg">No services found in the current workbench.</p>
                <button onClick={handleSelectWorkbench} className="mt-4 text-indigo-600 hover:underline">Select a different folder</button>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {services.map((service) => (
                  <ServiceCard
                    key={service.path}
                    {...service}
                    onToggle={handleToggleService}
                    onCommand={handleCommand}
                    onOpenIde={handleOpenIde}
                    isIdeLoading={loadingIdePaths.includes(service.path)}
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
    </main>
  );
}

export default App;
