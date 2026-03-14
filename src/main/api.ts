import { ipcMain, dialog, app } from 'electron';
import fs from 'fs';
const path = require('path');
import { spawn, exec } from 'child_process';
import util from 'util';
import os from 'os';
import { processManager } from './processManager';
import { gitPluginManager } from './gitPlugins';
const dotenv = require('dotenv');

const execAsync = util.promisify(exec);

function discoverEnvFiles(basePath: string): string[] {
    const envFiles: string[] = [];
    try {
        const entries = fs.readdirSync(basePath, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isFile() && entry.name.startsWith('.env')) {
                envFiles.push(path.join(basePath, entry.name));
            } else if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                // Scan one level deep as requested
                const subPath = path.join(basePath, entry.name);
                const subEntries = fs.readdirSync(subPath, { withFileTypes: true });
                for (const subEntry of subEntries) {
                    if (subEntry.isFile() && subEntry.name.startsWith('.env')) {
                        envFiles.push(path.join(subPath, subEntry.name));
                    }
                }
            }
        }
    } catch (e) { }
    return envFiles;
}

export function setupIpcHandlers() {

    // Reset App
    ipcMain.handle('reset-app', async () => {
        const result = await dialog.showMessageBox({
            type: 'warning',
            buttons: ['Cancel', 'Reset Everything'],
            defaultId: 0,
            title: 'Confirm Reset',
            message: 'Are you sure you want to reset everything?',
            detail: 'This will clear all workbenches, clusters, and saved settings. This action cannot be undone.'
        });

        if (result.response === 1) {
            const userDataPath = app.getPath('userData');
            const filesToClear = ['config.json', 'localDB.json', 'service-configs.json', 'environments.json'];
            
            for (const file of filesToClear) {
                const p = path.join(userDataPath, file);
                try {
                    if (fs.existsSync(p)) fs.unlinkSync(p);
                } catch (e) {
                    console.error(`Failed to delete ${file}:`, e);
                }
            }
            
            app.relaunch();
            app.exit(0);
        }
        return { success: false };
    });

    // Config Handlers
    ipcMain.handle('select-workbench', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: 'Select Workbench Directory'
        });
        if (!result.canceled && result.filePaths.length > 0) {
            const selectedPath = result.filePaths[0];
            const configPath = path.join(app.getPath('userData'), 'config.json');
            let config: any = { workbenches: [] };
            if (fs.existsSync(configPath)) {
                try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) { }
            }
            
            if (!config.workbenches) config.workbenches = [];
            if (config.workbenchPath && config.workbenches.length === 0) {
                config.workbenches.push({ id: require('uuid').v4(), path: config.workbenchPath, name: path.basename(config.workbenchPath) });
                delete config.workbenchPath;
            }

            let existing = config.workbenches.find((w: any) => w.path === selectedPath);
            if (!existing) {
                existing = { id: require('uuid').v4(), path: selectedPath, name: path.basename(selectedPath) };
                config.workbenches.push(existing);
            }
            
            config.activeWorkbenchId = existing.id;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            return config;
        }
        return null;
    });

    ipcMain.handle('get-config', () => {
        const configPath = path.join(app.getPath('userData'), 'config.json');
        let config: any = { workbenches: [] };
        if (fs.existsSync(configPath)) {
            try {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } catch (e) { }
        }
        if (!config.workbenches) config.workbenches = [];
        if (config.workbenchPath && config.workbenches.length === 0) {
            config.workbenches.push({ id: require('uuid').v4(), path: config.workbenchPath, name: path.basename(config.workbenchPath) });
            config.activeWorkbenchId = config.workbenches[0].id;
            delete config.workbenchPath;
            try { fs.writeFileSync(configPath, JSON.stringify(config, null, 2)); } catch(e) {}
        }
        return config;
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

        const envsPath = path.join(app.getPath('userData'), 'environments.json');
        let globalEnvs: any = {};
        if (fs.existsSync(envsPath)) {
            try {
                globalEnvs = JSON.parse(fs.readFileSync(envsPath, 'utf8'));
            } catch (e) { }
        }

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
                                const envPortMatch = envContent.match(/^PORT\s*=\s*["']?(\d+)["']?/m);
                                if (envPortMatch) detectedPort = parseInt(envPortMatch[1], 10);
                            }
                        }
                    } catch (e) { }

                    let gitBranch, gitStatus;
                    try {
                        const { stdout: statusOutput } = await execAsync('git status --branch --porcelain', { cwd: fullPath });
                        const lines = statusOutput.split('\n');
                        const branchLine = lines[0]; // e.g. "## main...origin/main [ahead 1, behind 2]"
                        
                        if (branchLine.startsWith('## ')) {
                            const branchInfo = branchLine.substring(3);
                            if (branchInfo.includes('...')) {
                                gitBranch = branchInfo.split('...')[0];
                                
                                const aheadMatch = branchInfo.match(/ahead\s+(\d+)/);
                                const behindMatch = branchInfo.match(/behind\s+(\d+)/);
                                
                                gitStatus = { 
                                    ahead: aheadMatch ? parseInt(aheadMatch[1], 10) : 0, 
                                    behind: behindMatch ? parseInt(behindMatch[1], 10) : 0,
                                    hasLocalChanges: false 
                                };
                            } else {
                                gitBranch = branchInfo.trim();
                                gitStatus = { ahead: 0, behind: 0, hasLocalChanges: false };
                            }
                        }
                        gitStatus.hasLocalChanges = lines.slice(1).some(line => line.trim().length > 0);
                    } catch (e) { }

                    const serviceStatus = await processManager.getServiceStatus(fullPath);
                    
                    let activeEnv: { name: string; color: string } | null = null;
                    let envProfiles: { id: string; name: string; color: string }[] = [];
                    let activeEnvId: string | null = null;

                    let serviceEnvs = globalEnvs[fullPath];
                    
                    // Auto-initialize if .env exists but no profiles in globalEnvs
                    const envFilePath = path.join(fullPath, '.env');
                    if (!serviceEnvs && fs.existsSync(envFilePath)) {
                        try {
                            const fileContent = fs.readFileSync(envFilePath, 'utf8');
                            const actualEnv = dotenv.parse(fileContent);
                            if (Object.keys(actualEnv).length > 0) {
                                const defaultId = require('crypto').randomUUID();
                                serviceEnvs = {
                                    active: defaultId,
                                    profiles: [{
                                        id: defaultId,
                                        name: "Default",
                                        color: "#10b981",
                                        variables: actualEnv
                                    }]
                                };
                                globalEnvs[fullPath] = serviceEnvs;
                                fs.writeFileSync(envsPath, JSON.stringify(globalEnvs, null, 2));
                            }
                        } catch (e) { }
                    }

                    if (serviceEnvs && serviceEnvs.active && serviceEnvs.profiles) {
                        envProfiles = serviceEnvs.profiles.map((p: any) => ({ id: p.id, name: p.name, color: p.color }));
                        activeEnvId = serviceEnvs.active;
                        const profile = serviceEnvs.profiles.find((p: any) => p.id === serviceEnvs.active);
                        if (profile) {
                            activeEnv = { name: profile.name, color: profile.color };
                        }
                    }

                    return {
                        name: entry.name,
                        path: fullPath,
                        status: serviceStatus.status,
                        mode: serviceStatus.mode,
                        port: detectedPort,
                        gitBranch,
                        gitStatus,
                        activeEnv,
                        envProfiles,
                        activeEnvId
                    };
                }
                return null;
            })
        );
        return { services: services.filter(Boolean) };
    });

    // Control
    ipcMain.handle('control-service', async (_, { path: servicePath, action, port, mode, customCommand }) => {
        if (action === 'start') {
            const defaultCommand = mode === 'prod' ? 'npm run build && npm start' : 'npm run dev';
            const command = customCommand || defaultCommand;
            
            // For build-and-start production processes, setting `specificStatus: 'building'` here would be confusing
            // because after the build finishes, it moves to start. To do it easily in one process, we'll just track it as 'running' with prod.
            await processManager.startService(servicePath, command, port, mode || 'dev');
        } else if (action === 'stop') {
            await processManager.stopService(servicePath);
        }
        return { success: true };
    });

    ipcMain.handle('get-logs', (_, { path: servicePath }) => {
        return { logs: processManager.getLogs(servicePath) };
    });

    ipcMain.handle('clear-logs', (_, { path: servicePath }) => {
        processManager.clearLogs(servicePath);
        return { success: true };
    });

    // Groups
    const getGroupsPath = () => path.join(app.getPath('userData'), 'localDB.json');
    ipcMain.handle('get-groups', (_, { workbenchId }) => {
        if (!workbenchId) return { groups: [] };
        const p = getGroupsPath();
        if (fs.existsSync(p)) {
            const data = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (Array.isArray(data)) return { groups: [] }; // Legacy fix
            return { groups: data[workbenchId] || [] };
        }
        return { groups: [] };
    });

    ipcMain.handle('save-groups', (_, { workbenchId, action, group, id }) => {
        if (!workbenchId) return { success: false };
        const p = getGroupsPath();
        let allGroups: Record<string, any[]> = {};
        if (fs.existsSync(p)) {
            const data = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (!Array.isArray(data)) allGroups = data;
        }

        let groups = allGroups[workbenchId] || [];

        if (action === 'create') {
            const index = groups.findIndex((g: any) => g.id === group.id);
            if (index >= 0) groups[index] = group;
            else groups.push(group);
        } else if (action === 'delete') {
            groups = groups.filter((g: any) => g.id !== id);
        }

        allGroups[workbenchId] = groups;
        fs.writeFileSync(p, JSON.stringify(allGroups, null, 2));
        return { success: true };
    });

    // Service Settings (Custom Commands)
    const getServiceConfigsPath = () => path.join(app.getPath('userData'), 'service-configs.json');
    ipcMain.handle('get-service-configs', () => {
        const p = getServiceConfigsPath();
        if (fs.existsSync(p)) return { configs: JSON.parse(fs.readFileSync(p, 'utf8')) };
        return { configs: {} };
    });

    ipcMain.handle('save-service-config', (_, { servicePath, config }) => {
        const p = getServiceConfigsPath();
        let configs: any = {};
        if (fs.existsSync(p)) configs = JSON.parse(fs.readFileSync(p, 'utf8'));

        configs[servicePath] = config;
        fs.writeFileSync(p, JSON.stringify(configs, null, 2));
        return { success: true };
    });

    // Environments
    const getEnvironmentsPath = () => path.join(app.getPath('userData'), 'environments.json');
    
    ipcMain.handle('get-env', (_, { path: servicePath }) => {
        const p = getEnvironmentsPath();
        let envs: any = {};
        if (fs.existsSync(p)) envs = JSON.parse(fs.readFileSync(p, 'utf8'));

        let serviceEnvs = envs[servicePath] || { active: null, profiles: [] };
        
        // Read actual .env file 
        const envFilePath = path.join(servicePath, '.env');
        let actualEnv = {};
        if (fs.existsSync(envFilePath)) {
            const fileContent = fs.readFileSync(envFilePath, 'utf8');
            actualEnv = dotenv.parse(fileContent);
        }

        // Setup default profile if none exists but .env has data
        if (serviceEnvs.profiles.length === 0 && Object.keys(actualEnv).length > 0) {
            const defaultId = require('crypto').randomUUID();
            serviceEnvs.profiles.push({
                id: defaultId,
                name: "Default",
                color: "#10b981", // Emerald
                variables: actualEnv
            });
            serviceEnvs.active = defaultId;
            envs[servicePath] = serviceEnvs;
            fs.writeFileSync(p, JSON.stringify(envs, null, 2));
        }

        const discoveredFiles = discoverEnvFiles(servicePath);

        return { data: serviceEnvs, actualEnv, discoveredFiles };
    });

    ipcMain.handle('save-env', (_, { path: servicePath, data }) => {
        const p = getEnvironmentsPath();
        let envs: any = {};
        if (fs.existsSync(p)) envs = JSON.parse(fs.readFileSync(p, 'utf8'));
        
        envs[servicePath] = data;
        fs.writeFileSync(p, JSON.stringify(envs, null, 2));
        
        // Write active profile variables to actual .env
        const activeProfile = data.profiles.find((p: any) => p.id === data.active);
        if (activeProfile && activeProfile.variables) {
             const envStr = Object.keys(activeProfile.variables).map(k => {
                 const v = activeProfile.variables[k];
                 // Only quote values that contain spaces, newlines, or special chars
                 const needsQuotes = /[\s#"'\\]/.test(v) || v === '';
                 return needsQuotes ? `${k}="${v}"` : `${k}=${v}`;
             }).join('\n');
             // User requested to list all .env files and select path
             // We'll sync to their specific envPath if it exists, otherwise fallback to root .env
             const targetPath = activeProfile.envPath || path.join(servicePath, '.env');
             fs.writeFileSync(targetPath, envStr);
             
             // If we updated a specific env file (like .env.development), 
             // we should probably ALSO update the root .env as it's the standard entry point
             if (targetPath !== path.join(servicePath, '.env')) {
                fs.writeFileSync(path.join(servicePath, '.env'), envStr);
             }
        }

        return { success: true };
    });

    ipcMain.handle('switch-env', (_, { path: servicePath, profileId }) => {
        const p = getEnvironmentsPath();
        let envs: any = {};
        if (fs.existsSync(p)) envs = JSON.parse(fs.readFileSync(p, 'utf8'));
        
        const serviceEnvs = envs[servicePath];
        if (serviceEnvs) {
            serviceEnvs.active = profileId;
            envs[servicePath] = serviceEnvs;
            fs.writeFileSync(p, JSON.stringify(envs, null, 2));

            // Sync .env file
            const activeProfile = serviceEnvs.profiles.find((p: any) => p.id === profileId);
            if (activeProfile && activeProfile.variables) {
                const envStr = Object.keys(activeProfile.variables).map(k => {
                    const v = activeProfile.variables[k];
                    const needsQuotes = /[\s#"'\\]/.test(v) || v === '';
                    return needsQuotes ? `${k}="${v}"` : `${k}=${v}`;
                }).join('\n');
                const targetPath = activeProfile.envPath || path.join(servicePath, '.env');
                fs.writeFileSync(targetPath, envStr);
                
                // Also sync to root .env for compatibility
                if (targetPath !== path.join(servicePath, '.env')) {
                    fs.writeFileSync(path.join(servicePath, '.env'), envStr);
                }
            }
            return { success: true };
        }
        return { success: false };
    });

    // Git
    ipcMain.handle('git-command', async (_, { action, path: repoPath, branch }) => {
        try {
            if (action === 'checkout') await execAsync(`git checkout ${branch}`, { cwd: repoPath });
            else if (action === 'pull') await execAsync('git pull', { cwd: repoPath });
            else if (action === 'get-branches') {
                // Highly optimized branch listing for large repositories
                const { stdout } = await execAsync('git for-each-ref --format="%(refname:short)" refs/heads/ refs/remotes/origin/', { cwd: repoPath });
                const branches = stdout.split('\n')
                    .map(b => b.trim().replace('origin/', ''))
                    .filter(b => b && !b.includes('HEAD'));
                return { branches: Array.from(new Set(branches)) };
            }
            return { success: true };
        } catch (e: any) {
            return { error: e.message };
        }
    });

    // Command (npm)
    ipcMain.handle('npm-command', async (_, { action, path: servicePath, customCommand }) => {
        let cmd = customCommand || '';
        if (!cmd) {
            switch (action) {
                case 'install': cmd = 'npm install'; break;
                case 'install-legacy': cmd = 'npm install --legacy-peer-deps'; break;
                case 'build': cmd = 'npm run build'; break;
                case 'start-prod': cmd = 'npm start'; break;
            }
        }
        if (cmd) {
            let specificStatus: "building" | "installing" | undefined;
            let mode: "dev" | "prod" | null = null;
            
            if (action === 'build') {
                specificStatus = 'building';
            } else if (action === 'install' || action === 'install-legacy') {
                specificStatus = 'installing';
            } else if (action === 'start-prod') {
                mode = 'prod';
            }

            await processManager.startService(servicePath, cmd, undefined, mode, specificStatus);
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

    // Git Profiles
    const getGitProfilesPath = () => path.join(app.getPath('userData'), 'git-profiles.json');
    ipcMain.handle('get-git-profiles', () => {
        const p = getGitProfilesPath();
        if (fs.existsSync(p)) {
            try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { }
        }
        return { profiles: [] };
    });

    ipcMain.handle('save-git-profiles', (_, profiles) => {
        const p = getGitProfilesPath();
        fs.writeFileSync(p, JSON.stringify(profiles, null, 2));
        return { success: true };
    });

    // Git Clone
    ipcMain.handle('git-clone', async (event, { url, targetPath, profile }) => {
        return new Promise((resolve) => {
            // Ensure target parent directory exists
            const parentDir = path.dirname(targetPath);
            if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir, { recursive: true });
            }

            const child = spawn('git', ['clone', '--progress', url, targetPath]);
            
            child.stderr.on('data', (data) => {
                const message = data.toString();
                event.sender.send('git-clone-progress', message);
            });

            child.stdout.on('data', (data) => {
                const message = data.toString();
                event.sender.send('git-clone-progress', message);
            });

            child.on('close', async (code) => {
                if (code === 0 && profile) {
                    try {
                        // Apply git profile to the newly cloned repo
                        await execAsync(`git config user.name "${profile.name}"`, { cwd: targetPath });
                        await execAsync(`git config user.email "${profile.email}"`, { cwd: targetPath });
                    } catch (e) {
                        console.error('Failed to apply git profile:', e);
                    }
                }
                resolve({ success: code === 0, code });
            });

            child.on('error', (err) => {
                console.error('Git clone spawn error:', err);
                resolve({ success: false, error: err.message });
            });
        });
    });

    // Git Plugins
    ipcMain.handle('git-plugin-connect', async (_, { providerId, token, name, baseUrl }) => {
        if (providerId === 'github') {
            return await gitPluginManager.connectGitHub(token, name);
        } else if (providerId === 'oracle-vbs') {
            return await gitPluginManager.connectOracleVBS(token, name, baseUrl);
        }
        return { success: false, error: 'Unknown provider' };
    });

    ipcMain.handle('git-plugin-list-repos', async (_, { connectionId }) => {
        try {
            const repos = await gitPluginManager.listRepositories(connectionId);
            return { success: true, repos };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('git-plugin-get-connections', () => {
        return gitPluginManager.getConnections();
    });

    ipcMain.handle('git-plugin-remove-connection', (_, { id }) => {
        return gitPluginManager.removeConnection(id);
    });
}
