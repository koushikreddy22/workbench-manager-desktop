import { ipcMain, dialog, app, BrowserWindow } from 'electron';
import fs from 'fs';
const path = require('path');
import { spawn, exec } from 'child_process';
import util from 'util';
import os from 'os';
import { processManager } from './processManager';
import { gitPluginManager } from './gitPlugins';
const dotenv = require('dotenv');

const execAsync = util.promisify(exec);

// Task queue to limit concurrent git processes and prevent "process explosion"
class TaskQueue {
    private queue: (() => Promise<any>)[] = [];
    private running = 0;
    private maxConcurrent: number;

    constructor(maxConcurrent = 3) {
        this.maxConcurrent = maxConcurrent;
    }

    async add<T>(task: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await task();
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            });
            this.next();
        });
    }

    private async next() {
        if (this.running >= this.maxConcurrent || this.queue.length === 0) return;
        this.running++;
        const task = this.queue.shift()!;
        try {
            await task();
        } finally {
            this.running--;
            this.next();
        }
    }
}

const gitQueue = new TaskQueue(3);

// Suppress all interactive prompts for background git commands
const GIT_ENV = {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GCM_INTERACTIVE: 'never',
    GIT_ASKPASS: 'true',
    LC_ALL: 'C'
};

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

    ipcMain.handle('export-config', async () => {
        const userDataPath = app.getPath('userData');
        const files = ['config.json', 'localDB.json', 'service-configs.json', 'environments.json'];
        const bundle: any = { version: '1.0.0', exportedAt: Date.now(), data: {} };

        for (const file of files) {
            const p = path.join(userDataPath, file);
            if (fs.existsSync(p)) {
                try { bundle.data[file] = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { }
            }
        }

        const dateStr = new Date().toISOString().split('T')[0];
        const result = await dialog.showSaveDialog({
            title: 'Export Vantage Configuration',
            defaultPath: `vantage_backup_${dateStr}.vantage`,
            filters: [{ name: 'Vantage Backup', extensions: ['vantage'] }]
        });

        if (!result.canceled && result.filePath) {
            fs.writeFileSync(result.filePath, JSON.stringify(bundle, null, 2));
            return { success: true, path: result.filePath };
        }
        return { success: false };
    });

    ipcMain.handle('import-config', async () => {
        const result = await dialog.showOpenDialog({
            title: 'Import Vantage Configuration',
            filters: [{ name: 'Vantage Backup', extensions: ['vantage'] }],
            properties: ['openFile']
        });

        if (result.canceled || result.filePaths.length === 0) return { success: false };

        try {
            const raw = fs.readFileSync(result.filePaths[0], 'utf8');
            const bundle = JSON.parse(raw);

            if (!bundle.data || typeof bundle.data !== 'object') throw new Error("Invalid backup format");

            const confirm = await dialog.showMessageBox({
                type: 'question',
                buttons: ['Cancel', 'Import & Relaunch'],
                title: 'Confirm Import',
                message: 'All current settings, workbenches, and clusters will be overwritten. The app will relaunch to apply changes.',
                defaultId: 0
            });

            if (confirm.response === 1) {
                const userDataPath = app.getPath('userData');
                for (const [filename, content] of Object.entries(bundle.data)) {
                    const p = path.join(userDataPath, filename);
                    fs.writeFileSync(p, JSON.stringify(content, null, 2));
                }
                app.relaunch();
                app.quit();
                return { success: true };
            }
        } catch (e: any) {
            dialog.showErrorBox('Import Failed', e.message || 'The configuration file is invalid.');
        }
        return { success: false };
    });

    ipcMain.handle('ai-chat', async (_, data: { mode: string, settings: any, messages: any[], customSystemPrompt?: string }) => {
        const { mode, settings, messages, customSystemPrompt } = data;
        
        if (mode === 'ollama') {
            try {
                const res = await fetch(`${settings.ollamaUrl}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: settings.ollamaModel,
                        messages: messages,
                        stream: false
                    })
                });
                
                const result: any = await res.json();
                if (!res.ok) {
                    throw new Error(result.error || `HTTP ${res.status}: ${res.statusText}`);
                }
                
                if (!result.message?.content) {
                    throw new Error("Ollama returned an empty or malformed response message.");
                }
                
                return result.message.content;
            } catch (err: any) {
                throw new Error(`Ollama failed: ${err.message}`);
            }
        }

        if (mode === 'cloud') {
            const { cloudProvider, cloudModel, apiKey } = settings;
            if (!apiKey) throw new Error(`${cloudProvider} API key is missing.`);

            try {
                if (cloudProvider === 'openai') {
                    const res = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                        body: JSON.stringify({ model: cloudModel, messages })
                    });
                    
                    const result: any = await res.json();
                    if (!res.ok) {
                        throw new Error(result.error?.message || `OpenAI Error ${res.status}: ${res.statusText}`);
                    }
                    
                    const content = result.choices?.[0]?.message?.content;
                    if (!content) throw new Error("OpenAI returned no choices or empty content.");
                    return content;
                }

                if (cloudProvider === 'gemini') {
                    // Extract default system message and merge with custom personality
                    const defaultSystemMsg = messages.find(m => m.role === 'system')?.content;
                    const combinedSystemMsg = [defaultSystemMsg, customSystemPrompt].filter(Boolean).join('\n\n');
                    
                    // Build contents: optionally prepend system context as a user turn
                    const contents: any[] = [];
                    if (combinedSystemMsg) {
                        contents.push({ role: 'user', parts: [{ text: `[System context]: ${combinedSystemMsg}` }] });
                        contents.push({ role: 'model', parts: [{ text: 'Understood. I have initialized your custom assistant personality and am ready to help.' }] });
                    }
                    
                    messages.filter(m => m.role !== 'system').forEach(m => {
                        contents.push({
                            role: m.role === 'assistant' ? 'model' : 'user',
                            parts: [{ text: m.content }]
                        });
                    });
                    
                    // Strip 'models/' prefix if user provided it to ensure correct URL format
                    const cleanModel = cloudModel.startsWith('models/') ? cloudModel.replace('models/', '') : cloudModel;
                    
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents })
                    });
                    
                    const result: any = await res.json();
                    if (!res.ok) {
                        throw new Error(result.error?.message || `Gemini Error ${res.status}: ${res.statusText}`);
                    }
                    
                    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (!text) throw new Error("Gemini returned no candidates or empty text parts.");
                    return text;
                }

                if (cloudProvider === 'anthropic') {
                    const res = await fetch('https://api.anthropic.com/v1/messages', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json', 
                            'x-api-key': apiKey,
                            'anthropic-version': '2023-06-01'
                        },
                        body: JSON.stringify({
                            model: cloudModel,
                            max_tokens: 1024,
                            system: messages.find(m => m.role === 'system')?.content,
                            messages: messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }))
                        })
                    });
                    
                    const result: any = await res.json();
                    if (!res.ok) {
                        throw new Error(result.error?.message || `Anthropic Error ${res.status}: ${res.statusText}`);
                    }
                    
                    const text = result.content?.[0]?.text;
                    if (!text) throw new Error("Anthropic returned empty content array.");
                    return text;
                }
            } catch (err: any) {
                throw new Error(`Cloud AI Error: ${err.message}`);
            }
        }

        throw new Error("Unsupported AI mode");
    });

    // Services
    ipcMain.handle('get-services', async (_, workbenchPath: string, forceRefresh = false) => {
        if (!workbenchPath || !fs.existsSync(workbenchPath)) return { services: [] };

        const cachePath = path.join(app.getPath('userData'), 'services-cache.json');
        
        // Fast directory list check to see if we even CAN use the cache
        const currentEntries = fs.readdirSync(workbenchPath, { withFileTypes: true })
            .filter(entry => entry.isDirectory() && entry.name !== 'service-dashboard' && entry.name !== 'service-dashboard-desktop' && !entry.name.startsWith('.'))
            .map(entry => entry.name)
            .sort();

        // Return cached services if not forcing a refresh AND directory structure is identical
        if (!forceRefresh && fs.existsSync(cachePath)) {
            try {
                processManager.setWorkbenchPath(workbenchPath);
                const cachedData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
                const cachedEntries = cachedData.services.map((s: any) => path.basename(s.path)).sort();

                // If the directory structure is exactly the same, use the cache
                if (JSON.stringify(currentEntries) === JSON.stringify(cachedEntries)) {
                    // Re-read environments for UI sync
                    const envsPath = path.join(app.getPath('userData'), 'environments.json');
                    let globalEnvs: any = {};
                    if (fs.existsSync(envsPath)) {
                        try { globalEnvs = JSON.parse(fs.readFileSync(envsPath, 'utf8')); } catch (e) { }
                    }

                    // Merge with live status and environment from processManager/disk
                    const mergedServices = await Promise.all(cachedData.services.map(async (svc: any) => {
                        const live = await processManager.getServiceStatus(svc.path);
                        
                        // Sync environment state
                        let activeEnv = null;
                        let envProfiles = [];
                        let activeEnvId = null;
                        const serviceEnvs = globalEnvs[svc.path];
                        if (serviceEnvs && serviceEnvs.active && serviceEnvs.profiles) {
                            envProfiles = serviceEnvs.profiles.map((p: any) => ({ id: p.id, name: p.name, color: p.color }));
                            activeEnvId = serviceEnvs.active;
                            const profile = serviceEnvs.profiles.find((p: any) => p.id === serviceEnvs.active);
                            if (profile) activeEnv = { name: profile.name, color: profile.color };
                        }

                        return { 
                            ...svc, 
                            status: live.status, 
                            mode: live.mode, 
                            stats: live.stats,
                            gitBranch: live.gitBranch || svc.gitBranch,
                            gitStatus: live.gitStatus || svc.gitStatus,
                            activeEnv,
                            envProfiles,
                            activeEnvId
                        };
                    }));
                    return { services: mergedServices };
                }
            } catch (e) {
                console.error('Failed to load or validate services cache:', e);
            }
        }

        processManager.setWorkbenchPath(workbenchPath);

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
                        stats: serviceStatus.stats,
                        port: detectedPort,
                        gitBranch: serviceStatus.gitBranch,
                        gitStatus: serviceStatus.gitStatus,
                        activeEnv,
                        envProfiles,
                        activeEnvId
                    };
                }
                return null;
            })
        );

        const filteredServices = services.filter(Boolean);

        // Heuristic Dependency Detection
        filteredServices.forEach((service: any) => {
            try {
                const pkgPath = path.join(service.path, 'package.json');
                if (fs.existsSync(pkgPath)) {
                    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
                    service.dependencies = filteredServices
                        .filter((s: any) => s.name !== service.name && deps[s.name])
                        .map((s: any) => s.name);
                }
            } catch (e) { }
        });
        
        // Save to cache
        try {
            fs.writeFileSync(cachePath, JSON.stringify({ services: filteredServices }, null, 2));
        } catch (e) {
            console.error('Failed to save services cache:', e);
        }

        return { services: filteredServices };
    });

    ipcMain.handle('archive-service', async (_, { workbenchPath, serviceName }) => {
        const archiveDir = path.join(workbenchPath, '.vantage-archive');
        if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });

        const sourcePath = path.join(workbenchPath, serviceName);
        const destPath = path.join(archiveDir, serviceName);

        if (fs.existsSync(destPath)) {
            // Collision handling: Rename existing archive with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const renamedPath = path.join(archiveDir, `${serviceName}_ARCHIVED_${timestamp}`);
            fs.renameSync(destPath, renamedPath);
        }

        fs.renameSync(sourcePath, destPath);
        return { success: true };
    });

    ipcMain.handle('get-archived-services', async (_, workbenchPath) => {
        const archiveDir = path.join(workbenchPath, '.vantage-archive');
        if (!fs.existsSync(archiveDir)) return { services: [] };

        const entries = fs.readdirSync(archiveDir, { withFileTypes: true });
        const services = entries
            .filter(entry => entry.isDirectory())
            .map(entry => {
                const stats = fs.statSync(path.join(archiveDir, entry.name));
                return {
                    name: entry.name,
                    archivedAt: stats.mtime.toISOString(),
                    path: path.join(archiveDir, entry.name)
                };
            })
            .sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime());

        return { services };
    });

    ipcMain.handle('restore-service', async (_, { workbenchPath, serviceName }) => {
        const archiveDir = path.join(workbenchPath, '.vantage-archive');
        const sourcePath = path.join(archiveDir, serviceName);
        const destPath = path.join(workbenchPath, serviceName);

        if (fs.existsSync(destPath)) {
            throw new Error(`A service with name "${serviceName}" already exists in the workbench. Please rename or delete it first.`);
        }

        fs.renameSync(sourcePath, destPath);
        return { success: true };
    });

    ipcMain.handle('delete-archived-service', async (_, { workbenchPath, serviceName }) => {
        const archiveDir = path.join(workbenchPath, '.vantage-archive');
        const servicePath = path.join(archiveDir, serviceName);
        if (fs.existsSync(servicePath)) {
            fs.rmSync(servicePath, { recursive: true, force: true });
        }
        return { success: true };
    });

    ipcMain.handle('add-service', async (_, { workbenchPath }) => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: 'Select Service Directory to Import'
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const sourcePath = result.filePaths[0];
            const serviceName = path.basename(sourcePath);
            const destPath = path.join(workbenchPath, serviceName);

            if (fs.existsSync(destPath)) {
                throw new Error(`A service named "${serviceName}" already exists in this workbench.`);
            }

            try {
                // We'll use rename (move) as it's faster and cleaner for workspace management
                fs.renameSync(sourcePath, destPath);
                return { success: true };
            } catch (err: any) {
                // If rename fails (e.g. across drives), try recursive copy then delete
                try {
                    fs.cpSync(sourcePath, destPath, { recursive: true });
                    fs.rmSync(sourcePath, { recursive: true, force: true });
                    return { success: true };
                } catch (copyErr: any) {
                    throw new Error(`Failed to import service: ${copyErr.message}`);
                }
            }
        }
        return { success: false };
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
            if (action === 'checkout') await gitQueue.add(() => execAsync(`git checkout ${branch}`, { cwd: repoPath, env: GIT_ENV }));
            else if (action === 'pull') await gitQueue.add(() => execAsync('git pull', { cwd: repoPath, env: GIT_ENV }));
            else if (action === 'get-diff') {
                const { stdout } = await gitQueue.add(() => execAsync('git diff HEAD --stat && git diff HEAD', { cwd: repoPath, env: GIT_ENV }));
                return { diff: stdout };
            }
            else if (action === 'get-branches') {
                // Highly optimized branch listing for large repositories
                const { stdout } = await gitQueue.add(() => execAsync('git for-each-ref --format="%(refname:short)" refs/heads/ refs/remotes/origin/', { cwd: repoPath, env: GIT_ENV }));
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

            const child = spawn('git', ['clone', '--progress', url, targetPath], {
                env: GIT_ENV
            });
            
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
                        await gitQueue.add(() => execAsync(`git config user.name "${profile.name}"`, { cwd: targetPath, env: GIT_ENV }));
                        await gitQueue.add(() => execAsync(`git config user.email "${profile.email}"`, { cwd: targetPath, env: GIT_ENV }));
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

    // AI & Search
    ipcMain.handle('search-docs', async (_, { workbenchPath, query }) => {
        if (!workbenchPath || !fs.existsSync(workbenchPath)) return { results: [] };
        
        const results: { path: string; excerpt: string; name: string }[] = [];
        const ignoredDirs = ['node_modules', '.git', '.vantage-archive', 'dist', 'out', '.next'];
        const allowedExts = ['.md', '.txt', '.json', '.js', '.ts', '.yml', '.yaml'];

        async function walk(dir: string) {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (!ignoredDirs.includes(entry.name)) await walk(fullPath);
                } else if (entry.isFile()) {
                    if (allowedExts.includes(path.extname(entry.name))) {
                        try {
                            const content = fs.readFileSync(fullPath, 'utf8');
                            if (content.toLowerCase().includes(query.toLowerCase())) {
                                const index = content.toLowerCase().indexOf(query.toLowerCase());
                                const start = Math.max(0, index - 50);
                                const end = Math.min(content.length, index + query.length + 50);
                                results.push({
                                    path: fullPath,
                                    name: entry.name,
                                    excerpt: (start > 0 ? '...' : '') + content.substring(start, end).replace(/\n/g, ' ') + (end < content.length ? '...' : '')
                                });
                            }
                        } catch (e) {}
                    }
                }
                if (results.length > 50) break; // Limit results
            }
        }

        try {
            await walk(workbenchPath);
        } catch (e) {}
        
        return { results };
    });

    // File System Access for AI Scaffolding & Fixes
    const validatePath = (targetPath: string) => {
        const configPath = path.join(app.getPath('userData'), 'config.json');
        if (!fs.existsSync(configPath)) return false;
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const workbenches = config.workbenches || [];
            return workbenches.some((w: any) => targetPath.startsWith(w.path));
        } catch (e) {
            return false;
        }
    };

    ipcMain.handle('fs-read-file', async (_, filePath: string) => {
        if (!validatePath(filePath)) throw new Error('Access denied: Path is outside of registered workbenches.');
        if (!fs.existsSync(filePath)) throw new Error('File not found.');
        return fs.readFileSync(filePath, 'utf8');
    });

    ipcMain.handle('fs-write-file', async (_, { filePath, content }) => {
        if (!validatePath(filePath)) throw new Error('Access denied: Path is outside of registered workbenches.');
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, content, 'utf8');
        return { success: true };
    });

    ipcMain.handle('fs-list-workbench', async (_, workbenchPath: string) => {
        if (!validatePath(workbenchPath)) throw new Error('Access denied: Path is outside of registered workbenches.');
        
        const files: string[] = [];
        const ignoredDirs = ['node_modules', '.git', 'dist', 'out', '.next', '.vantage-archive'];
        
        function walk(dir: string, depth = 0) {
            if (depth > 5) return; // Limit depth
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (!ignoredDirs.includes(entry.name)) walk(fullPath, depth + 1);
                } else {
                    files.push(path.relative(workbenchPath, fullPath));
                }
            }
        }
        
        walk(workbenchPath);
        return files;
    });

    ipcMain.handle('list-gemini-models', async (_, rawApiKey: string) => {
        try {
            const apiKey = rawApiKey?.trim();
            if (!apiKey) throw new Error("API Key is empty after trimming.");
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const data: any = await response.json();
            
            if (!response.ok) {
                const message = data?.error?.message || `HTTP error! status: ${response.status}`;
                throw new Error(message);
            }
            
            // Filter and simplify names
            return (data.models || [])
                .filter((m: any) => m.supportedGenerationMethods.includes('generateContent'))
                .map((m: any) => m.name.replace('models/', ''));
        } catch (err: any) {
            console.error("Failed to list Gemini models:", err);
            throw new Error(`Failed to fetch models: ${err.message}`);
        }
    });
    
    // Generic Shell Command Execution for AI Autonomy
    ipcMain.handle('shell-command', async (_, { command, cwd }: { command: string, cwd: string }) => {
        try {
            // Security: In a production app, we would validate cwd against registered workbenches.
            // For now, we'll assume the co-pilot provides a valid path within the workbench context.
            
            // Use shell-specific command invocation for better compatibility (especially on Windows)
            const isWin = process.platform === 'win32';
            const shell = isWin ? 'powershell.exe' : '/bin/bash';
            const shellArgs = isWin ? ['-Command', command] : ['-c', command];

            console.log(`[Shell] Executing: "${command}" in ${cwd}`);
            
            return new Promise((resolve) => {
                const child = spawn(isWin ? 'powershell.exe' : 'bash', shellArgs, {
                    cwd,
                    env: { ...process.env, ...GIT_ENV },
                    shell: true
                });

                let stdout = '';
                let stderr = '';

                child.stdout.on('data', (data) => stdout += data.toString());
                child.stderr.on('data', (data) => stderr += data.toString());

                child.on('close', (code) => {
                    if (code === 0) {
                        resolve({ success: true, stdout, stderr });
                    } else {
                        resolve({ 
                            success: false, 
                            error: `Command failed with exit code ${code}`, 
                            stdout, 
                            stderr 
                        });
                    }
                });

                child.on('error', (err) => {
                    resolve({ success: false, error: err.message, stdout, stderr });
                });
            });
        } catch (err: any) {
            console.error("Shell command exception:", err);
            return { success: false, error: err.message };
        }
    });
}
