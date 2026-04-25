import { useState, useEffect } from 'react'
import {
  X,
  Globe,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Github,
  Database,
  Loader2,
  Link
} from 'lucide-react'

interface Connection {
  id: string
  providerId: 'github' | 'oracle-vbs' | 'other'
  name: string
  username?: string
  avatarUrl?: string
  baseUrl?: string
}

interface GitPluginsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function GitPluginsModal({ isOpen, onClose }: GitPluginsModalProps) {
  const [connections, setConnections] = useState<Connection[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [providerType, setProviderType] = useState<'github' | 'oracle-vbs'>('github')
  const [newConn, setNewConn] = useState({ token: '', name: '', baseUrl: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadConnections()
    }
  }, [isOpen])

  const loadConnections = async () => {
    const data = await window.api.gitPluginGetConnections()
    setConnections(data || [])
  }

  const handleConnect = async () => {
    if (!newConn.token) {
      setError('Token is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await window.api.gitPluginConnect({
        providerId: providerType,
        token: newConn.token,
        name: newConn.name,
        baseUrl: newConn.baseUrl
      })

      if (result.success) {
        await loadConnections()
        setIsAdding(false)
        setNewConn({ token: '', name: '', baseUrl: '' })
      } else {
        setError(result.error || 'Failed to connect. Check your token.')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemove = async (id: string) => {
    await window.api.gitPluginRemoveConnection({ id })
    await loadConnections()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.1)]">
              <Link className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Git <span className="text-cyan-400">Plugins</span>
              </h2>
              <p className="text-slate-400 text-sm font-medium">
                Connect to GitHub, Oracle VBS, and more
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all border border-transparent hover:border-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {connections.length === 0 && !isAdding && (
            <div className="text-center py-12 bg-slate-800/20 rounded-2xl border border-dashed border-slate-700/50">
              <Globe className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">No plugins connected yet.</p>
              <button
                onClick={() => setIsAdding(true)}
                className="mt-4 text-cyan-400 hover:text-cyan-300 text-sm font-bold flex items-center gap-2 mx-auto"
              >
                <Plus className="h-4 w-4" /> Connect your first provider
              </button>
            </div>
          )}

          {connections.map((conn) => (
            <div
              key={conn.id}
              className="group relative flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl hover:bg-slate-800/50 transition-all hover:border-cyan-500/30"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-slate-700/50 flex items-center justify-center overflow-hidden">
                  {conn.avatarUrl ? (
                    <img src={conn.avatarUrl} className="w-full h-full object-cover" />
                  ) : conn.providerId === 'github' ? (
                    <Github className="h-5 w-5 text-white" />
                  ) : (
                    <Database className="h-5 w-5 text-orange-400" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-white flex items-center gap-2">
                    {conn.name}
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-widest ${conn.providerId === 'github' ? 'bg-slate-700 text-slate-300' : 'bg-orange-500/20 text-orange-400'}`}
                    >
                      {conn.providerId}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {conn.username ? `@${conn.username}` : conn.baseUrl || 'Connected'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleRemove(conn.id)}
                className="p-2 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {isAdding && (
            <div className="p-6 bg-slate-800/40 border-2 border-cyan-500/30 rounded-2xl space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex gap-2 p-1 bg-slate-900 rounded-xl mb-2">
                <button
                  onClick={() => setProviderType('github')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all ${providerType === 'github' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Github className="h-4 w-4" /> GitHub
                </button>
                <button
                  onClick={() => setProviderType('oracle-vbs')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all ${providerType === 'oracle-vbs' ? 'bg-orange-600/20 text-orange-400 shadow-lg border border-orange-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Database className="h-4 w-3.5" /> Oracle VBS
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase px-1">
                    Display Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={newConn.name}
                    onChange={(e) => setNewConn({ ...newConn, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-4 text-sm focus:border-cyan-500 outline-none transition-all"
                    placeholder="e.g. My GitHub Account"
                  />
                </div>

                {providerType === 'oracle-vbs' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase px-1">
                      Base URL
                    </label>
                    <input
                      type="text"
                      value={newConn.baseUrl}
                      onChange={(e) => setNewConn({ ...newConn, baseUrl: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-4 text-sm focus:border-cyan-500 outline-none transition-all"
                      placeholder="https://vbs.oraclecloud.com/..."
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase px-1">
                    Personal Access Token (PAT)
                  </label>
                  <input
                    type="password"
                    value={newConn.token}
                    onChange={(e) => setNewConn({ ...newConn, token: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-4 text-sm focus:border-cyan-500 outline-none transition-all font-mono"
                    placeholder="ghp_xxxxxxxxxxxx"
                  />
                  <p className="text-[10px] text-slate-500 px-1 italic">
                    Vantage stores this locally and securely for API access.
                  </p>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-bold bg-red-400/5 p-3 rounded-lg border border-red-400/20">
                  <AlertCircle className="h-4 w-4" /> {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-cyan-600/10 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {isLoading ? 'Connecting...' : 'Connect Provider'}
                </button>
                <button
                  onClick={() => {
                    setIsAdding(false)
                    setError(null)
                  }}
                  className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {!isAdding && (
          <div className="p-6 border-t border-slate-800 flex justify-between items-center bg-slate-900/50">
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all font-bold text-sm"
            >
              <Plus className="h-4 w-4" /> Add Provider
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-slate-400 hover:text-white transition-all font-bold text-sm"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
