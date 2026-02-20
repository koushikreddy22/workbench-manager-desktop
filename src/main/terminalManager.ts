import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { ipcMain } from 'electron';
import os from 'os';

class TerminalProcessManager {
    private terminals: Map<string, ChildProcessWithoutNullStreams> = new Map();

    init(mainWindow: Electron.BrowserWindow) {
        // Create Terminal
        ipcMain.handle('terminal-create', (_, { id, cwd }) => {
            if (this.terminals.has(id)) {
                return { success: true };
            }

            const shell = os.platform() === 'win32' ? 'cmd.exe' : 'bash';

            try {
                const childProcess = spawn(shell, [], {
                    cwd: cwd || process.env.USERPROFILE,
                    env: process.env as { [key: string]: string }
                });

                childProcess.stdout.on('data', (data) => {
                    if (!mainWindow.isDestroyed()) {
                        // Replace bare LFs with CRLFs for basic xterm rendering
                        const str = data.toString().replace(/\r?\n/g, '\r\n');
                        mainWindow.webContents.send(`terminal-output-${id}`, str);
                    }
                });

                childProcess.stderr.on('data', (data) => {
                    if (!mainWindow.isDestroyed()) {
                        const str = data.toString().replace(/\r?\n/g, '\r\n');
                        mainWindow.webContents.send(`terminal-output-${id}`, str);
                    }
                });

                childProcess.on('exit', () => {
                    this.terminals.delete(id);
                    if (!mainWindow.isDestroyed()) {
                        mainWindow.webContents.send(`terminal-exit-${id}`);
                    }
                });

                this.terminals.set(id, childProcess);

                // Trigger initial prompt
                childProcess.stdin.write('\r\n');

                return { success: true };
            } catch (error: any) {
                console.error("Failed to spawn terminal:", error);
                return { error: error.message };
            }
        });

        // Write to Terminal (stdin)
        ipcMain.on('terminal-input', (_, { id, data }) => {
            const childProcess = this.terminals.get(id);
            if (childProcess) {
                // If it's a carriage return without newline, add newline for cmd
                let input = data;
                if (input === '\r') input = '\r\n';

                childProcess.stdin.write(input);
            }
        });

        // Resize Terminal (No-op for basic child_process, handled by frontend xterm wrapping text)
        ipcMain.on('terminal-resize', () => {
            // Ignored when not using pty
        });

        // Close Terminal
        ipcMain.handle('terminal-close', (_, { id }) => {
            const childProcess = this.terminals.get(id);
            if (childProcess) {
                childProcess.kill();
                this.terminals.delete(id);
            }
            return { success: true };
        });
    }

    killAll() {
        for (const [_, childProcess] of this.terminals.entries()) {
            try {
                childProcess.kill();
            } catch (e) {
                // Ignore
            }
        }
        this.terminals.clear();
    }
}

export const terminalManager = new TerminalProcessManager();
