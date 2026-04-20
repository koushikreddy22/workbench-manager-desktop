import { ChildProcess, spawn } from 'child_process';
import pidusage from 'pidusage';

export interface ServiceStats {
    cpu: number;
    memory: number;
    elapsed: number;
}

export class ProcessManager {
    private processes: Map<string, ChildProcess> = new Map();
    private logs: Map<string, string[]> = new Map();
    private status: Map<string, "stopped" | "starting" | "running" | "error" | "building" | "installing" | "build-error" | "install-error"> = new Map();
    private modes: Map<string, "dev" | "prod" | null> = new Map();
    private stats: Map<string, ServiceStats> = new Map();
    private MAX_LOG_LINES = 1000;
    private statsInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.startStatsPolling();
    }

    private startStatsPolling() {
        if (this.statsInterval) return;
        this.statsInterval = setInterval(async () => {
            for (const [key, child] of this.processes.entries()) {
                if (child && child.pid) {
                    try {
                        const stats = await pidusage(child.pid);
                        this.stats.set(key, {
                            cpu: Math.round(stats.cpu * 10) / 10,
                            memory: Math.round(stats.memory / (1024 * 1024) * 10) / 10, // MB
                            elapsed: stats.elapsed
                        });
                    } catch (e) {
                        // Process cleanup or if pidusage fails
                    }
                }
            }
        }, 3000);
    }

    private getStatusKey(servicePath: string) {
        return servicePath;
    }

    async startService(servicePath: string, command: string = 'npm run dev', customPort?: number, mode: "dev" | "prod" | null = "dev", specificStatus?: "building" | "installing"): Promise<void> {
        const key = this.getStatusKey(servicePath);

        if (this.processes.has(key)) {
            console.log(`Service at ${servicePath} is already running.`);
            return;
        }

        const initialStatus = specificStatus || "starting";
        this.status.set(key, initialStatus);
        this.addLog(key, `Starting service: ${command}`);

        const child = spawn(command, {
            cwd: servicePath,
            env: { ...process.env, ...(customPort ? { PORT: customPort.toString() } : {}) },
            stdio: 'pipe',
            shell: true 
        });

        this.processes.set(key, child);
        
        // If it's a specific one-off status like building/installing, keep it. 
        // Otherwise, move to running for dev/prod servers.
        if (!specificStatus) {
            this.status.set(key, "running");
        }
        
        this.modes.set(key, mode); // Set the mode here

        child.stdout?.on('data', (data) => {
            const lines = data.toString().split('\n').filter(l => l.trim());
            lines.forEach(line => this.addLog(key, line));
        });

        child.stderr?.on('data', (data) => {
            const lines = data.toString().split('\n').filter(l => l.trim());
            lines.forEach(line => this.addLog(key, `[ERROR] ${line}`));
        });

        child.on('close', (code) => {
            this.addLog(key, `Process exited with code ${code}`);
            this.processes.delete(key);
            this.stats.delete(key); // Clear stats on close
            
            if (code === 0 || code === null) {
                this.status.set(key, "stopped");
            } else {
                const currentStatus = this.status.get(key);
                if (currentStatus === "building") this.status.set(key, "build-error");
                else if (currentStatus === "installing") this.status.set(key, "install-error");
                else this.status.set(key, "error");
            }
            this.modes.set(key, null); // Clear mode on close
        });

        child.on('error', (err) => {
            this.addLog(key, `Failed to start process: ${err.message}`);
            this.processes.delete(key);
            this.stats.delete(key); // Clear stats on error
            
            const currentStatus = this.status.get(key);
            if (currentStatus === "building") this.status.set(key, "build-error");
            else if (currentStatus === "installing") this.status.set(key, "install-error");
            else this.status.set(key, "error");
            
            this.modes.set(key, null); // Clear mode on error
        });
    }

    async stopService(servicePath: string): Promise<void> {
        const key = this.getStatusKey(servicePath);
        const child = this.processes.get(key);

        if (child && child.pid) {
            const pid = child.pid;
            this.addLog(key, `Attempting to stop service...`);
            return new Promise((resolve) => {
                try {
                    if (process.platform === 'win32') {
                        spawn('taskkill', ['/pid', pid.toString(), '/f', '/t']);
                    } else {
                        // On Linux, we use process group kill to kill the child and its sub-processes
                        spawn('pkill', ['-P', pid.toString()]);
                        child.kill('SIGTERM');
                    }
                    this.addLog(key, `Service stop signal sent.`);
                } catch (e: any) {
                    this.addLog(key, `Error stopping service: ${e.message}`);
                }

                this.processes.delete(key);
                this.stats.delete(key); // Clear stats on stop
                this.status.set(key, "stopped");
                this.modes.set(key, null); // Clear mode on stop
                resolve();
            });
        }
    }

    private addLog(key: string, message: string) {
        if (!this.logs.has(key)) {
            this.logs.set(key, []);
        }
        const serviceLogs = this.logs.get(key)!;
        serviceLogs.push(`[${new Date().toISOString()}] ${message}`);

        if (serviceLogs.length > this.MAX_LOG_LINES) {
            serviceLogs.shift();
        }
    }

    getLogs(servicePath: string): string[] {
        return this.logs.get(this.getStatusKey(servicePath)) || [];
    }

    async getServiceStatus(servicePath: string): Promise<{ status: "stopped" | "starting" | "running" | "error" | "building" | "installing" | "build-error" | "install-error", mode: "dev" | "prod" | null, stats?: ServiceStats }> {
        return {
            status: this.status.get(this.getStatusKey(servicePath)) || "stopped",
            mode: this.modes.get(this.getStatusKey(servicePath)) || null,
            stats: this.stats.get(this.getStatusKey(servicePath))
        };
    }

    clearLogs(servicePath: string) {
        this.logs.set(this.getStatusKey(servicePath), []);
    }
}

export const processManager = new ProcessManager();
