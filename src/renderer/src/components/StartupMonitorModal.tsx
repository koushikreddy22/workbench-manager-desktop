import { AlertCircle, Play, Square, Terminal as TerminalIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface StartupMonitorModalProps {
  isOpen: boolean
  hangingService: {
    servicePath: string
    serviceName: string
    logPattern: string
    logs: string[]
  } | null
  onMarkReady: (path: string) => void
  onAbort: () => void
}

export function StartupMonitorModal({
  isOpen,
  hangingService,
  onMarkReady,
  onAbort
}: StartupMonitorModalProps) {
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [hangingService?.logs])

  if (!isOpen || !hangingService) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-3xl rounded-3xl bg-slate-950 border border-amber-500/30 shadow-[0_0_50px_-12px_rgba(245,158,11,0.2)] overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-8 pb-4 flex items-center justify-between bg-gradient-to-b from-amber-500/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center animate-pulse">
              <AlertCircle className="h-7 w-7 text-amber-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">
                Startup <span className="text-amber-500">Delayed</span>
              </h2>
              <p className="text-sm text-slate-400 font-bold">
                Service <span className="text-white">"{hangingService.serviceName}"</span> is taking
                longer than expected.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-8 pt-4 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span>Waiting for Pattern</span>
              <span className="text-emerald-500">Regex Active</span>
            </div>
            <code className="block w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-emerald-400 font-mono text-sm overflow-x-auto">
              {hangingService.logPattern}
            </code>
          </div>

          <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/30">
              <div className="flex items-center gap-2">
                <TerminalIcon className="h-3 w-3 text-slate-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Recent Logs
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-1">
              {hangingService.logs.map((log, i) => (
                <div
                  key={i}
                  className="text-slate-300 break-all border-l-2 border-slate-800 pl-3 py-0.5 hover:bg-white/5 transition-colors"
                >
                  {log}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>

        <div className="p-8 pt-0 flex gap-4">
          <button
            onClick={() => onMarkReady(hangingService.servicePath)}
            className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/20 transition-all border border-emerald-500/30 group"
          >
            <Play className="h-5 w-5 fill-white group-hover:scale-110 transition-transform" />
            Mark as Ready & Continue
          </button>
          <button
            onClick={onAbort}
            className="px-8 h-14 rounded-2xl bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white font-black flex items-center justify-center gap-3 transition-all border border-slate-700 hover:border-red-500/50 group"
          >
            <Square className="h-4 w-4 group-hover:scale-110 transition-transform" />
            Abort
          </button>
        </div>
      </div>
    </div>
  )
}
