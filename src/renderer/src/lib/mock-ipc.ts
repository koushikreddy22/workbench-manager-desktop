// mock-ipc.ts
// Provides a mock implementation of window.api for browser/dev environments

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
  chatMessages: [
    {
      role: 'assistant',
      content: 'Hello! I am your Vantage Co-pilot. How can I help you manage your services today?'
    }
  ]
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
    stats: { cpu: 12, memory: 256 }
  },
  {
    name: 'api-gateway',
    path: '/workspaces/infra/api-gateway',
    status: 'stopped',
    mode: null,
    port: 8080,
    gitBranch: 'develop',
    gitStatus: { hasLocalChanges: false, ahead: 0, behind: 2 },
    stats: { cpu: 0, memory: 0 }
  },
  {
    name: 'user-ui',
    path: '/workspaces/frontend/user-ui',
    status: 'error',
    mode: 'dev',
    port: 3001,
    gitBranch: 'feature/login',
    gitStatus: { hasLocalChanges: false, ahead: 0, behind: 0 },
    stats: { cpu: 0, memory: 0 }
  }
]

export const setupMockIpc = () => {
  if (typeof window === 'undefined') return

  ;(window as any).api = {
    getConfig: async () => MOCK_CONFIG,
    updateConfig: async (cfg: any) => ({ ...MOCK_CONFIG, ...cfg }),
    getServices: async () => ({ services: MOCK_SERVICES }),
    getGroups: async () => ({ groups: [] }),
    getServiceConfigs: async () => ({ configs: {} }),
    checkIdes: async () => [{ id: 'vscode', name: 'VS Code' }],
    shellCommand: async ({ command }: any) => {
      console.log(`[MOCK SHELL] Executing: ${command}`)
      return { success: true, stdout: `Mock output for: ${command}` }
    },
    aiChat: async ({ messages }: any) => {
      const lastMsg = messages[messages.length - 1].content.toLowerCase()
      if (lastMsg.includes('explorer'))
        return "I've scanned your workspace. It seems to be a microservices architecture based on Node.js."
      return 'This is a mock AI response. In production, I would call your configured LLM.'
    },
    fsListWorkbench: async () => ['apps/', 'libs/', 'package.json', 'README.md'],
    // Add other handles as needed for stable testing
    onTerminalOutput: () => {},
    onTerminalExit: () => {},
    terminalCreate: async () => ({ success: true }),
    terminalInput: () => {},
    terminalClose: () => {},
    offTerminalOutput: () => {},
    offTerminalExit: () => {}
  }

  console.log('%c[Vantage] Mock IPC Bridge initialized 🚀', 'color: #10b981; font-weight: bold;')
}
