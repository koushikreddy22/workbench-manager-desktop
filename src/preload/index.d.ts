import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      selectWorkbench: () => Promise<any>
      getConfig: () => Promise<any>
      getServices: (path: string, forceRefresh?: boolean) => Promise<any>
      controlService: (data: any) => Promise<any>
      getLogs: (data: any) => Promise<any>
      getGroups: (data?: any) => Promise<any>
      saveGroups: (data: any) => Promise<any>
      getServiceConfigs: () => Promise<any>
      saveServiceConfig: (data: any) => Promise<any>
      clearLogs: (data: any) => Promise<any>
      gitCommand: (data: any) => Promise<any>
      npmCommand: (data: any) => Promise<any>
      updateConfig: (data: any) => Promise<any>
      openTerminal: (path: string) => Promise<any>
      openIde: (data: { path: string; ide: string }) => Promise<any>
      checkIdes: () => Promise<any>
      getEnv: (data: { path: string }) => Promise<any>
      saveEnv: (data: { path: string; data: any }) => Promise<any>
      switchEnv: (data: { path: string; profileId: string }) => Promise<any>
      resetApp: () => Promise<any>
      clearLogs: (data: { path: string }) => Promise<any>
      archiveService: (data: { workbenchPath: string; serviceName: string }) => Promise<any>
      getArchivedServices: (workbenchPath: string) => Promise<any>
      restoreService: (data: { workbenchPath: string; serviceName: string }) => Promise<any>
      deleteArchivedService: (params: {
        workbenchPath: string
        serviceName: string
      }) => Promise<{ success: boolean }>
      addService: (params: { workbenchPath: string }) => Promise<{ success: boolean }>

      // Git
      getGitProfiles: () => Promise<any>
      saveGitProfiles: (profiles: any) => Promise<any>
      gitClone: (data: { url: string; targetPath: string; profile?: any }) => Promise<any>
      onGitCloneProgress: (callback: (message: string) => void) => () => void
      gitPluginConnect: (data: {
        providerId: string
        token: string
        name: string
        baseUrl?: string
      }) => Promise<any>
      gitPluginListRepos: (data: { connectionId: string }) => Promise<any>
      gitPluginGetConnections: () => Promise<any[]>
      gitPluginRemoveConnection: (data: { id: string }) => Promise<any>

      // Terminal
      terminalCreate: (data: { id: string; cwd: string }) => Promise<any>
      terminalClose: (data: { id: string }) => Promise<any>
      terminalInput: (data: { id: string; data: string }) => void
      terminalResize: (data: { id: string; cols: number; rows: number }) => void
      onTerminalOutput: (id: string, callback: (data: string) => void) => void
      onTerminalExit: (id: string, callback: () => void) => void
      offTerminalOutput: (id: string) => void
      offTerminalExit: (id: string) => void
      fsReadFile: (path: string) => Promise<any>
      fsWriteFile: (data: { filePath: string; content: string }) => Promise<any>
      fsListWorkbench: (path: string) => Promise<string[]>
      listGeminiModels: (apiKey: string) => Promise<any>
      shellCommand: (data: { command: string; cwd: string }) => Promise<any>
      aiChat: (data: any) => Promise<any>
      exportConfig: () => Promise<{ success: boolean; path?: string; error?: string }>
      importConfig: () => Promise<{ success: boolean; error?: string }>,
      runCluster: (data: {
        workbenchId: string
        groupId: string
        allServices: any[]
      }) => Promise<any>,
      abortCluster: () => Promise<any>,
      markServiceReady: (data: { servicePath: string }) => Promise<any>,
      onOrchestrationUpdate: (callback: (data: any) => void) => () => void,
      onStartupHanging: (callback: (data: any) => void) => () => void
    }
  }
}
