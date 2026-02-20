import { ipcMain, dialog, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { spawn, exec } from 'child_process';
import util from 'util';
import os from 'os';
import { processManager } from './processManager';

const execAsync = util.promisify(exec);

export function setupIpcHandlers() {

    // Config Handlers
    ipcMain.handle('select-workbench', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: 'Select Workbench Directory'
        });
        if (!result.canceled && result.filePaths.length > 0) {
            // Save to config (Merging)
            const configPath = path.join(app.getPath('userData'), 'config.json');
            let config: any = {};
            if (fs.existsSync(configPath)) {
                try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) { }
            }
            config.workbenchPath = result.filePaths[0];
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            return result.filePaths[0];
        }
        return null;
    });

    ipcMain.handle('get-config', () => {
        const configPath = path.join(app.getPath('userData'), 'config.json');
        if (fs.existsSync(configPath)) {
            try {
                return JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } catch (e) { return {}; }
        }
        return {};
    });

    ipcMain.handle('update-config', (_, newConfig: any) => {
        const configPath = path.join(app.getPath('userData'), 'config.json');
        let config: any = {};
        if (fs.existsSync(configPath)) {
            try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) { }
        }
        config = { ...config, ...newConfig };
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return config;
    });

    // Services
    ipcMain.handle('get-services', async (_, workbenchPath: string) => {
        if (!workbenchPath || !fs.existsSync(workbenchPath)) return { services: [] };

        const entries = fs.readdirSync(workbenchPath, { withFileTypes: true });

        const services = await Promise.all(entries
            .filter(entry => entry.isDirectory() && entry.name !== 'service-dashboard' && entry.name !== 'service-dashboard-desktop' && !entry.name.startsWith('.'))
            .map(async entry => {
                const fullPath = path.join(workbenchPath, entry.name);
                const packageJsonPath = path.join(fullPath, 'package.json');

                if (fs.existsSync(packageJsonPath)) {
                    let detectedPort: number | undefined;
                    try {
                        const pkgContent = fs.readFileSync(packageJsonPath, 'utf-8');
                        const pkg = JSON.parse(pkgContent);
                        const devScript = pkg.scripts?.dev || '';
                        const portMatch = devScript.match(/-p\s+(\d+)/);
                        if (portMatch) detectedPort = parseInt(portMatch[1], 10);

                        if (!detectedPort) {
                            const envPath = path.join(fullPath, '.env');
                            if (fs.existsSync(envPath)) {
                                const envContent = fs.readFileSync(envPath, 'utf-8');
                                const envPortMatch = envContent.match(/^PORT\s*=\s*(\d+)/m);
                                if (envPortMatch) detectedPort = parseInt(envPortMatch[1], 10);
                            }
                        }
                    } catch (e) { }

                    let gitBranch, gitStatus;
                    try {
                        const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: fullPath });
                        gitBranch = stdout.trim();

                        // Detect local changes
                        const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: fullPath });
                        const hasLocalChanges = statusOutput.trim().length > 0;

                        // Detect ahead/behind
                        let ahead = 0, behind = 0;
                        try {
                            // Fetching in the background might be too slow for get-services, 
                            // so we rely on the last fetched state.
                            const { stdout: countOutput } = await execAsync('git rev-list --left-right --count HEAD...@{u}', { cwd: fullPath });
                            const parts = countOutput.trim().split(/\s+/);
                            if (parts.length === 2) { 
                                ahead = parseInt(parts[0], 10); 
                                behind = parseInt(parts[1], 10); 
                            }
                        } catch (e) {
                            // Upstream might not be set, ignore
                        }
                        
                        gitStatus = { hasLocalChanges, ahead, behind };
                    } catch (e) { }

                    const serviceStatus = await processManager.getServiceStatus(fullPath);
                    return {
                        name: entry.name,
                        path: fullPath,
                        status: serviceStatus.status,
                        mode: serviceStatus.mode,
                        port: detectedPort,
                        gitBranch,
                        gitStatus
                    };
                }
                return null;
            })
        );
        return { services: services.filter(Boolean) };
    });

    // Control
    ipcMain.handle('control-service', async (_, { path: servicePath, action, port, mode }) => {
        if (action === 'start') {
            const command = mode === 'prod' ? 'npm start' : 'npm run dev';
            await processManager.startService(servicePath, command, port, mode || 'dev');
        } else if (action === 'stop') {
            await processManager.stopService(servicePath);
        }
        return { success: true };
    });

    ipcMain.handle('get-logs', (_, { path: servicePath }) => {
        return { logs: processManager.getLogs(servicePath) };
    });

    // Groups
    const getGroupsPath = () => path.join(app.getPath('userData'), 'localDB.json');
    ipcMain.handle('get-groups', () => {
        const p = getGroupsPath();
        if (fs.existsSync(p)) return { groups: JSON.parse(fs.readFileSync(p, 'utf8')) };
        return { groups: [] };
    });

    ipcMain.handle('save-groups', (_, { action, group, id }) => {
        const p = getGroupsPath();
        let groups: any[] = [];
        if (fs.existsSync(p)) groups = JSON.parse(fs.readFileSync(p, 'utf8'));

        if (action === 'create') {
            const index = groups.findIndex((g: any) => g.id === group.id);
            if (index >= 0) groups[index] = group;
            else groups.push(group);
        } else if (action === 'delete') {
            groups = groups.filter((g: any) => g.id !== id);
        }
        fs.writeFileSync(p, JSON.stringify(groups, null, 2));
        return { success: true };
    });

    // Git
    ipcMain.handle('git-command', async (_, { action, path: repoPath, branch }) => {
        try {
            if (action === 'checkout') await execAsync(`git checkout ${branch}`, { cwd: repoPath });
            else if (action === 'pull') await execAsync('git pull', { cwd: repoPath });
            else if (action === 'get-branches') {
                const { stdout } = await execAsync('git branch -a', { cwd: repoPath });
                const branches = stdout.split('\n')
                    .map(b => b.trim().replace('* ', '').replace('remotes/origin/', ''))
                    .filter(b => b && !b.includes('HEAD'));
                return { branches: Array.from(new Set(branches)) };
            }
            return { success: true };
        } catch (e: any) {
            return { error: e.message };
        }
    });

    // Command (npm)
    ipcMain.handle('npm-command', async (_, { action, path: servicePath }) => {
        let cmd = '';
        switch (action) {
            case 'install': cmd = 'npm install'; break;
            case 'install-legacy': cmd = 'npm install --legacy-peer-deps'; break;
            case 'build': cmd = 'npm run build'; break;
            case 'start-prod': cmd = 'npm start'; break;
        }
        if (cmd) {
            await processManager.startService(servicePath, cmd);
        }
        return { success: true };
    });

    // Native Terminal
    ipcMain.handle('open-terminal', (_, cwd: string) => {
        const osPlatform = os.platform();
        if (osPlatform === 'win32') {
            spawn('cmd.exe', ['/c', 'start', 'cmd.exe'], { cwd, detached: true, stdio: 'ignore' }).unref();
        } else if (osPlatform === 'darwin') {
            spawn('open', ['-a', 'Terminal', cwd], { detached: true, stdio: 'ignore' }).unref();
        } else {
            // Linux: Try x-terminal-emulator or gnome-terminal
            const termCmd = fs.existsSync('/usr/bin/x-terminal-emulator') ? 'x-terminal-emulator' : 'gnome-terminal';
            const args = termCmd === 'gnome-terminal' ? ['--working-directory', cwd] : [];
            spawn(termCmd, args, { cwd, detached: true, stdio: 'ignore' }).unref();
        }
        return { success: true };
    });

    // IDE Integration
    ipcMain.handle('open-ide', (_, { path: servicePath, ide }) => {
        let cmd = '';
        // Map IDE keys to CLI commands
        switch (ide) {
            case 'vscode': cmd = 'code'; break;
            case 'webstorm': cmd = 'webstorm'; break;
            case 'cursor': cmd = 'cursor'; break;
            case 'antigravity': cmd = 'antigravity'; break;
            case 'windsurf': cmd = 'windsurf'; break;
            case 'trae': cmd = 'trae'; break;
            case 'zed': cmd = 'zed'; break;
            case 'sublime': cmd = 'subl'; break;
            case 'atom': cmd = 'atom'; break;
        }

        if (cmd) {
            const isWin = os.platform() === 'win32';
            if (isWin) {
                // Highly reliable for Windows: use exec but pass cwd as an option.
                // This avoids shell quoting issues for the path itself.
                exec(`${cmd} .`, { cwd: servicePath }, (error) => {
                    if (error) console.error(`IDE Launch Error: ${error.message}`);
                });
            } else {
                spawn(cmd, ['.'], { 
                    cwd: servicePath,
                    detached: true, 
                    stdio: 'ignore'
                }).unref();
            }
        }
        return { success: true };
    });

    ipcMain.handle('check-ides', async () => {
        const ides = [
            { id: 'vscode', cmd: 'code', name: 'VS Code' },
            { id: 'antigravity', cmd: 'antigravity', name: 'Antigravity' },
            { id: 'cursor', cmd: 'cursor', name: 'Cursor' },
            { id: 'windsurf', cmd: 'windsurf', name: 'Windsurf' },
            { id: 'trae', cmd: 'trae', name: 'Trae' },
            { id: 'zed', cmd: 'zed', name: 'Zed' },
            { id: 'webstorm', cmd: 'webstorm', name: 'WebStorm' },
            { id: 'sublime', cmd: 'subl', name: 'Sublime' },
            { id: 'atom', cmd: 'atom', name: 'Atom' }
        ];

        const available = await Promise.all(ides.map(async (ide) => {
            try {
                const checkCmd = os.platform() === 'win32' ? `where ${ide.cmd}` : `which ${ide.cmd}`;
                await execAsync(checkCmd);
                return ide;
            } catch (e) {
                return null;
            }
        }));

        return available.filter(Boolean);
    });
}
