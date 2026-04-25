import { ChildProcess, spawn } from 'child_process'
import pidusage from 'pidusage'

export interface ServiceStats {
  cpu: number
  memory: number
  elapsed: number
  history: { cpu: number[]; memory: number[] }
}

export class ProcessManager {
  private processes: Map<string, ChildProcess> = new Map()
  private logs: Map<string, string[]> = new Map()
  private logCallbacks: Map<string, ((line: string) => void)[]> = new Map()
  private status: Map<
    string,
    | 'stopped'
    | 'starting'
    | 'running'
    | 'error'
    | 'building'
    | 'installing'
    | 'build-error'
    | 'install-error'
    | 'ready'
    | 'waiting-for-dependencies'
  > = new Map()
  private modes: Map<string, 'dev' | 'prod' | null> = new Map()
  private stats: Map<string, ServiceStats> = new Map()
  private privateMemMap: Map<number, number> = new Map() // pid -> private memory bytes
  private MAX_LOG_LINES = 1000
  private statsInterval: NodeJS.Timeout | null = null
  private telemetryProcess: ChildProcess | null = null
  private gitData: Map<
    string,
    { branch: string; status: { ahead: number; behind: number; hasLocalChanges: boolean } }
  > = new Map()
  private gitPollingTimeout: NodeJS.Timeout | null = null
  private gitProcess: ChildProcess | null = null
  private currentWorkbenchPath: string | null = null
  private manualReadySignals: Set<string> = new Set()

  constructor() {
    this.startStatsPolling()
  }

  private startStatsPolling() {
    const poll = async () => {
      // Keep a lock to ensure we don't start multiple polls if the timer triggers weirdly
      if (this.statsInterval === null && this.telemetryProcess) return

      // 1. Fetch entire process map once per tick (Efficient O(N) operation)
      const globalProcessMap = await this.getSystemProcessMap()

      // Safety: If the map is completely empty, it means the check timed out or failed.
      // In this case, do NOT overwrite the existing stats with 0MB. Keep the previous reading.
      if (globalProcessMap.size === 0 && this.privateMemMap.size === 0) return

      for (const [key, child] of this.processes.entries()) {
        if (!child || !child.pid) continue

        try {
          const pids = this.getChildrenRecursive(child.pid, globalProcessMap)
          const statsMap = await this.getStatsResilient(pids)

          let totalCpu = 0
          let totalMem = 0
          let maxElapsed = 0

          for (const s of Object.values(statsMap) as any[]) {
            totalCpu += s.cpu
            if (s.elapsed > maxElapsed) maxElapsed = s.elapsed
            // We'll use the precise private memory from our PowerShell scan instead of pidusage's total working set
          }

          // Sum up private memory from our map for this specific tree
          for (const pid of pids) {
            totalMem += this.privateMemMap.get(pid) || 0
          }

          // 4. Update stats with safety rounding
          const current = this.stats.get(key)
          const newCpu = Math.round(totalCpu * 10) / 10
          const newMem = Math.round((totalMem / (1024 * 1024)) * 10) / 10
          
          const history = current?.history || { cpu: [], memory: [] }
          history.cpu.push(newCpu)
          history.memory.push(newMem)
          
          // Keep last 60 points
          if (history.cpu.length > 60) history.cpu.shift()
          if (history.memory.length > 60) history.memory.shift()

          this.stats.set(key, {
            cpu: newCpu,
            memory: newMem,
            elapsed: maxElapsed,
            history
          })
        } catch (e) {
          try {
            const s = await pidusage(child.pid)
            const current = this.stats.get(key)
            const newCpu = Math.round(s.cpu * 10) / 10
            const newMem = Math.round((s.memory / (1024 * 1024)) * 10) / 10
            
            const history = current?.history || { cpu: [], memory: [] }
            history.cpu.push(newCpu)
            history.memory.push(newMem)
            if (history.cpu.length > 60) history.cpu.shift()
            if (history.memory.length > 60) history.memory.shift()

            this.stats.set(key, {
              cpu: newCpu,
              memory: newMem,
              elapsed: s.elapsed,
              history
            })
          } catch (err) {}
        }
      }

      // Schedule the next poll to start 3 seconds AFTER this one finished.
      // This prevents "piling up" without prematurely killing a healthy poll.
      this.statsInterval = setTimeout(poll, 500)
    }

    // Initial trigger
    poll()
  }

  private async getSystemProcessMap(): Promise<Map<number, number[]>> {
    const map = new Map<number, number[]>()
    if (process.platform !== 'win32') return map

    try {
      // Optimization: Only fetch the 3 columns we need. This is significantly faster.
      const script =
        'Get-CimInstance Win32_Process -Property ProcessId, ParentProcessId, PrivatePageCount | Select-Object ProcessId, ParentProcessId, PrivatePageCount | ConvertTo-Csv -NoTypeInformation | Select-Object -Skip 1'

      return new Promise((resolve) => {
        const child = spawn(
          'powershell.exe',
          ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', script],
          {
            windowsHide: true
          }
        )
        this.telemetryProcess = child

        let output = ''
        child.stdout.on('data', (data) => (output += data.toString()))

        const timeout = setTimeout(() => {
          child.kill()
          resolve(map)
        }, 10000) // Increased to 10 second hard timeout for safety

        child.on('close', () => {
          clearTimeout(timeout)
          this.telemetryProcess = null // Clear reference
          this.privateMemMap.clear() // Fresh map for each scan
          output.split(/\r?\n/).forEach((line) => {
            // Strip quotes and split by comma
            const parts = line.replace(/"/g, '').trim().split(',')
            if (parts.length === 3) {
              const pid = Number(parts[0])
              const ppid = Number(parts[1])
              const mem = Number(parts[2])

              if (!isNaN(pid) && !isNaN(ppid)) {
                if (!map.has(ppid)) map.set(ppid, [])
                map.get(ppid)!.push(pid)
                if (!isNaN(mem)) this.privateMemMap.set(pid, mem)
              }
            }
          })
          resolve(map)
        })

        child.on('error', () => {
          clearTimeout(timeout)
          this.telemetryProcess = null // Clear reference
          resolve(map)
        })
      })
    } catch (e) {}
    return map
  }

  private getChildrenRecursive(ppid: number, map: Map<number, number[]>): number[] {
    const pids = [ppid]
    const children = map.get(ppid) || []
    for (const child of children) {
      pids.push(...this.getChildrenRecursive(child, map))
    }
    return Array.from(new Set(pids))
  }

  private async getStatsResilient(pids: number[]): Promise<Record<string, any>> {
    try {
      return await pidusage(pids)
    } catch (e) {
      // If batch fails (process died), get them individually
      const stats = {}
      await Promise.all(
        pids.map(async (pid) => {
          try {
            stats[pid] = await pidusage(pid)
          } catch (err) {}
        })
      )
      return stats
    }
  }

  private getStatusKey(servicePath: string) {
    return servicePath
  }

  async startService(
    servicePath: string,
    command: string = 'npm run dev',
    customPort?: number,
    mode: 'dev' | 'prod' | null = 'dev',
    specificStatus?: 'building' | 'installing' | 'starting'
  ): Promise<void> {
    const key = this.getStatusKey(servicePath)

    if (this.processes.has(key)) {
      console.log(`Service at ${servicePath} is already running.`)
      return
    }

    const initialStatus = specificStatus || 'starting'
    this.status.set(key, initialStatus)
    this.addLog(key, `Starting service: ${command}`)

    const child = spawn(command, {
      cwd: servicePath,
      env: { ...process.env, ...(customPort ? { PORT: customPort.toString() } : {}) },
      stdio: 'pipe',
      shell: true,
      windowsHide: true
    })

    this.processes.set(key, child)

    // If it's a specific one-off status like building/installing, keep it.
    // Otherwise, move to running for dev/prod servers.
    if (!specificStatus) {
      this.status.set(key, 'running')
    }

    this.modes.set(key, mode) // Set the mode here

    child.stdout?.on('data', (data) => {
      const lines = data
        .toString()
        .split('\n')
        .filter((l) => l.trim())
      lines.forEach((line) => this.addLog(key, line))
    })

    child.stderr?.on('data', (data) => {
      const lines = data
        .toString()
        .split('\n')
        .filter((l) => l.trim())
      lines.forEach((line) => this.addLog(key, `[ERROR] ${line}`))
    })

    child.on('close', (code) => {
      this.addLog(key, `Process exited with code ${code}`)
      this.processes.delete(key)
      this.stats.delete(key) // Clear stats on close

      if (code === 0 || code === null) {
        this.status.set(key, 'stopped')
      } else {
        const currentStatus = this.status.get(key)
        if (currentStatus === 'building') this.status.set(key, 'build-error')
        else if (currentStatus === 'installing') this.status.set(key, 'install-error')
        else this.status.set(key, 'error')
      }
      this.modes.set(key, null) // Clear mode on close
    })

    child.on('error', (err) => {
      this.addLog(key, `Failed to start process: ${err.message}`)
      this.processes.delete(key)
      this.stats.delete(key) // Clear stats on error

      const currentStatus = this.status.get(key)
      if (currentStatus === 'building') this.status.set(key, 'build-error')
      else if (currentStatus === 'installing') this.status.set(key, 'install-error')
      else this.status.set(key, 'error')

      this.modes.set(key, null) // Clear mode on error
    })
  }

  async stopService(servicePath: string, reason?: string): Promise<void> {
    const key = this.getStatusKey(servicePath)
    const child = this.processes.get(key)

    if (child && child.pid) {
      const pid = child.pid
      this.addLog(key, `Attempting to stop service...${reason ? ` (Reason: ${reason})` : ''}`)
      return new Promise((resolve) => {
        try {
          if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', pid.toString(), '/f', '/t'], { windowsHide: true })
          } else {
            // On Linux, we use process group kill to kill the child and its sub-processes
            spawn('pkill', ['-P', pid.toString()])
            child.kill('SIGTERM')
          }
          this.addLog(key, `Service stop signal sent.`)
        } catch (e: any) {
          this.addLog(key, `Error stopping service: ${e.message}`)
        }

        this.processes.delete(key)
        this.stats.delete(key) // Clear stats on stop
        this.status.set(key, 'stopped')
        this.modes.set(key, null) // Clear mode on stop
        resolve()
      })
    }
  }

  private addLog(key: string, message: string) {
    if (!this.logs.has(key)) {
      this.logs.set(key, [])
    }
    const serviceLogs = this.logs.get(key)!
    const logLine = `[${new Date().toISOString()}] ${message}`
    serviceLogs.push(logLine)

    if (serviceLogs.length > this.MAX_LOG_LINES) {
      serviceLogs.shift()
    }

    // Trigger any waiting callbacks for this log stream
    const callbacks = this.logCallbacks.get(key)
    if (callbacks) {
      callbacks.forEach((cb) => cb(message))
    }
  }

  async waitForLog(
    servicePath: string,
    pattern: string,
    timeoutMs: number = 120000,
    signal?: AbortSignal
  ): Promise<void> {
    const key = this.getStatusKey(servicePath)
    const regex = new RegExp(pattern)

    // Check if already manually signaled
    if (this.manualReadySignals.has(servicePath)) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const onAbort = () => {
        if (timeout) clearTimeout(timeout)
        this.removeLogCallback(key, callback)
        reject(new Error('Aborted'))
      }

      if (signal?.aborted) {
        return reject(new Error('Aborted'))
      }

      let timeout: NodeJS.Timeout | null = null
      if (timeoutMs > 0) {
        timeout = setTimeout(() => {
          this.removeLogCallback(key, callback)
          signal?.removeEventListener('abort', onAbort)
          reject(new Error(`Timeout waiting for log pattern: ${pattern}`))
        }, timeoutMs)
      }

      const callback = (line: string) => {
        if (regex.test(line) || this.manualReadySignals.has(servicePath)) {
          if (timeout) clearTimeout(timeout)
          this.removeLogCallback(key, callback)
          signal?.removeEventListener('abort', onAbort)
          resolve()
        }
      }

      signal?.addEventListener('abort', onAbort)

      if (!this.logCallbacks.has(key)) {
        this.logCallbacks.set(key, [])
      }
      this.logCallbacks.get(key)!.push(callback)
    })
  }

  markReady(servicePath: string) {
    this.manualReadySignals.add(servicePath)
    this.setStatus(servicePath, 'ready')
    
    // Trigger any pending log callbacks
    const key = this.getStatusKey(servicePath)
    const callbacks = this.logCallbacks.get(key)
    if (callbacks) {
      // Create a copy to avoid modification during iteration
      const currentCallbacks = [...callbacks]
      currentCallbacks.forEach(cb => cb('[VANTAGE] MANUAL READY SIGNAL'))
    }
    
    // We'll also need a way to clear this signal when starting fresh
    setTimeout(() => {
      this.manualReadySignals.delete(servicePath)
    }, 5000)
  }

  private removeLogCallback(key: string, callback: (line: string) => void) {
    const callbacks = this.logCallbacks.get(key)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  async isPortInUse(port: number): Promise<boolean> {
    // Primary check: PowerShell Get-NetTCPConnection (most reliable on Windows)
    if (process.platform === 'win32') {
      try {
        const script = `Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty State`
        return new Promise((resolve) => {
          const child = spawn('powershell.exe', [
            '-NoProfile',
            '-NonInteractive',
            '-WindowStyle', 'Hidden',
            '-Command', script
          ], {
            windowsHide: true
          })
          
          let output = ''
          child.stdout.on('data', (data) => output += data.toString())
          child.on('close', () => {
            resolve(output.trim().length > 0)
          })
          child.on('error', () => resolve(false))
          
          // Safety timeout
          setTimeout(() => {
            child.kill()
            resolve(false)
          }, 2000)
        })
      } catch (e) {
        // Fallback to net.listen
      }
    }

    return new Promise<boolean>((resolve) => {
      const net = require('net')
      // Try IPv6 first (dual stack often handles both)
      const server = net
        .createServer()
        .once('error', (err: any) => {
          if (err.code === 'EADDRINUSE') resolve(true)
          else resolve(false)
        })
        .once('listening', () => {
          server.close()
          resolve(false)
        })
        .listen(port, '::')
    }).catch(() => {
      // Final fallback to IPv4
      return new Promise((resolve) => {
        const net = require('net')
        const server = net
          .createServer()
          .once('error', (err: any) => {
            if (err.code === 'EADDRINUSE') resolve(true)
            else resolve(false)
          })
          .once('listening', () => {
            server.close()
            resolve(false)
          })
          .listen(port, '127.0.0.1')
      })
    })
  }

  injectOrchestrationLog(servicePath: string, message: string) {
    this.addLog(this.getStatusKey(servicePath), `\x1b[36m[VANTAGE ORCHESTRATOR]\x1b[0m ${message}`)
  }

  async waitForPort(port: number, timeoutMs: number = 600000, signal?: AbortSignal): Promise<void> {
    const start = Date.now()
    const net = require('net')

    return new Promise((resolve, reject) => {
      let timer: NodeJS.Timeout | null = null

      const cleanup = () => {
        if (timer) clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
      }

      const onAbort = () => {
        cleanup()
        reject(new Error('Aborted'))
      }

      if (signal?.aborted) return onAbort()
      signal?.addEventListener('abort', onAbort)

      const check = () => {
        if (timeoutMs > 0 && Date.now() - start > timeoutMs) {
          cleanup()
          reject(new Error(`Timeout waiting for port ${port}`))
          return
        }

        const socket = new net.Socket()
        socket.setTimeout(1000)

        socket.on('connect', () => {
          socket.destroy()
          cleanup()
          resolve()
        })

        socket.on('error', () => {
          socket.destroy()
          timer = setTimeout(check, 1000)
        })

        socket.on('timeout', () => {
          socket.destroy()
          timer = setTimeout(check, 1000)
        })

        socket.connect(port, '127.0.0.1')
      }

      check()
    })
  }
  setStatus(servicePath: string, status: any) {
    const key = this.getStatusKey(servicePath)
    this.status.set(key, status)
  }

  getLogs(servicePath: string): string[] {
    return this.logs.get(this.getStatusKey(servicePath)) || []
  }

  async getServiceStatus(servicePath: string): Promise<{
    status:
      | 'stopped'
      | 'starting'
      | 'running'
      | 'error'
      | 'building'
      | 'installing'
      | 'build-error'
      | 'install-error'
      | 'ready'
      | 'waiting-for-dependencies'
    mode: 'dev' | 'prod' | null
    stats?: ServiceStats
    gitBranch?: string
    gitStatus?: { ahead: number; behind: number; hasLocalChanges: boolean }
  }> {
    const gitInfo = this.gitData.get(servicePath)
    const stats = this.stats.get(this.getStatusKey(servicePath))
    return {
      status: this.status.get(this.getStatusKey(servicePath)) || 'stopped',
      mode: this.modes.get(this.getStatusKey(servicePath)) || null,
      stats: stats
        ? {
            cpu: stats.cpu,
            memory: stats.memory,
            elapsed: stats.elapsed,
            history: stats.history
          }
        : undefined,
      gitBranch: gitInfo?.branch,
      gitStatus: gitInfo?.status
    }
  }

  setWorkbenchPath(path: string) {
    if (this.currentWorkbenchPath === path) return
    this.currentWorkbenchPath = path
    this.startGitPolling()
  }

  private startGitPolling() {
    if (this.gitPollingTimeout) clearTimeout(this.gitPollingTimeout)

    const poll = async () => {
      if (!this.currentWorkbenchPath) return

      // Kill previous if still hanging
      if (this.gitProcess) {
        try {
          if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', this.gitProcess.pid!.toString(), '/f', '/t'], {
              windowsHide: true
            })
          } else {
            this.gitProcess.kill()
          }
        } catch (e) {}
        this.gitProcess = null
      }

      const script = `
                $workbenchPath = "${this.currentWorkbenchPath}"
                Get-ChildItem -Path $workbenchPath -Directory | ForEach-Object {
                    $repoPath = $_.FullName
                    if (Test-Path "$repoPath\\.git") {
                        try {
                            $branchInfo = git -C $repoPath status --branch --porcelain --ignore-submodules=all
                            if ($branchInfo) {
                                $lines = $branchInfo -split "\`n"
                                $branchLine = $lines[0]
                                $dirty = $lines.Length -gt 1
                                
                                $branch = ""
                                $ahead = 0
                                $behind = 0
                                
                                if ($branchLine -like "## *") {
                                    $core = $branchLine.Substring(3)
                                    if ($core -like "*...*") {
                                        $branch = $core.Split("...")[0]
                                        if ($core -match "ahead (\\d+)") { $ahead = $matches[1] }
                                        if ($core -match "behind (\\d+)") { $behind = $matches[1] }
                                    } else {
                                        $branch = $core.Trim()
                                    }
                                }
                                Write-Output "$repoPath|$branch|$ahead|$behind|$dirty"
                            }
                        } catch { }
                    }
                }
            `

      this.gitProcess = spawn(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', script],
        {
          windowsHide: true
        }
      )

      let output = ''
      this.gitProcess.stdout?.on('data', (data) => (output += data.toString()))

      this.gitProcess.on('close', () => {
        this.gitProcess = null

        // Parse results
        output.split(/\r?\n/).forEach((line) => {
          if (!line.trim()) return
          const parts = line.split('|')
          if (parts.length === 5) {
            const [p, branch, ahead, behind, dirty] = parts
            this.gitData.set(p, {
              branch: branch.trim(),
              status: {
                ahead: parseInt(ahead, 10) || 0,
                behind: parseInt(behind, 10) || 0,
                hasLocalChanges: dirty.trim().toLowerCase() === 'true'
              }
            })
          }
        })

        // Schedule next poll - 30 seconds
        this.gitPollingTimeout = setTimeout(poll, 30000)
      })

      this.gitProcess.on('error', () => {
        this.gitProcess = null
        this.gitPollingTimeout = setTimeout(poll, 30000)
      })
    }

    poll()
  }

  clearLogs(servicePath: string) {
    this.logs.set(this.getStatusKey(servicePath), [])
  }
}

export const processManager = new ProcessManager()
