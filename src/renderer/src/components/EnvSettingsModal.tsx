import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Save, Trash2, CheckCircle2 } from 'lucide-react';

interface EnvProfile {
  id: string;
  name: string;
  color: string;
  variables: Record<string, string>;
  envPath?: string;
}

interface EnvData {
  active: string | null;
  profiles: EnvProfile[];
}

interface EnvSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  servicePath: string;
  serviceName: string;
  onSaved: () => void;
  initialMode?: 'add' | 'edit';
  discoveredFiles: string[];
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#64748b', // slate
];

const getRelativePath = (servicePath: string, filePath: string) => {
  if (filePath.startsWith(servicePath)) {
    return filePath.substring(servicePath.length).replace(/^[\\\/]/, '');
  }
  return filePath;
};

export function EnvSettingsModal({ isOpen, onClose, servicePath, serviceName, onSaved, initialMode, discoveredFiles }: EnvSettingsModalProps) {
  const [data, setData] = useState<EnvData>({ active: null, profiles: [] });
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // New Profile State
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileColor, setNewProfileColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    if (isOpen) {
      loadEnvData();
    } else {
      // reset state on close
      setSearchQuery('');
      setIsCreatingProfile(false);
      setNewProfileName('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && initialMode === 'add') {
      setIsCreatingProfile(true);
    }
  }, [isOpen, initialMode]);

  const loadEnvData = async () => {
    setIsLoading(true);
    try {
      const res = await window.api.getEnv({ path: servicePath });
      setData(res.data);
      setActiveProfileId(res.data.active);
    } catch (e) {
      console.error("Failed to load environments", e);
    }
    setIsLoading(false);
  };

  const activeProfile = data.profiles.find(p => p.id === activeProfileId) || null;

  const handleCreateProfile = () => {
    if (!newProfileName.trim()) return;
    
    // Copy variables from active profile if exists, else empty
    const variables = activeProfile ? { ...activeProfile.variables } : {};
    
    const newProfile: EnvProfile = {
      id: crypto.randomUUID(),
      name: newProfileName.trim(),
      color: newProfileColor,
      variables
    };

    const newData = {
      ...data,
      profiles: [...data.profiles, newProfile],
    };
    
    if (!newData.active) {
      newData.active = newProfile.id;
    }
    
    setData(newData);
    setActiveProfileId(newProfile.id);
    setIsCreatingProfile(false);
    setNewProfileName('');
  };

  const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this environment profile?")) return;
    
    const newProfiles = data.profiles.filter(p => p.id !== id);
    let newActive = data.active;
    if (newActive === id) {
       newActive = newProfiles.length > 0 ? newProfiles[0].id : null;
    }
    
    setData({
      ...data,
      profiles: newProfiles,
      active: newActive
    });
    if (activeProfileId === id) setActiveProfileId(newActive);
  };

  const handleProfileEnvPathChange = (profileId: string, envPath: string) => {
    setData(prev => ({
      ...prev,
      profiles: prev.profiles.map(p => {
        if (p.id === profileId) {
          return { ...p, envPath };
        }
        return p;
      })
    }));
  };

  const deleteVariable = (keyToDelete: string) => {
    if (!activeProfileId) return;
    setData(prev => ({
      ...prev,
      profiles: prev.profiles.map(p => {
        if (p.id === activeProfileId) {
          const newVars = { ...p.variables };
          delete newVars[keyToDelete];
          return { ...p, variables: newVars };
        }
        return p;
      })
    }));
  };

  const updateVariable = (key: string, value: string) => {
    if (!activeProfileId) return;
    
    setData(prev => ({
      ...prev,
      profiles: prev.profiles.map(p => {
        if (p.id === activeProfileId) {
          return {
            ...p,
            variables: { ...p.variables, [key]: value }
          };
        }
        return p;
      })
    }));
  };

  const addNewVariable = () => {
    if (!activeProfileId) return;
    const keyName = `NEW_VAR_${Date.now()}`;
    updateVariable(keyName, "value");
  };

  // Allow renaming the key itself
  const renameVariableKey = (oldKey: string, newKey: string) => {
    if (!activeProfileId || oldKey === newKey || !newKey.trim()) return;
    
    setData(prev => ({
      ...prev,
      profiles: prev.profiles.map(p => {
        if (p.id === activeProfileId) {
          const newVars = { ...p.variables };
          newVars[newKey] = newVars[oldKey];
          delete newVars[oldKey];
          return { ...p, variables: newVars };
        }
        return p;
      })
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Commit the chosen active profile to data
      const finalData = { ...data, active: activeProfileId };
      await window.api.saveEnv({ path: servicePath, data: finalData });
      onSaved();
      onClose();
    } catch (e) {
      console.error("Failed to save environments", e);
      alert("Failed to save environment settings.");
    }
    setIsSaving(false);
  };

  if (!isOpen) return null;

  const filteredVariables = activeProfile 
    ? Object.entries(activeProfile.variables).filter(([key, val]) => 
        key.toLowerCase().includes(searchQuery.toLowerCase()) || 
        val.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Environment Settings
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {serviceName}
              </span>
            </h2>
            <p className="text-sm text-slate-400 mt-1">Manage environment variables and grouped profiles.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
           <div className="flex-1 flex items-center justify-center p-12">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
           </div>
        ) : (
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Sidebar - Profiles */}
          <div className="w-full md:w-64 border-r border-slate-800 bg-slate-900/30 overflow-y-auto flex-shrink-0 flex flex-col">
            <div className="p-4 border-b border-slate-800">
               <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Profiles</h3>
               
               <div className="space-y-2 mb-4">
                 {data.profiles.map(p => (
                   <button
                     key={p.id}
                     onClick={() => setActiveProfileId(p.id)}
                     className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between group transition-all duration-200 ${activeProfileId === p.id ? 'bg-slate-800 shadow-inner' : 'hover:bg-slate-800/50'}`}
                   >
                     <div className="flex items-center gap-2 overflow-hidden">
                       <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: p.color }} />
                       <span className={`text-sm truncate font-medium ${activeProfileId === p.id ? 'text-white' : 'text-slate-300'}`}>
                         {p.name}
                       </span>
                     </div>
                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {data.active === p.id && (
                           <span title="Currently applied to .env">
                             <CheckCircle2 className="h-3 w-3 text-cyan-500" />
                           </span>
                        )}
                        <Trash2 
                          className="h-3.5 w-3.5 text-slate-500 hover:text-red-400 ml-1" 
                          onClick={(e) => handleDeleteProfile(p.id, e)}
                        />
                     </div>
                   </button>
                 ))}
                 
                 {data.profiles.length === 0 && (
                   <div className="text-sm text-slate-500 italic p-2 text-center">No profiles found.</div>
                 )}
               </div>

               {!isCreatingProfile ? (
                 <button 
                  onClick={() => setIsCreatingProfile(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors text-sm font-medium"
                 >
                   <Plus className="h-4 w-4" />
                   New Profile
                 </button>
               ) : (
                 <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 shadow-xl animate-in fade-in slide-in-from-top-2">
                   <input
                     autoFocus
                     type="text"
                     placeholder="Profile Name"
                     value={newProfileName}
                     onChange={e => setNewProfileName(e.target.value)}
                     className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500 mb-2"
                     onKeyDown={e => e.key === 'Enter' && handleCreateProfile()}
                   />
                   <div className="flex flex-wrap gap-1.5 mb-3">
                     {PRESET_COLORS.map(c => (
                       <button
                         key={c}
                         onClick={() => setNewProfileColor(c)}
                         className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${newProfileColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                         style={{ backgroundColor: c }}
                       />
                     ))}
                   </div>
                   <div className="flex gap-2">
                     <button onClick={handleCreateProfile} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold py-1.5 rounded-lg transition-colors">
                       Create
                     </button>
                     <button onClick={() => setIsCreatingProfile(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-1.5 rounded-lg transition-colors">
                       Cancel
                     </button>
                   </div>
                 </div>
               )}
            </div>
            
            <div className="p-4 mt-auto">
              <div className="text-xs text-slate-500 leading-relaxed bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <span className="text-cyan-400 font-medium">Tip:</span> The active profile's variables will be automatically written to the <code className="bg-slate-900 px-1 py-0.5 rounded text-slate-300">.env</code> file when you save.
              </div>
            </div>
          </div>

          {/* Main Content - Variables */}
          <div className="flex-1 flex flex-col bg-[#0B0F19] relative">
            {activeProfile ? (
              <>
                <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-900/20">
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search variables..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                         <label className="text-[10px] uppercase font-bold text-slate-500 ml-1 mb-1 block">Working Env File</label>
                         <select
                           value={activeProfile.envPath || (discoveredFiles.length > 0 ? discoveredFiles[0] : '')}
                           onChange={(e) => handleProfileEnvPathChange(activeProfile.id, e.target.value)}
                           className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50 transition-colors"
                         >
                           {discoveredFiles.length > 0 ? (
                             discoveredFiles.map(file => (
                               <option key={file} value={file}>
                                 {getRelativePath(servicePath, file)}
                               </option>
                             ))
                           ) : (
                             <option value="">No .env files discovered</option>
                           )}
                         </select>
                      </div>
                      <button
                        onClick={addNewVariable}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 text-sm font-medium text-white px-4 py-2 rounded-xl transition-all h-[38px] mt-4"
                      >
                        <Plus className="h-4 w-4" />
                        Add Variable
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 max-h-[60vh] custom-scroll">
                  {filteredVariables.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 space-y-4">
                      <div className="w-16 h-16 rounded-full bg-slate-800/50 border border-slate-700 flex items-center justify-center">
                        <Search className="h-6 w-6 text-slate-600" />
                      </div>
                      <p>No variables found in this profile.</p>
                      <button onClick={addNewVariable} className="text-cyan-500 hover:text-cyan-400 font-medium text-sm transition-colors">
                        Add a new variable
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredVariables.map(([key, val]) => (
                        <div key={key} className="flex items-start gap-2 group">
                          <input
                            type="text"
                            value={key}
                            onChange={(e) => renameVariableKey(key, e.target.value)}
                            onBlur={(e) => {
                                // Re-run exact check on blur if needed
                                if(!e.target.value.trim() && key !== e.target.value) {
                                    renameVariableKey(e.target.value, key); // revert if empty
                                }
                            }}
                            className="w-1/3 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-cyan-300 font-mono focus:outline-none focus:border-cyan-500 focus:bg-slate-900 transition-colors"
                            placeholder="KEY_NAME"
                          />
                          <div className="flex-1 flex items-start relative">
                            <span className="absolute left-3 top-2.5 text-slate-500 font-mono text-sm select-none">=</span>
                            <textarea
                              value={val}
                              onChange={(e) => updateVariable(key, e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-10 py-2 text-sm text-green-400 font-mono focus:outline-none focus:border-green-500/50 min-h-[38px] resize-y transition-colors"
                              placeholder="Value..."
                              rows={val.includes('\n') ? 3 : 1}
                            />
                            <button
                              onClick={() => deleteVariable(key)}
                              className="absolute right-2 top-2 p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded"
                              title="Delete Variable"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
               <div className="flex-1 flex items-center justify-center text-slate-500 p-12 text-center flex-col gap-4">
                 <div className="w-20 h-20 rounded-full bg-slate-800/30 border border-slate-700 flex items-center justify-center">
                   <div className="w-10 h-10 rounded bg-slate-700/50"></div>
                 </div>
                 <p className="text-lg font-medium text-slate-400">Select or create a profile</p>
                 <p className="text-sm max-w-sm mx-auto">Profiles let you quickly switch between different sets of environment variables.</p>
               </div>
            )}
          </div>
        </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading || !activeProfileId}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {isSaving ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save & Apply
          </button>
        </div>
      </div>
    </div>
  );
}
