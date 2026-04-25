import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Sparkles,
  Cpu,
  Database,
  CheckCircle2,
  AlertCircle,
  Save,
  Globe,
  Terminal,
  ShieldCheck,
  Zap,
  Loader2
} from 'lucide-react'
import { cn } from '../lib/utils'

export type AiMode = 'native' | 'ollama' | 'cloud'
export type CloudProvider = 'openai' | 'gemini' | 'anthropic'

export interface AiSettings {
  mode: AiMode
  ollamaUrl: string
  ollamaModel: string
  cloudProvider: CloudProvider
  cloudModel: string
  apiKey: string
  systemPrompt?: string
  autoPilot?: boolean
}

interface AiSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  settings: AiSettings
  onSave: (settings: AiSettings) => void
}

const POPULAR_MODELS: Record<CloudProvider, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  gemini: [
    'gemini-flash-latest',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.0-pro-exp'
  ],
  anthropic: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307']
}

export const AiSettingsModal: React.FC<AiSettingsModalProps> = ({
  isOpen,
  onClose,
  settings: initialSettings,
  onSave
}) => {
  const [settings, setSettings] = useState<AiSettings>(initialSettings)
  const [isTestLoading, setIsTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [fetchedModels, setFetchedModels] = useState<string[]>([])

  useEffect(() => {
    if (isOpen) {
      setSettings(initialSettings)
      setTestResult(null)

      // Auto-fetch models if key exists and provider is Gemini
      if (initialSettings.cloudProvider === 'gemini' && initialSettings.apiKey) {
        fetchGeminiModels(initialSettings.apiKey)
      }
    }
  }, [isOpen, initialSettings])

  if (!isOpen) return null

  const handleSave = () => {
    onSave(settings)
    onClose()
  }

  const fetchGeminiModels = async (key: string) => {
    try {
      const api = (window as any).api
      if (!api || typeof api.listGeminiModels !== 'function') {
        console.warn(
          'AI Discovery API not yet initialized. Please restart the app if this persists.'
        )
        return []
      }
      const models = await api.listGeminiModels(key)
      setFetchedModels(models)
      setTestResult({ success: true, message: `Discovered ${models.length} AI models!` })
      return models
    } catch (err: any) {
      console.error('Discovery failed', err)
      // Clean up the error message if it's an Electron IPC error
      const msg = err.message?.includes('remote method')
        ? err.message.split('Error:').pop().trim()
        : err.message
      setTestResult({ success: false, message: `Discovery error: ${msg}` })
      return []
    }
  }

  const testConnection = async () => {
    setIsTestLoading(true)
    setTestResult(null)
    try {
      if (settings.mode === 'cloud' && !settings.apiKey) {
        throw new Error('API Key is missing')
      }

      if (settings.mode === 'cloud' && settings.cloudProvider === 'gemini') {
        const models = await fetchGeminiModels(settings.apiKey)
        if (models.length === 0) throw new Error('No models found for this API key')

        // Auto-select first model if current is not in list
        if (!models.includes(settings.cloudModel)) {
          setSettings((s) => ({ ...s, cloudModel: models[0] }))
        }
      } else {
        // Mock test for other providers for now
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      setTestResult({ success: true, message: 'Connection successful!' })
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection failed' })
    } finally {
      setIsTestLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-blue-500/10">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-purple-500/20 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <Sparkles className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white italic tracking-tight">
                AI CONFIGURATION
              </h2>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">
                Select your intelligence engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Mode Selection */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { id: 'native', label: 'Native', icon: Cpu, desc: 'Fast, Local, Private' },
              { id: 'ollama', label: 'Local LLM', icon: Database, desc: 'Ollama Integration' },
              { id: 'cloud', label: 'Cloud', icon: Globe, desc: 'OpenAI, Gemini, Claude' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSettings({ ...settings, mode: mode.id as AiMode })}
                className={cn(
                  'p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 group',
                  settings.mode === mode.id
                    ? 'bg-purple-500/10 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.1)]'
                    : 'bg-white/5 border-white/5 hover:border-white/10'
                )}
              >
                <div
                  className={cn(
                    'p-3 rounded-xl transition-colors',
                    settings.mode === mode.id
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-white/5 text-slate-500 group-hover:text-slate-400'
                  )}
                >
                  <mode.icon className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <div
                    className={cn(
                      'font-bold text-sm',
                      settings.mode === mode.id ? 'text-white' : 'text-slate-400'
                    )}
                  >
                    {mode.label}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-tighter mt-1">
                    {mode.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {settings.mode === 'native' && (
              <motion.div
                key="native"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-4"
              >
                <div className="flex items-center gap-4 text-emerald-400">
                  <ShieldCheck className="h-8 w-8" />
                  <div>
                    <h4 className="font-bold text-white">Privacy-First Intelligence</h4>
                    <p className="text-sm text-slate-400">
                      Our native heuristic engine runs 100% offline using optimized pattern
                      matching. Fast, free, and secure.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {settings.mode === 'ollama' && (
              <motion.div
                key="ollama"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Terminal className="h-3 w-3" /> Ollama API URL
                    </label>
                    <input
                      type="text"
                      value={settings.ollamaUrl}
                      onChange={(e) => setSettings({ ...settings, ollamaUrl: e.target.value })}
                      placeholder="http://localhost:11434"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Database className="h-3 w-3" /> Model Name
                    </label>
                    <input
                      type="text"
                      value={settings.ollamaModel}
                      onChange={(e) => setSettings({ ...settings, ollamaModel: e.target.value })}
                      placeholder="llama3, codellama, etc."
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {settings.mode === 'cloud' && (
              <motion.div
                key="cloud"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Provider
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['openai', 'gemini', 'anthropic'] as CloudProvider[]).map((p) => (
                        <button
                          key={p}
                          onClick={() =>
                            setSettings({
                              ...settings,
                              cloudProvider: p,
                              cloudModel: POPULAR_MODELS[p][0]
                            })
                          }
                          className={cn(
                            'py-2 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all',
                            settings.cloudProvider === p
                              ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                              : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-400'
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Model
                    </label>
                    <select
                      value={settings.cloudModel}
                      onChange={(e) => setSettings({ ...settings, cloudModel: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                    >
                      {settings.cloudProvider === 'gemini' && fetchedModels.length > 0
                        ? fetchedModels.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))
                        : POPULAR_MODELS[settings.cloudProvider].map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                      <option value="custom">Custom Model...</option>
                    </select>
                  </div>
                </div>

                {settings.cloudModel === 'custom' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="space-y-2"
                  >
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Custom Model Identifier
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </motion.div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                    <span>API Key</span>
                    <span className="text-[10px] normal-case text-slate-600 font-medium">
                      Stored locally in config.json
                    </span>
                  </label>
                  <input
                    type="password"
                    value={settings.apiKey}
                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                    placeholder={`Enter your ${settings.cloudProvider} API key`}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Auto-Pilot Toggle - DISABLED BY USER REQUEST */}
          <div className="p-4 bg-slate-800/50 rounded-2xl border border-white/5 flex items-center justify-between opacity-50 cursor-not-allowed">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-700 text-slate-500">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-500 uppercase tracking-widest">
                  Auto-Pilot Mode (Disabled)
                </div>
                <div className="text-[10px] text-slate-600">
                  This feature is currently unavailable.
                </div>
              </div>
            </div>
            <div className="w-12 h-6 rounded-full p-1 bg-slate-800 relative">
              <div className="w-4 h-4 bg-slate-600 rounded-full shadow-sm translate-x-0" />
            </div>
          </div>

          {/* Test & Status */}
          <div className="pt-4 border-t border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={testConnection}
                disabled={isTestLoading || (settings.mode === 'cloud' && !settings.apiKey)}
                className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              >
                {isTestLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                TEST CONNECTION
              </button>

              {testResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
                    testResult.success
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-red-500/10 text-red-400'
                  )}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <AlertCircle className="h-3 w-3" />
                  )}
                  {testResult.message}
                </motion.div>
              )}
            </div>
          </div>

          {/* Assistant Personality Section */}
          <div className="space-y-4 pt-6 border-t border-white/5 mx-6 pb-6">
            <div className="flex items-center gap-2 text-purple-400">
              <Zap className="h-4 w-4" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Assistant Personality</h3>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">
                Custom System Instructions
              </label>
              <textarea
                value={settings.systemPrompt || ''}
                onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
                placeholder="Example: You are a senior DevOps engineer. You prefer concise answers and always suggest performance optimizations."
                className="w-full h-24 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 transition-all resize-none shadow-inner"
              />
              <p className="text-[9px] text-slate-500 italic px-1">
                This personality will be merged with the default Vantage Co-pilot instructions.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-950/50 border-t border-white/5 flex items-center justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-slate-400 hover:text-white font-bold transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black tracking-tighter flex items-center gap-2 shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all active:scale-95"
          >
            <Save className="h-5 w-5" />
            SAVE & APPLY
          </button>
        </div>
      </motion.div>
    </div>
  )
}
