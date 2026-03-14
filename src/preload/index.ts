import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  selectWorkbench: () => ipcRenderer.invoke('select-workbench'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  getServices: (path: string) => ipcRenderer.invoke('get-services', path),
  controlService: (data: any) => ipcRenderer.invoke('control-service', data),
  getLogs: (data: any) => ipcRenderer.invoke('get-logs', data),
  getGroups: (data: any) => ipcRenderer.invoke('get-groups', data),
  saveGroups: (data: any) => ipcRenderer.invoke('save-groups', data),
  getServiceConfigs: () => ipcRenderer.invoke('get-service-configs'),
  saveServiceConfig: (data: any) => ipcRenderer.invoke('save-service-config', data),
  gitCommand: (data: any) => ipcRenderer.invoke('git-command', data),
  npmCommand: (data: any) => ipcRenderer.invoke('npm-command', data),
  updateConfig: (data: any) => ipcRenderer.invoke('update-config', data),
  openTerminal: (path: string) => ipcRenderer.invoke('open-terminal', path),
  openIde: (data: { path: string, ide: string }) => ipcRenderer.invoke('open-ide', data),
  checkIdes: () => ipcRenderer.invoke('check-ides'),
  getEnv: (data: { path: string }) => ipcRenderer.invoke('get-env', data),
  saveEnv: (data: { path: string, data: any }) => ipcRenderer.invoke('save-env', data),
  switchEnv: (data: { path: string, profileId: string }) => ipcRenderer.invoke('switch-env', data),
  resetApp: () => ipcRenderer.invoke('reset-app'),

  // Git
  getGitProfiles: () => ipcRenderer.invoke('get-git-profiles'),
  saveGitProfiles: (profiles: any) => ipcRenderer.invoke('save-git-profiles', profiles),
  gitClone: (data: { url: string, targetPath: string, profile?: any }) => ipcRenderer.invoke('git-clone', data),
  onGitCloneProgress: (callback: (message: string) => void) => {
    ipcRenderer.on('git-clone-progress', (_, message) => callback(message));
    return () => ipcRenderer.removeAllListeners('git-clone-progress');
  },
  gitPluginConnect: (data: any) => ipcRenderer.invoke('git-plugin-connect', data),
  gitPluginListRepos: (data: any) => ipcRenderer.invoke('git-plugin-list-repos', data),
  gitPluginGetConnections: () => ipcRenderer.invoke('git-plugin-get-connections'),
  gitPluginRemoveConnection: (data: any) => ipcRenderer.invoke('git-plugin-remove-connection', data),

  // Terminal
  terminalCreate: (data: any) => ipcRenderer.invoke('terminal-create', data),
  terminalClose: (data: any) => ipcRenderer.invoke('terminal-close', data),
  terminalInput: (data: any) => ipcRenderer.send('terminal-input', data),
  terminalResize: (data: any) => ipcRenderer.send('terminal-resize', data),
  onTerminalOutput: (id: string, callback: (data: string) => void) => {
    ipcRenderer.on(`terminal-output-${id}`, (_, data) => callback(data));
  },
  onTerminalExit: (id: string, callback: () => void) => {
    ipcRenderer.on(`terminal-exit-${id}`, () => callback());
  },
  offTerminalOutput: (id: string) => {
    ipcRenderer.removeAllListeners(`terminal-output-${id}`);
  },
  offTerminalExit: (id: string) => {
    ipcRenderer.removeAllListeners(`terminal-exit-${id}`);
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
