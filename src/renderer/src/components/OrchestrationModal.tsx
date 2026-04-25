import { motion } from 'framer-motion'
import {
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
  ListTree,
  Square,
  Terminal,
  Ban
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useMemo } from 'react'

interface PipelineStep {
  id: string
  name: string
}

interface Group {
  id: string
  name: string
  servicePaths: string[]
  dependencies?: Record<string, string[]>
  pipelines?: Record<string, PipelineStep[]>
}

interface Service {
  path: string
  name: string
}

interface OrchestrationModalProps {
  isOpen: boolean
  onClose: () => void
  group: Group | null
  allServices: Service[]
  statuses: Record<string, string>
  onAbort: () => void
  onViewLogs?: (path: string) => void
}

export function OrchestrationModal({
  isOpen,
  onClose,
  group,
  allServices,
  statuses,
  onAbort,
  onViewLogs
}: OrchestrationModalProps) {
  // Calculate dependency Levels
  const levels = useMemo(() => {
    if (!group) return []

    const deps = group.dependencies || {}
    const levelsMap: Record<string, number> = {}
    const getLevel = (path: string): number => {
      if (levelsMap[path] !== undefined) return levelsMap[path]
      const parents = deps[path] || []
      if (parents.length === 0) {
        levelsMap[path] = 0
        return 0
      }
      const level = Math.max(...parents.map(getLevel)) + 1
      levelsMap[path] = level
      return level
    }

    group.servicePaths.forEach(getLevel)

    const maxLevel = Math.max(...Object.values(levelsMap), 0)
    const result: string[][] = Array.from({ length: maxLevel + 1 }, () => [])

    Object.entries(levelsMap).forEach(([path, level]) => {
      result[level].push(path)
    })

    return result
  }, [group])

  const serviceNameMap = useMemo(() => {
    return new Map(allServices.map((s) => [s.path, s.name]))
  }, [allServices])

  if (!isOpen || !group) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 animate-in fade-in duration-300 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-5xl rounded-3xl bg-slate-950 border border-indigo-500/30 shadow-[0_0_80px_-20px_rgba(99,102,241,0.3)] flex flex-col max-h-[85vh] relative overflow-hidden"
      >
        {/* Background Glows */}
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Header */}
        <div className="p-8 pb-4 flex items-center justify-between border-b border-white/5 relative bg-white/[0.02]">
          <div className="flex items-center gap-5">
            <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Zap className="h-8 w-8 text-indigo-400 fill-indigo-500/20" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                {group.name}
                <span className="text-indigo-400 opacity-50 uppercase text-xs tracking-[0.3em] font-black">
                  Orchestration
                </span>
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Real-time Stream Pipeline
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-6 space-y-12">
          {levels.map((levelServices, levelIndex) => (
            <div key={levelIndex} className="relative">
              {/* Connector Line to next level */}
              {levelIndex < levels.length - 1 && (
                <div className="absolute left-1/2 -bottom-10 h-10 w-px bg-gradient-to-b from-indigo-500/40 to-transparent" />
              )}

              <div className="flex items-center gap-3 mb-6">
                <div className="h-6 w-10 rounded border border-indigo-500/30 flex items-center justify-center bg-indigo-500/10 text-[10px] font-black text-indigo-400">
                  LVL {levelIndex}
                </div>
                <div className="h-px flex-1 bg-white/[0.05]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {levelServices.map((path) => {
                  const status = statuses[path] || 'pending'
                  const name = serviceNameMap.get(path) || path.split(/[\/\\]/).pop()

                  const isInactive =
                    status === 'pending' || status === 'waiting' || status === 'queued'
                  const isProcessing = ![
                    'ready',
                    'error',
                    'aborted',
                    'pending',
                    'waiting',
                    'queued'
                  ].includes(status)

                  return (
                    <motion.div
                      key={path}
                      layout
                      className={cn(
                        'p-5 rounded-2xl border transition-all duration-500 relative group/card overflow-hidden',
                        status === 'ready'
                          ? 'bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5'
                          : status === 'error'
                            ? 'bg-red-500/5 border-red-500/20 shadow-red-500/5 shadow-lg'
                            : status === 'aborted'
                              ? 'bg-slate-900 border-slate-800 opacity-60'
                              : status === 'waiting'
                                ? 'bg-slate-900/40 border-slate-800'
                                : 'bg-indigo-500/5 border-indigo-500/20 shadow-indigo-500/5'
                      )}
                    >
                      <div className="flex flex-col gap-4 relative z-10">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="text-sm font-black text-white truncate max-w-[150px]">
                              {name}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-mono truncate opacity-60">
                              {path}
                            </p>
                          </div>
                          <div className="shrink-0 flex items-center gap-2">
                            {onViewLogs && (
                              <button
                                onClick={() => onViewLogs(path)}
                                className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all border border-white/5"
                                title="View Live Logs"
                              >
                                <Terminal className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <div className="h-7 w-px bg-white/5 mx-1" />
                            {status === 'ready' && (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            )}
                            {status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                            {status === 'aborted' && <Ban className="h-5 w-5 text-slate-500" />}
                            {isProcessing && (
                              <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
                            )}
                            {(status === 'waiting' || status === 'queued') && (
                              <ListTree className="h-5 w-5 text-slate-600" />
                            )}
                          </div>
                        </div>

                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width:
                                status === 'ready'
                                  ? '100%'
                                  : isInactive
                                    ? '0%'
                                    : status === 'aborted'
                                      ? '0%'
                                      : '60%'
                            }}
                            className={cn(
                              'h-full transition-all duration-700',
                              status === 'ready'
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                                : status === 'error'
                                  ? 'bg-red-500'
                                  : status === 'aborted'
                                    ? 'bg-slate-700'
                                    : 'bg-gradient-to-r from-indigo-600 to-cyan-400 animate-pulse'
                            )}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border',
                              status === 'ready'
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : status === 'error'
                                  ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                  : status === 'aborted'
                                    ? 'bg-slate-800 text-slate-500 border-slate-700'
                                    : status === 'waiting' || status === 'queued'
                                      ? 'bg-slate-800 text-slate-500 border-slate-700'
                                      : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]'
                            )}
                          >
                            {status}
                          </span>

                          {group.dependencies?.[path] && group.dependencies[path].length > 0 && (
                            <div className="flex -space-x-1 hover:space-x-1 transition-all">
                              {group.dependencies[path].map((p) => (
                                <div
                                  key={p}
                                  className={cn(
                                    'h-4 px-1.5 rounded-sm border text-[8px] font-black flex items-center justify-center transition-all',
                                    statuses[p] === 'ready'
                                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-500'
                                      : 'bg-slate-800 border-slate-700 text-slate-500'
                                  )}
                                  title={`Waiting for ${p.split(/[\/\\]/).pop()}`}
                                >
                                  {p
                                    .split(/[\/\\]/)
                                    .pop()
                                    ?.substring(0, 1)
                                    .toUpperCase()}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer / Controls */}
        <div className="p-8 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Active Boot Stream
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Success Pattern Match
              </span>
            </div>
          </div>

          <button
            onClick={onAbort}
            className="h-12 px-8 rounded-2xl bg-slate-900 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-red-500/5 group"
          >
            <div className="flex items-center gap-3">
              <Square className="h-4 w-4 group-hover:scale-110 transition-transform" />
              Abort Sequence
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
