const DEFAULT_GEMINI_CHAT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
]

const DEFAULT_GEMINI_EMBEDDING_MODELS = [
  'text-embedding-004',
  'gemini-embedding-001',
  'embedding-001',
]

const parseModelList = (raw: unknown, fallback: string[]) => {
  if (typeof raw !== 'string') return fallback

  const models = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  return models.length ? models : fallback
}

export const getGeminiChatModels = (config: any) => (
  parseModelList(config?.geminiChatModels, DEFAULT_GEMINI_CHAT_MODELS)
)

export const getGeminiEmbeddingModels = (config: any) => (
  parseModelList(config?.geminiEmbeddingModels, DEFAULT_GEMINI_EMBEDDING_MODELS)
)

export const normalizeAzureOpenAiEndpoint = (endpoint?: string | null) => {
  const normalized = String(endpoint || '').trim().replace(/\/+$/, '')
  if (!normalized) return ''

  return normalized
    .replace(/\/openai\/v\d+$/i, '')
    .replace(/\/openai$/i, '')
}

export const buildAzureChatCompletionsUrl = (config: any) => {
  const endpoint = normalizeAzureOpenAiEndpoint(config?.azureOpenAiEndpoint)
  const deployment = String(config?.azureOpenAiDeploymentName || '').trim()
  const apiVersion = String(config?.azureOpenAiApiVersion || '2024-02-15-preview').trim()

  if (!endpoint || !deployment) {
    throw new Error('Azure credentials missing')
  }

  return `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`
}
