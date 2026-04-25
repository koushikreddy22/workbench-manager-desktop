import { useState, useEffect } from 'react'
import { X, User, Mail, Shield, Plus, Trash2, Check, AlertCircle } from 'lucide-react'

interface GitProfile {
  id: string
  name: string
  email: string
  description: string
}

interface GitProfilesModalProps {
  isOpen: boolean
  onClose: () => void
}

export function GitProfilesModal({ isOpen, onClose }: GitProfilesModalProps) {
  const [profiles, setProfiles] = useState<GitProfile[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [newProfile, setNewProfile] = useState<Partial<GitProfile>>({
    name: '',
    email: '',
    description: ''
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadProfiles()
    }
  }, [isOpen])

  const loadProfiles = async () => {
    const data = await window.api.getGitProfiles()
    setProfiles(data.profiles || [])
  }

  const handleSaveProfile = async () => {
    if (!newProfile.name || !newProfile.email) {
      setError('Name and Email are required')
      return
    }

    const profile: GitProfile = {
      id: crypto.randomUUID(),
      name: newProfile.name,
      email: newProfile.email,
      description: newProfile.description || 'Dev Profile'
    }

    const updatedProfiles = [...profiles, profile]
    await window.api.saveGitProfiles({ profiles: updatedProfiles })
    setProfiles(updatedProfiles)
    setIsAdding(false)
    setNewProfile({ name: '', email: '', description: '' })
    setError(null)
  }

  const handleDeleteProfile = async (id: string) => {
    const updatedProfiles = profiles.filter((p) => p.id !== id)
    await window.api.saveGitProfiles({ profiles: updatedProfiles })
    setProfiles(updatedProfiles)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.1)]">
              <Shield className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Git <span className="text-orange-400">Profiles</span>
              </h2>
              <p className="text-slate-400 text-sm font-medium">
                Manage your multiple Git identities
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

        {/* Profiles List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {profiles.length === 0 && !isAdding && (
            <div className="text-center py-12 bg-slate-800/20 rounded-2xl border border-dashed border-slate-700/50">
              <User className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">No profiles saved yet.</p>
              <button
                onClick={() => setIsAdding(true)}
                className="mt-4 text-orange-400 hover:text-orange-300 text-sm font-bold flex items-center gap-2 mx-auto"
              >
                <Plus className="h-4 w-4" /> Add your first identity
              </button>
            </div>
          )}

          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="group relative flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl hover:bg-slate-800/50 transition-all hover:border-orange-500/30"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 font-black text-lg">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-white flex items-center gap-2">
                    {profile.name}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 uppercase tracking-widest">
                      {profile.description}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3 w-3" /> {profile.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDeleteProfile(profile.id)}
                className="p-2 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {isAdding && (
            <div className="p-6 bg-slate-800/40 border-2 border-orange-500/30 rounded-2xl space-y-4 animate-in zoom-in-95 duration-200">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase px-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      value={newProfile.name}
                      onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-orange-500 outline-none transition-all"
                      placeholder="e.g. Koushik Reddy"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase px-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      value={newProfile.email}
                      onChange={(e) => setNewProfile({ ...newProfile, email: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-orange-500 outline-none transition-all"
                      placeholder="user@example.com"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase px-1">
                  Brief Description
                </label>
                <input
                  type="text"
                  value={newProfile.description}
                  onChange={(e) => setNewProfile({ ...newProfile, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-4 text-sm focus:border-orange-500 outline-none transition-all"
                  placeholder="e.g. Work Identity, Personal Github..."
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-bold bg-red-400/5 p-3 rounded-lg border border-red-400/20">
                  <AlertCircle className="h-4 w-4" /> {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveProfile}
                  className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-orange-600/10 flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4" /> Save Identity
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

        {/* Footer */}
        {!isAdding && (
          <div className="p-6 border-t border-slate-800 flex justify-between items-center bg-slate-900/50">
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-all font-bold text-sm"
            >
              <Plus className="h-4 w-4" /> Add Profile
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
