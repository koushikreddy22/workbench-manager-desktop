import { ChildProcess, spawn } from 'child_process';

export class ProcessManager {
    private processes: Map<string, ChildProcess> = new Map();
    private logs: Map<string, string[]> = new Map();
    private status: Map<string, "stopped" | "starting" | "running" | "error"> = new Map();
    private modes: Map<string, "dev" | "prod" | null> = new Map();
    private MAX_LOG_LINES = 1000;

    private getStatusKey(servicePath: string) {
        return servicePath;
    }

    async startService(servicePath: string, command: string = 'npm run dev', customPort?: number, mode: "dev" | "prod" = "dev"): Promise<void> {
        const key = this.getStatusKey(servicePath);

        if (this.processes.has(key)) {
            console.log(`Service at ${servicePath} is already running.`);
            return;
        }

        this.status.set(key, "starting");
        this.addLog(key, `Starting service: ${command}`);

        const child = spawn(command, {
            cwd: servicePath,
            env: { ...process.env, ...(customPort ? { PORT: customPort.toString() } : {}) },
            stdio: 'pipe',
            shell: true 
        });

        this.processes.set(key, child);
        this.status.set(key, "running");
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
            this.status.set(key, code === 0 || code === null ? "stopped" : "error");
            this.modes.set(key, null); // Clear mode on close
        });

        child.on('error', (err) => {
            this.addLog(key, `Failed to start process: ${err.message}`);
            this.processes.delete(key);
            this.status.set(key, "error");
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

    async getServiceStatus(servicePath: string): Promise<{ status: "stopped" | "starting" | "running" | "error", mode: "dev" | "prod" | null }> {
        return {
            status: this.status.get(this.getStatusKey(servicePath)) || "stopped",
            mode: this.modes.get(this.getStatusKey(servicePath)) || null
        };
    }
}

export const processManager = new ProcessManager();
