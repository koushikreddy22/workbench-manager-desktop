// mock-ipc.ts
// Provides a mock implementation of window.api for browser/dev environments

const generateHistory = (count: number, min: number, max: number) => {
  return Array.from({ length: count }, () => Math.floor(Math.random() * (max - min + 1) + min))
}

const MOCK_CONFIG = {
  workbenches: [
    { id: '1', name: 'Frontend Dev', path: '/workspaces/frontend' },
    { id: '2', name: 'Infrastructure', path: '/workspaces/infra' }
  ],
  activeWorkbenchId: '1',
  defaultIde: 'vscode',
  aiSettings: {
    mode: 'native',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3',
    cloudProvider: 'gemini',
    cloudModel: 'gemini-1.5-flash',
    apiKey: ''
  },
  conversations: [
    {
      id: 'mock-1',
      title: 'Initial Welcome',
      updatedAt: Date.now(),
      messages: [
        {
          role: 'assistant',
          content: 'Hello! I am your Vantage Co-pilot. How can I help you manage your services today?',
          timestamp: Date.now()
        }
      ]
    }
  ],
  activeConversationId: 'mock-1'
}

const MOCK_SERVICES = [
  {
    name: 'auth-service',
    path: '/workspaces/infra/auth-service',
    status: 'running',
    mode: 'dev',
    port: 3000,
    gitBranch: 'main',
    gitStatus: { hasLocalChanges: true, ahead: 1, behind: 0 },
    stats: { 
      cpu: 12.5, 
      memory: 256,
      history: {
        cpu: generateHistory(60, 5, 20),
        memory: generateHistory(60, 240, 280)
      }
    }
  },
  {
    name: 'api-gateway',
    path: '/workspaces/infra/api-gateway',
    status: 'stopped',
    mode: null,
    port: 8080,
    gitBranch: 'develop',
    gitStatus: { hasLocalChanges: false, ahead: 0, behind: 2 },
    stats: { 
      cpu: 0, 
      memory: 0,
      history: { cpu: [], memory: [] }
    }
  },
  {
    name: 'user-ui',
    path: '/workspaces/frontend/user-ui',
    status: 'error',
    mode: 'dev',
    port: 3001,
    gitBranch: 'feature/login',
    gitStatus: { hasLocalChanges: false, ahead: 0, behind: 0 },
    stats: { 
      cpu: 45.2, 
      memory: 512.4,
      history: {
        cpu: generateHistory(60, 30, 60),
        memory: generateHistory(60, 480, 540)
      }
    }
  }
]

export const setupMockIpc = () => {
  if (typeof window === 'undefined') return

  ;(window as any).api = {
    // Basic Config
    selectWorkbench: async () => MOCK_CONFIG.workbenches[0],
    getConfig: async () => MOCK_CONFIG,
    updateConfig: async (cfg: any) => ({ ...MOCK_CONFIG, ...cfg }),
    resetApp: async () => {},

    // Services
    getServices: async () => ({ services: MOCK_SERVICES }),
    controlService: async () => ({ success: true }),
    getLogs: async () => ({ logs: ['Mock log line 1', 'Mock log line 2'] }),
    clearLogs: async () => {},
    addService: async () => ({ success: true }),
    archiveService: async () => ({ success: true }),
    getArchivedServices: async () => ({ services: [] }),
    restoreService: async () => ({ success: true }),
    deleteArchivedService: async () => ({ success: true }),

    // Groups & Orchestration
    getGroups: async () => ({ groups: [] }),
    saveGroups: async () => ({ success: true }),
    runCluster: async () => ({ success: true }),
    abortCluster: async () => {},
    markServiceReady: async () => {},
    onOrchestrationUpdate: (cb: any) => {
      setTimeout(() => cb({ groupId: 'mock', statuses: { 'auth-service': 'running' } }), 1000)
      return () => {}
    },
    onStartupHanging: (_cb: any) => {
      return () => {}
    },

    // Env & Config
    getServiceConfigs: async () => ({ configs: {} }),
    saveServiceConfig: async () => ({ success: true }),
    getEnv: async () => ({ env: [] }),
    saveEnv: async () => ({ success: true }),
    switchEnv: async () => ({ success: true }),
    syncEnvFromDisk: async () => ({ env: [] }),

    // Git
    gitCommand: async () => ({ success: true, stdout: 'Mock git output' }),
    getGitProfiles: async () => ({ profiles: [] }),
    saveGitProfiles: async () => ({ success: true }),
    gitClone: async () => ({ success: true }),
    onGitCloneProgress: (_cb: any) => {
      return () => {}
    },
    gitPluginConnect: async () => ({ success: true }),
    gitPluginListRepos: async () => ({ success: true, repos: [] }),
    gitPluginGetConnections: async () => [],
    gitPluginRemoveConnection: async () => ({ success: true }),

    // IDEs & Commands
    checkIdes: async () => [{ id: 'vscode', name: 'VS Code' }],
    openIde: async () => ({ success: true }),
    npmCommand: async () => ({ success: true, stdout: 'Mock npm output' }),
    shellCommand: async ({ command }: any) => {
      console.log(`[MOCK SHELL] Executing: ${command}`)
      return { success: true, stdout: `Mock output for: ${command}` }
    },

    // AI
    aiChat: async ({ messages }: any) => {
      const lastMsg = messages[messages.length - 1].content.toLowerCase()
      if (lastMsg.includes('explorer'))
        return "I've scanned your workspace. It seems to be a microservices architecture based on Node.js."
      return 'This is a mock AI response for Vantage Pro.'
    },
    listGeminiModels: async () => ['gemini-1.5-flash', 'gemini-1.5-pro'],

    // File System
    fsReadFile: async () => 'Mock file content',
    fsWriteFile: async () => ({ success: true }),
    fsListWorkbench: async () => ['apps/', 'libs/', 'package.json', 'README.md'],

    // Media
    takeSnapshot: async () => ({ success: true, path: '/mock/snapshot.png' }),
    getSources: async () => [],
    saveRecording: async () => ({ success: true, path: '/mock/recording.webm' }),

    // Terminal
    terminalCreate: async () => ({ success: true, id: 'mock-term' }),
    terminalClose: async () => {},
    terminalInput: () => {},
    terminalResize: () => {},
    onTerminalOutput: (_id: string, _cb: any) => {},
    onTerminalExit: (_id: string, _cb: any) => {},
    offTerminalOutput: () => {},
    offTerminalExit: () => {}
  }

  console.log('%c[Vantage] High-Fidelity Mock IPC Bridge initialized 🚀', 'color: #10b981; font-weight: bold;')
}
