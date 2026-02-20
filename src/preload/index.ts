import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  selectWorkbench: () => ipcRenderer.invoke('select-workbench'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  getServices: (path: string) => ipcRenderer.invoke('get-services', path),
  controlService: (data: any) => ipcRenderer.invoke('control-service', data),
  getLogs: (data: any) => ipcRenderer.invoke('get-logs', data),
  getGroups: () => ipcRenderer.invoke('get-groups'),
  saveGroups: (data: any) => ipcRenderer.invoke('save-groups', data),
  gitCommand: (data: any) => ipcRenderer.invoke('git-command', data),
  npmCommand: (data: any) => ipcRenderer.invoke('npm-command', data),
  updateConfig: (data: any) => ipcRenderer.invoke('update-config', data),
  openTerminal: (path: string) => ipcRenderer.invoke('open-terminal', path),
  openIde: (data: { path: string, ide: string }) => ipcRenderer.invoke('open-ide', data),
  checkIdes: () => ipcRenderer.invoke('check-ides'),

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
