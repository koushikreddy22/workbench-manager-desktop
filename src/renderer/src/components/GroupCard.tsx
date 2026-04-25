import { useState } from 'react'
import { Play, Square, Settings, Loader2, Zap, ListTree } from 'lucide-react'
import { cn } from '../lib/utils'

interface GroupCardProps {
  id: string
  name: string
  serviceCount: number
  modes?: Record<string, 'dev' | 'prod'>
  onRun: (id: string) => Promise<void>
  onRunCluster: (id: string) => Promise<void>
  onStop: (id: string) => Promise<void>
  onEdit: (id: string) => void
  orchestrationStatus?: Record<string, string>
  isOrchestrating?: boolean
  onOpenOrchestration?: (id: string) => void
}

export function GroupCard({
  id,
  name,
  serviceCount,
  modes,
  onRun,
  onRunCluster,
  onStop,
  onEdit,
  orchestrationStatus,
  isOrchestrating,
  onOpenOrchestration
}: GroupCardProps) {
  const [loading, setLoading] = useState(false)

  const handleRun = async () => {
    setLoading(true)
    await onRun(id)
    setLoading(false)
  }

  const handleStop = async () => {
    setLoading(true)
    await onStop(id)
    setLoading(false)
  }

  const hasProd = modes && Object.values(modes).some((m) => m === 'prod')

  return (
    <div
      className={cn(
        'group rounded-2xl border transition-all duration-300 shadow-2xl backdrop-blur-md p-6',
        hasProd
          ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/60 hover:shadow-amber-500/10 hover:bg-amber-950/30'
          : 'bg-cyan-950/20 border-cyan-500/30 hover:border-cyan-500/60 hover:shadow-cyan-500/10 hover:bg-cyan-950/30'
      )}
    >
      <div className="flex items-start justify-between mb-6 gap-4">
        <h3
          className={cn(
            'text-xl font-bold transition-colors break-words leading-tight',
            hasProd
              ? 'text-white group-hover:text-amber-400'
              : 'text-white group-hover:text-cyan-400'
          )}
        >
          {name}
        </h3>
        <button
          onClick={() => onEdit(id)}
          className="p-2.5 rounded-xl bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white transition-all border border-slate-700/50 shrink-0"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-slate-800/60 pt-6 mt-4 flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-black uppercase tracking-widest text-slate-500 shrink-0">
            {serviceCount} Channels
          </span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onRunCluster(id)}
            disabled={loading || isOrchestrating}
            className={cn(
              'flex h-10 px-4 items-center justify-center rounded-xl transition-all shadow-lg gap-2 font-black text-[10px] uppercase tracking-widest outline-none',
              isOrchestrating
                ? 'bg-indigo-500 text-white animate-pulse'
                : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 shadow-indigo-500/5'
            )}
            title="Smart Boot (Sequential & Pipelines)"
          >
            {isOrchestrating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 fill-current" />
            )}
            {isOrchestrating ? 'Booting...' : 'Smart Boot'}
          </button>
          <button
            onClick={handleRun}
            disabled={loading || isOrchestrating}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all shadow-lg shadow-cyan-500/5"
            title="Pulse All (Parallel)"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Play className="h-5 w-5 fill-current ml-0.5" />
            )}
          </button>
          <button
            onClick={handleStop}
            disabled={loading || isOrchestrating}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-all shadow-lg shadow-red-500/5"
            title="Silence All"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Square className="h-5 w-5 fill-current" />
            )}
          </button>
        </div>
      </div>

      {orchestrationStatus && Object.keys(orchestrationStatus).length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-800/60 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <ListTree className="h-3 w-3" />
              Execution Sequence
            </h4>
            <button
              onClick={() => onOpenOrchestration?.(id)}
              className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-tighter transition-all"
            >
              View Detailed Pipeline
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(orchestrationStatus).map(([path, status]) => (
              <div
                key={path}
                className="flex items-center justify-between bg-slate-900/50 rounded-lg p-2 border border-slate-800/50"
              >
                <span className="text-[10px] font-bold text-slate-400 truncate max-w-[100px]">
                  {path.split(/[\/\\]/).pop()}
                </span>
                <span
                  className={cn(
                    'text-[9px] font-black uppercase px-1.5 py-0.5 rounded',
                    status === 'ready'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : status === 'error' || status === 'aborted' || status === 'port-conflict'
                        ? 'bg-red-500/10 text-red-500'
                        : ![
                            'ready',
                            'error',
                            'aborted',
                            'pending',
                            'waiting',
                            'queued',
                            'waiting-for-port',
                            'port-conflict'
                          ].includes(status)
                          ? 'bg-indigo-500/10 text-indigo-400 animate-pulse'
                          : 'bg-slate-800 text-slate-500'
                  )}
                >
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
