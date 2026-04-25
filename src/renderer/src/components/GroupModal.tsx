import { useState, useEffect } from 'react'
import { X, Trash2 } from 'lucide-react'

interface PipelineStep {
  id: string
  name: string
  command: string
  successPattern?: string
  timeout?: number
  isWaitPort?: boolean
  isTransient?: boolean
}

interface Group {
  id: string
  name: string
  servicePaths: string[]
  serviceModes?: Record<string, 'dev' | 'prod'>
  serviceEnvs?: Record<string, string>
  dependencies?: Record<string, string[]>
  pipelines?: Record<string, PipelineStep[]>
}

interface Service {
  name: string
  path: string
  envProfiles?: { id: string; name: string; color: string }[]
}

interface GroupModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (group: Group, action: 'create' | 'delete', id?: string) => void
  initialGroup?: Group
  availableServices: Service[]
}

import { Plus, ListTree, Settings2, PlayCircle, Hash } from 'lucide-react'

export function GroupModal({
  isOpen,
  onClose,
  onSave,
  initialGroup,
  availableServices
}: GroupModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'orchestration'>('general')
  const [name, setName] = useState('')
  const [selectedPaths, setSelectedPaths] = useState<string[]>([])
  const [serviceModes, setServiceModes] = useState<Record<string, 'dev' | 'prod'>>({})
  const [serviceEnvs, setServiceEnvs] = useState<Record<string, string>>({})
  const [dependencies, setDependencies] = useState<Record<string, string[]>>({})
  const [pipelines, setPipelines] = useState<Record<string, PipelineStep[]>>({})

  useEffect(() => {
    if (isOpen) {
      setName(initialGroup?.name || '')
      setSelectedPaths(initialGroup?.servicePaths || [])
      setServiceModes(initialGroup?.serviceModes || {})
      setServiceEnvs(initialGroup?.serviceEnvs || {})
      setDependencies(initialGroup?.dependencies || {})
      setPipelines(initialGroup?.pipelines || {})
      setActiveTab('general')
    }
  }, [isOpen, initialGroup])

  if (!isOpen) return null

  const handleSave = () => {
    onSave(
      {
        id: initialGroup?.id || crypto.randomUUID(),
        name,
        servicePaths: selectedPaths,
        serviceModes,
        serviceEnvs,
        dependencies,
        pipelines
      },
      'create'
    )
    onClose()
  }

  const handleDelete = () => {
    if (initialGroup?.id) {
      onSave(initialGroup, 'delete', initialGroup.id)
      onClose()
    }
  }

  const toggleService = (path: string) => {
    if (selectedPaths.includes(path)) {
      setSelectedPaths(selectedPaths.filter((p) => p !== path))
      const newModes = { ...serviceModes }
      delete newModes[path]
      setServiceModes(newModes)
    } else {
      setSelectedPaths([...selectedPaths, path])
      setServiceModes({ ...serviceModes, [path]: 'dev' })
      const svc = availableServices.find((s) => s.path === path)
      if (svc?.envProfiles && svc.envProfiles.length > 0) {
        setServiceEnvs({ ...serviceEnvs, [path]: svc.envProfiles[0].id })
      }
    }
  }

  const setServiceMode = (path: string, mode: 'dev' | 'prod') => {
    setServiceModes({ ...serviceModes, [path]: mode })
  }

  const setServiceEnv = (path: string, envId: string) => {
    setServiceEnvs({ ...serviceEnvs, [path]: envId })
  }

  const toggleDependency = (servicePath: string, parentPath: string) => {
    const current = dependencies[servicePath] || []
    if (current.includes(parentPath)) {
      setDependencies({ ...dependencies, [servicePath]: current.filter((p) => p !== parentPath) })
    } else {
      setDependencies({ ...dependencies, [servicePath]: [...current, parentPath] })
    }
  }

  const addPipelineStep = (servicePath: string) => {
    const steps = pipelines[servicePath] || []
    const newStep: PipelineStep = {
      id: crypto.randomUUID(),
      name: 'New Step',
      command: 'npm start',
      isWaitPort: true,
      timeout: 300000
    }
    setPipelines({ ...pipelines, [servicePath]: [...steps, newStep] })
  }

  const removePipelineStep = (servicePath: string, stepId: string) => {
    const steps = pipelines[servicePath] || []
    setPipelines({ ...pipelines, [servicePath]: steps.filter((s) => s.id !== stepId) })
  }

  const updatePipelineStep = (
    servicePath: string,
    stepId: string,
    updates: Partial<PipelineStep>
  ) => {
    const steps = pipelines[servicePath] || []
    setPipelines({
      ...pipelines,
      [servicePath]: steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s))
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-4xl rounded-2xl bg-slate-950 border border-slate-700/50 shadow-2xl p-0 relative overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 pb-4 relative z-10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">
              {initialGroup ? 'Modify' : 'Create'} <span className="text-indigo-400">Cluster</span>
            </h2>
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => setActiveTab('general')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'general' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                <Settings2 className="h-4 w-4" />
                General
              </button>
              <button
                onClick={() => setActiveTab('orchestration')}
                disabled={selectedPaths.length === 0}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'orchestration' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'} disabled:opacity-30`}
              >
                <ListTree className="h-4 w-4" />
                Orchestration
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-4">
          {activeTab === 'general' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">Group Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border-slate-700 bg-slate-800/50 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 sm:text-sm p-3 border outline-none transition-all shadow-sm"
                  placeholder="e.g. Core Services"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2 mt-4">
                  Select Services ({selectedPaths.length})
                </label>
                <div className="max-h-60 overflow-y-auto space-y-1.5 border border-slate-700/50 rounded-lg p-3 bg-slate-800/20 shadow-inner">
                  {availableServices.length === 0 ? (
                    <p className="text-sm text-slate-500 p-2 text-center">No services available</p>
                  ) : (
                    availableServices.map((service) => {
                      const isSelected = selectedPaths.includes(service.path)
                      const currentMode = serviceModes[service.path] || 'dev'
                      return (
                        <div
                          key={service.path}
                          className={`flex items-center justify-between p-2 rounded-md ${isSelected ? 'bg-cyan-500/10 border border-cyan-500/20' : 'hover:bg-slate-800/60 border border-transparent'} cursor-pointer transition-colors`}
                        >
                          <label className="flex items-center space-x-3 flex-1 cursor-pointer truncate">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900 transition-colors"
                              checked={isSelected}
                              onChange={() => toggleService(service.path)}
                            />
                            <span
                              className="text-sm font-bold text-slate-100 truncate"
                              title={service.path}
                            >
                              {service.name}
                            </span>
                          </label>

                          {isSelected && (
                            <div className="flex items-center gap-2 ml-2 shrink-0">
                              {service.envProfiles && service.envProfiles.length > 0 && (
                                <select
                                  value={serviceEnvs[service.path] || ''}
                                  onChange={(e) => setServiceEnv(service.path, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] bg-slate-800 border border-slate-700 rounded px-1 py-1 text-slate-300 outline-none focus:border-cyan-500 transition-all font-bold"
                                >
                                  {service.envProfiles.map((p) => (
                                    <option key={p.id} value={p.id} className="bg-slate-900">
                                      {p.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <div className="flex bg-slate-800/50 rounded-lg p-0.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setServiceMode(service.path, 'dev')
                                  }}
                                  className={`px-2 py-1 rounded-md text-[10px] font-black tracking-wider uppercase transition-all ${
                                    currentMode === 'dev'
                                      ? 'bg-cyan-500/20 text-cyan-400 shadow-sm border border-cyan-500/30'
                                      : 'text-slate-500 hover:text-slate-300'
                                  }`}
                                >
                                  Dev
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setServiceMode(service.path, 'prod')
                                  }}
                                  className={`px-2 py-1 rounded-md text-[10px] font-black tracking-wider uppercase transition-all ${
                                    currentMode === 'prod'
                                      ? 'bg-amber-500/20 text-amber-500 shadow-sm border border-amber-500/30'
                                      : 'text-slate-500 hover:text-slate-300'
                                  }`}
                                >
                                  Prod
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              {selectedPaths.map((path) => {
                const svc = availableServices.find((s) => s.path === path)
                if (!svc) return null
                const svcDeps = dependencies[path] || []
                const svcPipeline = pipelines[path] || []

                return (
                  <div
                    key={path}
                    className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                          <PlayCircle className="h-6 w-6 text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="font-black text-white">{svc.name}</h3>
                          <p className="text-[10px] text-slate-500 font-mono truncate max-w-xs">
                            {path}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Depends On:
                        </label>
                        <div className="flex flex-wrap gap-2 max-w-sm justify-end">
                          {selectedPaths
                            .filter((p) => p !== path)
                            .map((otherPath) => {
                              const otherSvc = availableServices.find((s) => s.path === otherPath)
                              const isDep = svcDeps.includes(otherPath)
                              return (
                                <button
                                  key={otherPath}
                                  onClick={() => toggleDependency(path, otherPath)}
                                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all border ${isDep ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'}`}
                                >
                                  {otherSvc?.name}
                                </button>
                              )
                            })}
                          {selectedPaths.length <= 1 && (
                            <span className="text-[10px] text-slate-600 italic">
                              No other services selected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Hash className="h-3 w-3" />
                          Pipeline Steps
                        </h4>
                        <button
                          onClick={() => addPipelineStep(path)}
                          className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add Step
                        </button>
                      </div>

                      <div className="space-y-2">
                        {svcPipeline.map((step, idx) => (
                          <div
                            key={step.id}
                            className="group relative flex items-start gap-4 bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-all"
                          >
                            <div className="mt-1 h-6 w-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-500">
                              {idx + 1}
                            </div>
                            <div className="flex-1 grid grid-cols-12 gap-4">
                              <div className="col-span-12 md:col-span-4">
                                <input
                                  value={step.name}
                                  onChange={(e) =>
                                    updatePipelineStep(path, step.id, { name: e.target.value })
                                  }
                                  placeholder="Step Name (e.g. Build)"
                                  className="w-full bg-transparent border-b border-slate-700 focus:border-indigo-500 text-xs text-white font-bold py-1 outline-none transition-all"
                                />
                              </div>
                              <div className="col-span-12 md:col-span-8 flex items-center gap-2">
                                <div className="flex-1 flex items-center gap-2 bg-slate-900/50 rounded px-2 py-1 border border-slate-800">
                                  <span className="text-[10px] font-mono text-slate-600">$</span>
                                  <input
                                    value={step.command}
                                    onChange={(e) =>
                                      updatePipelineStep(path, step.id, { command: e.target.value })
                                    }
                                    placeholder="Command (npm run ...)"
                                    className="flex-1 bg-transparent text-[10px] text-cyan-400 font-mono outline-none"
                                  />
                                </div>
                              </div>
                              <div className="col-span-12 flex items-center gap-6 mt-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={step.isWaitPort}
                                    onChange={(e) =>
                                      updatePipelineStep(path, step.id, {
                                        isWaitPort: e.target.checked
                                      })
                                    }
                                    className="h-3 w-3 rounded border-slate-700 bg-slate-800 text-indigo-500"
                                  />
                                  <span className="text-[10px] font-bold text-slate-400">
                                    Wait for Port
                                  </span>
                                </label>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                    Success Pattern:
                                  </span>
                                  <input
                                    value={step.successPattern || ''}
                                    onChange={(e) =>
                                      updatePipelineStep(path, step.id, {
                                        successPattern: e.target.value
                                      })
                                    }
                                    placeholder="Regex (optional)"
                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-[10px] text-emerald-400 font-mono outline-none focus:border-emerald-500/50"
                                  />
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={step.isTransient}
                                    onChange={(e) =>
                                      updatePipelineStep(path, step.id, {
                                        isTransient: e.target.checked
                                      })
                                    }
                                    className="h-3 w-3 rounded border-slate-700 bg-slate-800 text-amber-500"
                                  />
                                  <span className="text-[10px] font-bold text-slate-400">
                                    Transient (Stop after exit)
                                  </span>
                                </label>
                              </div>
                            </div>
                            <button
                              onClick={() => removePipelineStep(path, step.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {svcPipeline.length === 0 && (
                          <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                              No custom steps defined.
                            </p>
                            <p className="text-[9px] text-slate-700 mt-1">
                              Defaults to basic 'npm start' behavior.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-8 border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-md flex justify-between items-center relative z-10">
          {initialGroup ? (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          ) : (
            <div className="w-20" />
          )}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-700 text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-all shadow-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || selectedPaths.length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-sm font-black text-white shadow-xl shadow-indigo-600/20 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-30 disabled:grayscale transition-all"
            >
              Save Cluster
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GroupModal
