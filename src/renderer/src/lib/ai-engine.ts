export type Intent =
  | 'start'
  | 'stop'
  | 'restart'
  | 'env-switch'
  | 'build'
  | 'install'
  | 'status'
  | 'workflow'
  | 'git-pull'
  | 'git-status'
  | 'search'
  | 'health'
  | 'network-map'
  | 'unknown'

export interface AiAction {
  intent: Intent
  scope: 'checked' | 'all' | 'specific'
  environment?: string
  targetNames?: string[]
  query?: string
}

export function parsePrompt(prompt: string, availableServices: string[] = []): AiAction {
  const normalized = prompt.toLowerCase().trim()

  const action: AiAction = {
    intent: 'unknown',
    scope: 'checked'
  }

  // 1. Determine Intent
  if (
    normalized.includes('start') ||
    normalized.includes('run') ||
    normalized.includes('launch') ||
    normalized.includes('up')
  ) {
    action.intent = 'start'
  } else if (
    normalized.includes('stop') ||
    normalized.includes('down') ||
    normalized.includes('kill') ||
    normalized.includes('terminate')
  ) {
    action.intent = 'stop'
  } else if (normalized.includes('restart') || normalized.includes('reboot')) {
    action.intent = 'restart'
  } else if (
    normalized.includes('switch') ||
    normalized.includes('env') ||
    normalized.includes('mode')
  ) {
    action.intent = 'env-switch'
  } else if (normalized.includes('build') || normalized.includes('compile')) {
    action.intent = 'build'
  } else if (
    normalized.includes('install') ||
    normalized.includes('setup') ||
    normalized.includes('npm i')
  ) {
    action.intent = 'install'
  } else if (normalized.includes('pull') || normalized.includes('update')) {
    action.intent = 'git-pull'
  } else if (
    normalized.includes('search') ||
    normalized.includes('find') ||
    normalized.includes('where is')
  ) {
    action.intent = 'search'
  } else if (
    normalized.includes('health') ||
    normalized.includes('monitor') ||
    normalized.includes('stats')
  ) {
    action.intent = 'health'
  } else if (
    normalized.includes('network') ||
    normalized.includes('map') ||
    normalized.includes('dependency') ||
    normalized.includes('connect')
  ) {
    action.intent = 'network-map'
  }

  // 2. Determine Scope
  if (normalized.includes('all') || normalized.includes('every')) {
    action.scope = 'all'
  } else if (
    normalized.includes('checked') ||
    normalized.includes('selected') ||
    normalized.includes('this')
  ) {
    action.scope = 'checked'
  } else {
    // Check for specific service names
    const mentioned = availableServices.filter((s) => normalized.includes(s.toLowerCase()))
    if (mentioned.length > 0) {
      action.scope = 'specific'
      action.targetNames = mentioned
    } else {
      action.scope = 'checked'
    }
  }

  // 3. Determine Environment
  const envMatch = normalized.match(/(?:in|to|with|mode|env)\s+([a-z0-9_-]+)/i)
  if (envMatch) {
    action.environment = envMatch[1].toUpperCase()
  } else {
    if (normalized.includes(' qa')) action.environment = 'QA'
    if (normalized.includes(' prod')) action.environment = 'PROD'
    if (normalized.includes(' dev')) action.environment = 'DEV'
  }

  // 4. Extract Query (for search)
  if (action.intent === 'search') {
    action.query = prompt.replace(/search|find|where is/gi, '').trim()
  }

  return action
}
