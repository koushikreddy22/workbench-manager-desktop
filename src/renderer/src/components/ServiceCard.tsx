import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Play,
  Square,
  FileText,
  GitBranch,
  MoreVertical,
  Download,
  Settings,
  RefreshCw,
  Wrench,
  Rocket,
  Code,
  ArrowUp,
  ArrowDown,
  FolderOpen,
  Copy,
  Check,
  Database,
  Plus,
  Archive,
  Sparkles,
  X,
  Activity,
  Camera,
  TrendingUp,
  LineChart,
  CloudDownload
} from 'lucide-react'
import { cn } from '../lib/utils'
import { motion } from 'framer-motion'
import { AiOrchestrator } from '../lib/ai-orchestrator'
import { AiSettings } from './AiSettingsModal'

interface GitStatus {
  hasLocalChanges: boolean
  ahead: number
  behind: number
}

interface CustomButton {
  name: string
  command: string
  color: string
}

interface Insight {
  type: string
  text: string
}

interface ServiceProps {
  name: string
  path: string
  status:
    | 'running'
    | 'stopped'
    | 'error'
    | 'starting'
    | 'building'
    | 'installing'
    | 'build-error'
    | 'install-error'
    | 'ready'
    | 'waiting-for-dependencies'
  mode: 'dev' | 'prod' | null
  port?: number
  gitBranch?: string
  gitStatus?: GitStatus
  customButtons?: CustomButton[]
  onToggle: (path: string, action: 'start' | 'stop' | 'log', mode?: 'dev' | 'prod') => void
  onCommand: (path: string, action: string, payload?: any) => Promise<void>
  onOpenIde: (path: string) => void
  isIdeLoading?: boolean
  isEnvSwitching?: boolean
  activeEnv?: { name: string; color: string } | null
  envProfiles?: { id: string; name: string; color: string }[]
  activeEnvId?: string | null
  isSelected?: boolean
  onSelect?: (path: string) => void
  stats?: { cpu: number; memory: number; history?: { cpu: number[]; memory: number[] } }
  aiSettings: AiSettings
}

export function ServiceCard({
  name,
  path,
  status,
  mode,
  port,
  gitBranch,
  gitStatus,
  envProfiles,
  activeEnvId,
  customButtons,
  onToggle,
  onCommand,
  onOpenIde,
  isIdeLoading,
  isEnvSwitching,
  isSelected,
  onSelect,
  stats,
  aiSettings
}: ServiceProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{
    top: number
    left: number | 'auto'
    right: number | 'auto'
  }>({ top: 0, left: 0, right: 'auto' })
  const menuRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  const [isLiaisonOpen, setIsLiaisonOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [liaisonSummary, setLiaisonSummary] = useState<string | null>(null)
  const [suggestedCommit, setSuggestedCommit] = useState<string | null>(null)
  const [isLiaisonLoading, setIsLiaisonLoading] = useState(false)
  const [showTrends, setShowTrends] = useState(false)

  const isServiceActive = status === 'running' || (status as any) === 'ready' || status === 'starting'
  const isAnomaly = stats && (stats.cpu > 80 || stats.memory > 800)

  const handleCopyPath = () => {
    navigator.clipboard.writeText(path)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSyncFromDisk = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsSyncing(true)
    try {
      const result = await window.api.syncEnvFromDisk({ path })
      if (result.success) {
        setTimeout(() => setIsSyncing(false), 1500)
      } else {
        alert(`Sync failed: ${result.error}`)
        setIsSyncing(false)
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
      setIsSyncing(false)
    }
  }

  const toggleMenu = () => {
    if (!menuOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const menuWidth = 224 // w-56
      const menuHeight = 320 // estimate for max-h

      const spaceBelow = window.innerHeight - rect.bottom
      const spaceOnRight = window.innerWidth - rect.right

      let top: number | 'auto' = rect.bottom + 8
      let bottom: number | 'auto' = 'auto'
      let left: number | 'auto' = rect.left
      let right: number | 'auto' = 'auto'

      // Vertical Flip Logic
      if (spaceBelow < menuHeight && rect.top > menuHeight) {
        top = 'auto'
        bottom = window.innerHeight - rect.top + 8
      }

      // Horizontal Alignment Logic
      if (spaceOnRight < menuWidth) {
        left = 'auto'
        right = window.innerWidth - rect.right
      }

      setMenuPosition({ top, bottom, left, right } as any)
    }
    setMenuOpen(!menuOpen)
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAction = async (action: string, payload?: any) => {
    setMenuOpen(false)
    if (action === 'git-liaison') {
      handleGitLiaison()
    } else if (action === 'take-snapshot') {
      try {
        const result = await window.api.takeSnapshot()
        if (result.success) {
          alert(`Snapshot saved to: ${result.path}`)
        } else {
          alert(`Failed to take snapshot: ${result.error}`)
        }
      } catch (e: any) {
        alert(`Error: ${e.message}`)
      }
    } else {
      setActionLoading(action)
      try {
        await onCommand(path, action, payload)
      } finally {
        setActionLoading(null)
      }
    }
  }

  const handleGitLiaison = async () => {
    setIsLiaisonOpen(true)
    setIsLiaisonLoading(true)
    setLiaisonSummary(null)
    setSuggestedCommit(null)
    try {
      const { diff } = await window.api.gitCommand({ action: 'get-diff', path })
      const summary = await AiOrchestrator.summarizeDiff(diff, aiSettings)
      const msg = await AiOrchestrator.suggestCommitMessage(diff, aiSettings)
      setLiaisonSummary(summary)
      setSuggestedCommit(msg)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLiaisonLoading(false)
    }
  }

  const statusColor =
    status === 'running' || (status as any) === 'ready'
      ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.4)]'
      : status === 'starting' || status === 'building' || status === 'installing'
        ? 'bg-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.4)] animate-pulse'
        : status === 'error' || status === 'build-error' || status === 'install-error'
          ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
          : 'bg-gray-400'

  const insights: Insight[] = []
  if (status === 'running' || (status as any) === 'ready') {
    if (stats && stats.memory > 400) {
      insights.push({
        type: 'perf',
        text: 'High Memory: Running with Docker can reduce overhead and improve resource isolation.'
      })
    }
    if (gitStatus && gitStatus.behind > 0) {
      insights.push({
        type: 'best-practice',
        text: `Sync Required: You are ${gitStatus.behind} commits behind. Update to ensure stability.`
      })
    }
    // Default general tip if no specific one
    if (insights.length === 0) {
      insights.push({
        type: 'tip',
        text: 'Best Practice: Use "Smart Boot" to orchestrate complex dependencies automatically.'
      })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        'group relative rounded-2xl border transition-all duration-300 shadow-2xl backdrop-blur-md p-6',
        isServiceActive
          ? mode === 'prod'
            ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/60 hover:shadow-amber-500/10 hover:bg-amber-950/30'
            : 'bg-cyan-950/20 border-cyan-500/30 hover:border-cyan-500/60 hover:shadow-cyan-500/10 hover:bg-cyan-950/30'
          : 'bg-slate-900/40 border-slate-800/50 hover:border-slate-700/60 hover:bg-slate-900/60',
        isSelected &&
          'ring-2 ring-cyan-500 ring-offset-2 ring-offset-[#0B0F19] border-cyan-500/50 bg-cyan-900/10',
        isAnomaly &&
          'border-red-500/50 bg-red-950/10 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.2)]'
      )}
    >
      <div className="flex flex-col gap-4 w-full">
        {/* Header Row: Hero Title + Menu */}
        <div className="flex items-start justify-between gap-4 w-full">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => onSelect?.(path)}
                className={cn(
                  'h-4 w-4 rounded border transition-all flex items-center justify-center shrink-0',
                  isSelected
                    ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                    : 'bg-slate-800/50 border-slate-700/50 text-transparent hover:border-cyan-500/50'
                )}
              >
                <Check className={cn('h-3 w-3 stroke-[3px]', !isSelected && 'opacity-0')} />
              </button>
              <h3
                className="text-lg font-black text-white group-hover:text-cyan-400 transition-colors break-words leading-none tracking-tight"
                title={name}
              >
                {name}
              </h3>
              <div className={cn(
                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border flex items-center gap-1.5 shrink-0",
                status === 'ready' || status === 'running' 
                  ? "bg-green-500/10 text-green-500 border-green-500/20" 
                  : status === 'stopped' || status === 'error'
                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                  : "bg-slate-500/10 text-slate-400 border-slate-500/20"
              )}>
                <div className={cn("h-1.5 w-1.5 rounded-full", statusColor)} />
                {status}
              </div>
            </div>

            {/* Floating Env Row */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {isEnvSwitching ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/40 border border-slate-700/30 backdrop-blur-md">
                  <div className="h-3 w-3 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Switching
                  </span>
                </div>
              ) : envProfiles && envProfiles.length > 0 ? (
                <>
                  {envProfiles.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (activeEnvId !== profile.id)
                          onCommand(path, 'switch-env', { profileId: profile.id })
                      }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 border backdrop-blur-md',
                        activeEnvId === profile.id
                          ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                          : 'bg-slate-800/30 text-slate-500 border-slate-700/30 hover:border-slate-500/50 hover:text-slate-300'
                      )}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: profile.color }}
                      />
                      {profile.name}
                    </button>
                  ))}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onCommand(path, 'open-env-settings', { initialMode: 'add' })
                    }}
                    className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800/30 text-slate-600 hover:text-cyan-400 hover:bg-slate-700/50 transition-all border border-slate-700/30"
                    title="Add Profile"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={handleSyncFromDisk}
                    className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-full transition-all border border-slate-700/30 group/sync",
                      isSyncing 
                        ? "bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]" 
                        : "bg-slate-800/30 text-slate-600 hover:text-cyan-400 hover:bg-slate-700/50"
                    )}
                    title="Sync Default from Disk (.env)"
                  >
                    <CloudDownload className={cn("h-3.5 w-3.5", isSyncing && "animate-bounce")} />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onCommand(path, 'open-env-settings', { initialMode: 'edit' })
                    }}
                    className="flex items-center gap-2 px-4 py-1 rounded-full bg-slate-800/30 border border-slate-700/30 text-slate-500 hover:text-cyan-400 transition-all"
                  >
                    <Settings className="h-3 w-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Configure Env</span>
                  </button>
                  <button
                    onClick={handleSyncFromDisk}
                    className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-full transition-all border border-slate-700/30 group/sync",
                      isSyncing 
                        ? "bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]" 
                        : "bg-slate-800/30 text-slate-600 hover:text-cyan-400 hover:bg-slate-700/50"
                    )}
                    title="Sync from Disk (.env)"
                  >
                    <CloudDownload className={cn("h-3.5 w-3.5", isSyncing && "animate-bounce")} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0" ref={menuRef}>
            <button
              onClick={toggleMenu}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all border border-slate-700/50 bg-slate-800/40 text-slate-400 hover:bg-slate-700/60 hover:text-white hover:border-cyan-500/30 shadow-lg"
            >
              <MoreVertical className="h-4.5 w-4.5" />
            </button>

            {menuOpen &&
              createPortal(
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  className="fixed z-50 w-56 rounded-xl border border-slate-700/50 bg-slate-900 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[320px]"
                  style={{
                    top: menuPosition.top,
                    bottom: (menuPosition as any).bottom,
                    ...(menuPosition.left !== 'auto' ? { left: menuPosition.left } : {}),
                    ...(menuPosition.right !== 'auto' ? { right: menuPosition.right } : {})
                  }}
                >
                  <div className="overflow-y-auto custom-scrollbar flex-1">
                    <div className="px-3 py-2 text-[10px] font-black text-cyan-500/60 uppercase tracking-widest bg-slate-950/40">
                      Vantage Tools
                    </div>
                    <button
                      onClick={() => handleAction('service-settings')}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all underline-offset-4"
                    >
                      <Settings className="h-4 w-4 text-slate-500" /> Channel Config
                    </button>
                    <button
                      onClick={() => handleAction('git-checkout-modal')}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                    >
                      <GitBranch className="h-4 w-4 text-slate-500" /> Switch Branch...
                    </button>
                    <button
                      onClick={() => handleAction('open-env-settings', { initialMode: 'edit' })}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                    >
                      <Database className="h-4 w-4 text-slate-500" /> Environment...
                    </button>
                    {(status === 'starting' || status === 'error' || (status as any) === 'waiting-for-dependencies') && (
                      <button
                        onClick={() => handleAction('mark-service-ready')}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-green-400 hover:bg-green-950/40 hover:text-green-300 transition-all font-bold"
                      >
                        <Check className="h-4 w-4 text-green-500" /> Mark as Ready
                      </button>
                    )}
                    <button
                      onClick={() => handleAction('archive')}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-amber-400 transition-all"
                    >
                      <Archive className="h-4 w-4 text-slate-500 group-hover:text-amber-400" />{' '}
                      Archive Channel
                    </button>
                    <div className="border-t border-slate-800/80 my-1"></div>
                    <div className="px-3 py-2 text-[10px] font-black text-cyan-500/60 uppercase tracking-widest bg-slate-950/40">
                      NPM Utility
                    </div>
                    <button
                      onClick={() => handleAction('npm-install')}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                    >
                      <Download className="h-4 w-4 text-slate-500" /> Install
                    </button>
                    <button
                      onClick={() => handleAction('npm-install-legacy')}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                    >
                      <Settings className="h-4 w-4 text-slate-500" /> Legacy Install
                    </button>
                    <button
                      onClick={() => handleAction('npm-start-prod')}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                    >
                      <Play className="h-4 w-4 text-slate-500" /> Production Start
                    </button>

                    {gitStatus?.hasLocalChanges && (
                      <>
                        <div className="border-t border-slate-800/80 my-1"></div>
                        <button
                          onClick={() => handleAction('git-liaison')}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-purple-400 hover:bg-purple-900/20 hover:text-purple-300 transition-all font-bold"
                        >
                          <Sparkles className="h-4 w-4 text-purple-500" /> AI Git Liaison
                        </button>
                      </>
                    )}
                    <div className="border-t border-slate-800/80 my-1"></div>
                    <button
                      onClick={() => handleAction('take-snapshot')}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-cyan-400 hover:bg-cyan-950/40 hover:text-cyan-300 transition-all font-bold"
                    >
                      <Camera className="h-4 w-4 text-cyan-500" /> Take Snapshot
                    </button>
                  </div>
                </div>,
                document.body
              )}
          </div>
        </div>

        {/* Action Panel: Instrument Style */}
        <div className="grid grid-cols-4 gap-2 bg-slate-950/40 p-1 rounded-xl border border-slate-800/50 shadow-inner">
          <button
            onClick={() => onToggle(path, 'log')}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg bg-slate-800/20 text-slate-500 hover:bg-slate-700/40 hover:text-white transition-all border border-transparent hover:border-slate-700/50 group"
          >
            <FileText className="h-4 w-4 group-hover:text-cyan-400 transition-colors" />
            <span className="text-[9px] font-black uppercase tracking-widest">Logs</span>
          </button>
          <button
            onClick={() => setShowTrends(!showTrends)}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg transition-all border group",
              showTrends 
                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                : "bg-slate-800/20 text-slate-500 hover:bg-slate-700/40 hover:text-white border-transparent hover:border-slate-700/50"
            )}
          >
            <TrendingUp className={cn("h-4 w-4 transition-colors", showTrends ? "text-cyan-400" : "group-hover:text-cyan-400")} />
            <span className="text-[9px] font-black uppercase tracking-widest">Trends</span>
          </button>
          <button
            onClick={() => handleAction('npm-build')}
            disabled={actionLoading === 'npm-build' || status === 'building'}
            className={cn(
              'flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg transition-all border group',
              status === 'build-error'
                ? 'bg-red-500/10 text-red-500 border-red-500/40 hover:bg-red-500/20'
                : 'bg-slate-800/20 text-slate-500 hover:bg-slate-700/40 hover:text-white border-transparent hover:border-slate-700/50'
            )}
          >
            {status === 'building' ? (
              <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
            ) : (
              <Wrench className="h-4 w-4 group-hover:text-cyan-400 transition-colors" />
            )}
            <span className="text-[9px] font-black uppercase tracking-widest">Build</span>
          </button>
          <button
            onClick={() => onOpenIde(path)}
            disabled={isIdeLoading}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg bg-slate-800/20 text-slate-500 hover:bg-slate-700/40 hover:text-white transition-all border border-transparent hover:border-slate-700/50 group"
          >
            {isIdeLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
            ) : (
              <Code className="h-4 w-4 group-hover:text-cyan-400 transition-colors" />
            )}
            <span className="text-[9px] font-black uppercase tracking-widest">IDE</span>
          </button>
        </div>

        {/* Vantage Insights Section */}
        {insights.length > 0 && !showTrends && (
          <div className="space-y-2 mt-4">
            <h4 className="text-[10px] font-black text-cyan-500/60 uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="h-3 w-3" /> Vantage Insights
            </h4>
            <div className="space-y-1.5">
              {insights.map((insight, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-2 p-2 rounded-lg bg-cyan-950/20 border border-cyan-500/10 text-[10px] text-slate-300 font-bold italic"
                >
                  <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-cyan-500 shadow-[0_0_4px_cyan]" />
                  {insight.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trends Visualization */}
        {showTrends && (
          <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
             <div className="space-y-1.5">
               <div className="flex justify-between items-center px-1">
                 <span className="text-[10px] font-black text-cyan-500/60 uppercase tracking-widest flex items-center gap-2">
                   <Activity className="h-3 w-3" /> CPU Utilization
                 </span>
                 <span className="text-[10px] font-mono text-cyan-400">{stats?.cpu || 0}%</span>
               </div>
               <div className="h-12 w-full rounded-lg bg-slate-950/40 border border-slate-800/50 p-1 overflow-hidden">
                 <Sparkline data={(stats as any)?.history?.cpu || []} color="#06b6d4" />
               </div>
             </div>

             <div className="space-y-1.5">
               <div className="flex justify-between items-center px-1">
                 <span className="text-[10px] font-black text-purple-500/60 uppercase tracking-widest flex items-center gap-2">
                   <LineChart className="h-3 w-3" /> Memory Usage
                 </span>
                 <span className="text-[10px] font-mono text-purple-400">{stats?.memory || 0}MB</span>
               </div>
               <div className="h-12 w-full rounded-lg bg-slate-950/40 border border-slate-800/50 p-1 overflow-hidden">
                 <Sparkline data={(stats as any)?.history?.memory || []} color="#a855f7" />
               </div>
             </div>
          </div>
        )}

        {/* Body Content */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[11px] mt-2 bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 text-slate-400 group-hover:border-cyan-500/40 transition-all shadow-inner">
            <span className="opacity-70 flex items-center gap-2 font-bold uppercase tracking-tighter">
              <FolderOpen className="h-3.5 w-3.5 text-cyan-500" /> Location
            </span>
            <button
              onClick={handleCopyPath}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono transition-all text-[10px]"
            >
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy Path'}
            </button>
          </div>

          {port && (
            <div className="flex items-center justify-between text-sm shrink-0">
              <span className="text-slate-500">Network URL</span>
              <a
                href={`http://localhost:${port}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
              >
                localhost:{port}
              </a>
            </div>
          )}

          {gitBranch && (
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => handleAction('git-checkout-modal')}
                className="flex items-center gap-2 text-[11px] text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 rounded-lg border border-cyan-500/20 font-mono truncate max-w-[180px] transition-all cursor-pointer text-left"
                title="Switch Branch"
              >
                <GitBranch className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="truncate">{gitBranch}</span>
                {gitStatus?.hasLocalChanges && (
                  <span
                    className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse ml-1"
                    title="Local Changes"
                  />
                )}
              </button>

              {gitStatus && (gitStatus.ahead > 0 || gitStatus.behind > 0) && (
                <div className="flex items-center gap-1.5">
                  {gitStatus.ahead > 0 && (
                    <div
                      className="flex items-center gap-0.5 text-[10px] font-bold text-green-500 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(34,197,94,0.1)]"
                      title={`${gitStatus.ahead} ahead`}
                    >
                      <ArrowUp className="h-2.5 w-2.5" />
                      {gitStatus.ahead}
                    </div>
                  )}
                  {gitStatus.behind > 0 && (
                    <div
                      className="flex items-center gap-0.5 text-[10px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(239,68,68,0.1)]"
                      title={`${gitStatus.behind} behind`}
                    >
                      <ArrowDown className="h-2.5 w-2.5" />
                      {gitStatus.behind}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => handleAction('git-pull')}
                disabled={actionLoading === 'git-pull'}
                className="flex h-8 w-8 items-center justify-center rounded bg-slate-800/40 text-slate-400 hover:bg-slate-700/60 hover:text-cyan-400 transition-all border border-slate-700/50 ml-auto shrink-0"
                title="Pull Latest"
              >
                <RefreshCw
                  className={cn('h-4 w-4', actionLoading === 'git-pull' && 'animate-spin')}
                />
              </button>
            </div>
          )}

          {/* Custom Shortcut Buttons */}
          {customButtons &&
            customButtons.length > 0 &&
            customButtons.some((b) => b.name && b.command) && (
              <div className="flex flex-wrap gap-2 mt-2 pt-4 border-t border-slate-800/30">
                {customButtons.map((btn, idx) => {
                  if (!btn.name || !btn.command) return null
                  return (
                    <button
                      key={idx}
                      onClick={() =>
                        handleAction('custom-command', { command: btn.command, name: btn.name })
                      }
                      disabled={actionLoading === 'custom-command'}
                      style={{
                        backgroundColor: `${btn.color}15`,
                        borderColor: `${btn.color}30`,
                        color: btn.color
                      }}
                      className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[10px] font-black transition-all border hover:bg-opacity-20 cursor-pointer"
                    >
                      <Code className="h-3 w-3" />
                      {btn.name.toUpperCase()}
                    </button>
                  )
                })}
              </div>
            )}

          <div className="mt-5 pt-4 border-t border-slate-800/50 space-y-4">
            {/* Performance Radar Section - Now Full Width & Dedicated */}
            {stats && isServiceActive && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full flex flex-col gap-2 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 shadow-inner group/perf"
              >
                <div className="flex items-center justify-between px-1 gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-fit">
                    <div
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        isAnomaly
                          ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                          : 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]'
                      )}
                    />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em]">
                      Telemetry
                    </span>
                  </div>
                  <div className="flex items-center gap-3 ml-auto">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end leading-[0.8] shrink-0">
                        <span className="text-[7px] font-bold text-slate-600 uppercase">CPU</span>
                        <span className="text-[7px] font-bold text-slate-600 uppercase">Load</span>
                      </div>
                      <span
                        className={cn(
                          'text-[11px] font-black font-mono shrink-0',
                          stats.cpu > 80
                            ? 'text-red-400'
                            : stats.cpu > 50
                              ? 'text-yellow-400'
                              : 'text-cyan-400'
                        )}
                      >
                        {stats.cpu}%
                      </span>
                    </div>
                    <div className="w-px h-4 bg-slate-800/50 shrink-0" />
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end leading-[0.8] shrink-0">
                        <span className="text-[7px] font-bold text-slate-600 uppercase">Mem</span>
                        <span className="text-[7px] font-bold text-slate-600 uppercase">RSS</span>
                      </div>
                      <span
                        className={cn(
                          'text-[11px] font-black font-mono shrink-0',
                          stats.memory > 800
                            ? 'text-red-400'
                            : stats.memory > 500
                              ? 'text-yellow-400'
                              : 'text-cyan-400'
                        )}
                      >
                        {stats.memory}MB
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-1">
                  <div className="h-1.5 flex-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800/30">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(stats.cpu, 100)}%` }}
                      className={cn(
                        'h-full transition-all duration-700',
                        stats.cpu > 80
                          ? 'bg-gradient-to-r from-red-600 to-red-400'
                          : stats.cpu > 50
                            ? 'bg-gradient-to-r from-yellow-600 to-yellow-400'
                            : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
                      )}
                    />
                  </div>
                  <div className="h-1.5 flex-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800/30">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((stats.memory / 1024) * 100, 100)}%` }}
                      className={cn(
                        'h-full transition-all duration-700',
                        stats.memory > 800
                          ? 'bg-gradient-to-r from-red-600 to-red-400'
                          : stats.memory > 500
                            ? 'bg-gradient-to-r from-yellow-600 to-yellow-400'
                            : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex items-center gap-2 w-full">
              <button
                onClick={() => onToggle(path, isServiceActive ? 'stop' : 'start', 'dev')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all border',
                  isServiceActive && mode === 'dev'
                    ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                    : isServiceActive && mode === 'prod'
                      ? 'bg-slate-800/50 text-slate-600 border-transparent cursor-not-allowed opacity-40'
                      : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20'
                )}
                disabled={isServiceActive && mode === 'prod'}
              >
                {isServiceActive && mode === 'dev' ? (
                  <>
                    <Square className="h-3.5 w-3.5" /> Stop
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" /> Dev Mode
                  </>
                )}
              </button>

              <button
                onClick={() => onToggle(path, isServiceActive ? 'stop' : 'start', 'prod')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all border',
                  isServiceActive && mode === 'prod'
                    ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                    : (isServiceActive && mode === 'dev') || status === 'building'
                      ? 'bg-slate-800/50 text-slate-600 border-transparent cursor-not-allowed opacity-40'
                      : 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20'
                )}
                disabled={(isServiceActive && mode === 'dev') || status === 'building'}
              >
                {status === 'building' ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Building...
                  </>
                ) : isServiceActive && mode === 'prod' ? (
                  <>
                    <Square className="h-3.5 w-3.5" /> Stop
                  </>
                ) : (
                  <>
                    <Rocket className="h-3.5 w-3.5" /> Prod
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isLiaisonOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-purple-950/20">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-purple-400" />
                <span className="text-sm font-black text-white italic tracking-tight">
                  AI Git Liaison
                </span>
              </div>
              <button
                onClick={() => setIsLiaisonOpen(false)}
                className="text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {isLiaisonLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-4">
                  <RefreshCw className="h-8 w-8 text-purple-500 animate-spin" />
                  <p className="text-xs text-slate-500 font-mono italic animate-pulse tracking-widest text-center uppercase">
                    Analyzing Codebase Flux...
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-purple-500/60 uppercase tracking-widest">
                      Architectural Summary
                    </h4>
                    <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 text-sm text-slate-300 leading-relaxed font-bold italic">
                      {liaisonSummary}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-purple-500/60 uppercase tracking-widest">
                      Suggested Commit Logic
                    </h4>
                    <div className="group relative">
                      <code className="block bg-slate-950/80 rounded-xl p-4 border border-purple-500/20 text-sm text-purple-300 font-mono">
                        {suggestedCommit}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(suggestedCommit || '')
                          setCopied(true)
                          setTimeout(() => setCopied(false), 2000)
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-purple-500/10 text-purple-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-purple-500 hover:text-slate-950 cursor-pointer"
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsLiaisonOpen(false)}
                    className="w-full py-3 rounded-xl bg-purple-600 text-white text-xs font-black uppercase tracking-widest hover:bg-purple-500 transition-all shadow-lg shadow-purple-900/20 cursor-pointer"
                  >
                    Sync Context
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return <div className="w-full h-full bg-slate-900/50" />

  const max = Math.max(...data, 1)
  const min = 0
  const range = max - min

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * 100
      const y = 100 - ((val - min) / range) * 100
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className="drop-shadow-[0_0_4px_rgba(0,0,0,0.5)]"
      />
      <polygon
        fill={`url(#grad-${color.replace('#', '')})`}
        points={`0,100 ${points} 100,100`}
      />
    </svg>
  )
}
