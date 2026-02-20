import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      selectWorkbench: () => Promise<string | null>
      getConfig: () => Promise<any>
      getServices: (path: string) => Promise<any>
      controlService: (data: any) => Promise<any>
      getLogs: (data: any) => Promise<any>
      getGroups: () => Promise<any>
      saveGroups: (data: any) => Promise<any>
      gitCommand: (data: any) => Promise<any>
      npmCommand: (data: any) => Promise<any>
      updateConfig: (data: any) => Promise<any>
      openTerminal: (path: string) => Promise<any>
      openIde: (data: { path: string, ide: string }) => Promise<any>
      checkIdes: () => Promise<any>

      // Terminal
      terminalCreate: (data: { id: string, cwd: string }) => Promise<any>
      terminalClose: (data: { id: string }) => Promise<any>
      terminalInput: (data: { id: string, data: string }) => void
      terminalResize: (data: { id: string, cols: number, rows: number }) => void
      onTerminalOutput: (id: string, callback: (data: string) => void) => void
      onTerminalExit: (id: string, callback: () => void) => void
      offTerminalOutput: (id: string) => void
      offTerminalExit: (id: string) => void
    }
  }
}
