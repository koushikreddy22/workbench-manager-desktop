import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'

export interface GitProviderConnection {
  id: string
  providerId: 'github' | 'oracle-vbs' | 'other'
  name: string
  token: string
  username?: string
  avatarUrl?: string
  baseUrl?: string
}

export interface RemoteRepo {
  name: string
  fullName: string
  url: string
  description: string
  isPrivate: boolean
  updatedAt: string
}

const getSecretsPath = () => path.join(app.getPath('userData'), 'git-secrets.json')

export class GitPluginManager {
  private connections: GitProviderConnection[] = []

  constructor() {
    this.loadSecrets()
  }

  private loadSecrets() {
    const p = getSecretsPath()
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'))
        this.connections = data.connections || []
      } catch (e) {
        console.error('Failed to load git secrets:', e)
      }
    }
  }

  private saveSecrets() {
    const p = getSecretsPath()
    fs.writeFileSync(p, JSON.stringify({ connections: this.connections }, null, 2))
  }

  async connectGitHub(
    token: string,
    name: string
  ): Promise<{ success: boolean; error?: string; connection?: GitProviderConnection }> {
    try {
      const resp = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Vantage-Dashboard'
        }
      })

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}))
        throw new Error(errorData.message || `GitHub API error: ${resp.status}`)
      }

      const data = await resp.json()

      const connection: GitProviderConnection = {
        id: uuidv4(),
        providerId: 'github',
        name: name || data.login,
        token,
        username: data.login,
        avatarUrl: data.avatar_url
      }

      this.connections.push(connection)
      this.saveSecrets()
      return { success: true, connection }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  async connectOracleVBS(
    token: string,
    name: string,
    baseUrl: string
  ): Promise<{ success: boolean; error?: string; connection?: GitProviderConnection }> {
    try {
      const connection: GitProviderConnection = {
        id: uuidv4(),
        providerId: 'oracle-vbs',
        name: name || 'Oracle VBS',
        token,
        baseUrl
      }

      this.connections.push(connection)
      this.saveSecrets()
      return { success: true, connection }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  async listRepositories(connectionId: string): Promise<RemoteRepo[]> {
    const conn = this.connections.find((c) => c.id === connectionId)
    if (!conn) throw new Error('Connection not found')

    if (conn.providerId === 'github') {
      const resp = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
        headers: {
          Authorization: `token ${conn.token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Vantage-Dashboard'
        }
      })

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}))
        throw new Error(errorData.message || `GitHub API error: ${resp.status}`)
      }

      const data = await resp.json()

      return data.map((r: any) => ({
        name: r.name,
        fullName: r.full_name,
        url: r.clone_url,
        description: r.description,
        isPrivate: r.private,
        updatedAt: r.updated_at
      }))
    }

    if (conn.providerId === 'oracle-vbs' && conn.baseUrl) {
      const resp = await fetch(`${conn.baseUrl}/list-repos`, {
        headers: { Authorization: `Bearer ${conn.token}` }
      })

      if (!resp.ok) throw new Error(`Oracle VBS error: ${resp.status}`)

      return await resp.json()
    }

    return []
  }

  getConnections() {
    return this.connections.map(({ token, ...rest }) => rest)
  }

  removeConnection(id: string) {
    this.connections = this.connections.filter((c) => c.id !== id)
    this.saveSecrets()
    return { success: true }
  }
}

export const gitPluginManager = new GitPluginManager()
