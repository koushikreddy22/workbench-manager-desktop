import { useState, useEffect } from "react";
import { X, Search, RotateCcw, Trash2, Archive, Loader2, AlertCircle, Check } from "lucide-react";
import { cn } from "../lib/utils";

interface ArchivedService {
  name: string;
  archivedAt: string;
  path: string;
}

interface ArchivedServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  workbenchPath: string;
  onRestore: () => void;
}

export function ArchivedServicesModal({ isOpen, onClose, workbenchPath, onRestore }: ArchivedServicesModalProps) {
  const [services, setServices] = useState<ArchivedService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && workbenchPath) {
      fetchArchivedServices();
    }
  }, [isOpen, workbenchPath]);

  const fetchArchivedServices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await window.api.getArchivedServices(workbenchPath);
      setServices(res.services || []);
    } catch (err) {
      console.error("Failed to fetch archived services:", err);
      setError("Failed to load archived services.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (serviceName: string) => {
    setActionLoading(`restore-${serviceName}`);
    setError(null);
    setSuccess(null);
    try {
      await window.api.restoreService({ workbenchPath, serviceName });
      setSuccess(`Successfully restored ${serviceName}`);
      onRestore();
      fetchArchivedServices();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Failed to restore service:", err);
      setError(err.message || "Failed to restore service.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (serviceName: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${serviceName}"? This action cannot be undone.`)) return;

    setActionLoading(`delete-${serviceName}`);
    setError(null);
    try {
      await window.api.deleteArchivedService({ workbenchPath, serviceName });
      fetchArchivedServices();
    } catch (err) {
      console.error("Failed to delete service:", err);
      setError("Failed to delete archived service.");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0B0F19] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
              <Archive className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Archived Channels</h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Restore or manage offline work</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-8 py-4 bg-slate-900/20 border-b border-slate-800/50">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
            <input
              type="text"
              placeholder="Search archived services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-bold"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-vantage-mesh">
          {error && (
            <div className="mb-4 mx-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm animate-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="font-bold">{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 mx-4 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3 text-green-400 text-sm animate-in slide-in-from-top-2">
              <Check className="h-5 w-5 shrink-0" />
              <span className="font-bold">{success}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-10 w-10 text-cyan-500 animate-spin" />
              <p className="text-sm font-black text-slate-500 tracking-widest uppercase">Fetching Archives...</p>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <div className="w-20 h-20 rounded-3xl bg-slate-800/30 flex items-center justify-center mb-6 border border-slate-700/30">
                <Archive className="h-10 w-10 text-slate-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-300 mb-2">
                {searchQuery ? "No matching archives" : "Vault is Empty"}
              </h3>
              <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                {searchQuery 
                  ? "We couldn't find any archived services matching your search." 
                  : "All your services are currently active. Archived channels will appear here."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredServices.map((service) => (
                <div 
                  key={service.name}
                  className="group flex items-center justify-between p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 hover:border-slate-700/60 hover:bg-slate-800/40 transition-all"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="p-2.5 rounded-xl bg-slate-800 group-hover:bg-slate-700 transition-colors shadow-inner">
                      <Archive className="h-5 w-5 text-slate-400 group-hover:text-amber-400 transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-white truncate pr-2 group-hover:text-cyan-400 transition-colors" title={service.name}>
                        {service.name}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-tighter mt-0.5">
                        Archived {new Date(service.archivedAt).toLocaleDateString()} at {new Date(service.archivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRestore(service.name)}
                      disabled={actionLoading !== null}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 text-[11px] font-black transition-all border border-cyan-500/20 disabled:opacity-50"
                      title="Restore to Dashboard"
                    >
                      {actionLoading === `restore-${service.name}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      RESTORE
                    </button>
                    <button
                      onClick={() => handleDelete(service.name)}
                      disabled={actionLoading !== null}
                      className="p-2 rounded-xl bg-slate-800/80 text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-slate-700/50 hover:border-red-500/30 transition-all group/delete"
                      title="Delete Permanently"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {filteredServices.length} {filteredServices.length === 1 ? 'Service' : 'Services'} Available
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-all border border-slate-700"
          >
            Close Vault
          </button>
        </div>
      </div>
    </div>
  );
}
