export type ChatProvider = 'azure' | 'openai' | 'openrouter' | 'gemini'
export type EmbeddingProvider = 'azure' | 'openai' | 'gemini'
export type AzureAuthMode = 'api-key' | 'bearer'
export type EmbeddingApiFormat = 'openai' | 'gemini'

export type ChatCompletionsRequest = {
  url: string
  model: string
  usesV1Api: boolean
  provider: ChatProvider
  headers: Record<string, string>
  maxCompletionTokens?: number
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high'
}

export type AzureChatCompletionsRequest = ChatCompletionsRequest & {
  deployment: string
  provider: 'azure'
}

export type EmbeddingsRequest = {
  url: string
  model: string
  dimensions: number
  usesV1Api: boolean
  provider: EmbeddingProvider
  headers: Record<string, string>
  apiFormat: EmbeddingApiFormat
}

const unique = <T>(items: T[]) => Array.from(new Set(items.filter(Boolean)))

const parseProviderList = <T extends string>(raw: unknown, allowed: T[], fallback: T[]) => {
  const values = String(raw || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is T => allowed.includes(item as T))

  return unique(values.length ? values : fallback)
}

const safeBuild = <T>(builder: () => T) => {
  try {
    return builder()
  } catch {
    return null
  }
}

export const getPreferredChatProvider = (config: any): ChatProvider => {
  const provider = String(config?.aiChatProvider || '').trim().toLowerCase()
  return ['openai', 'openrouter', 'gemini'].includes(provider) ? provider as ChatProvider : 'azure'
}

export const getPreferredEmbeddingProvider = (config: any): EmbeddingProvider => {
  const provider = String(config?.aiEmbeddingProvider || '').trim().toLowerCase()
  return ['openai', 'gemini'].includes(provider) ? provider as EmbeddingProvider : 'azure'
}

export const getChatProviderOrder = (config: any): ChatProvider[] => {
  const primary = getPreferredChatProvider(config)
  return parseProviderList<ChatProvider>(
    config?.aiChatFallbackProviders,
    ['azure', 'openai', 'openrouter', 'gemini'],
    [primary, 'openrouter', 'gemini', 'openai']
  )
}

export const getEmbeddingProviderOrder = (config: any): EmbeddingProvider[] => {
  const primary = getPreferredEmbeddingProvider(config)
  return parseProviderList<EmbeddingProvider>(
    config?.aiEmbeddingFallbackProviders,
    ['azure', 'openai', 'gemini'],
    [primary, 'openai', 'gemini']
  )
}

export const normalizeAzureOpenAiEndpoint = (endpoint?: string | null) => {
  const normalized = String(endpoint || '').trim().replace(/\/+$/, '')
  if (!normalized) return ''

  return normalized
    // Azure AI Foundry can expose project URLs like
    // https://resource.services.ai.azure.com/api/projects/project-name.
    // Chat completions still use the resource root + /openai/v1 path.
    .replace(/\/api\/projects\/[^/]+$/i, '')
    .replace(/\/openai\/v\d+\/(chat\/completions|embeddings)$/i, '')
    .replace(/\/openai\/deployments\/[^/]+\/(chat\/completions|embeddings)$/i, '')
    .replace(/\/openai\/v\d+$/i, '')
    .replace(/\/openai$/i, '')
}

const shouldUseAzureV1Api = (config: any, endpointKey: 'chat' | 'embedding' | 'default' = 'default') => {
  const endpointValue = endpointKey === 'chat'
    ? (config?.azureOpenAiChatEndpoint || config?.azureOpenAiEndpoint)
    : endpointKey === 'embedding'
      ? (config?.azureOpenAiEmbeddingEndpoint || config?.azureOpenAiEndpoint)
      : config?.azureOpenAiEndpoint

  const rawEndpoint = String(endpointValue || '').trim().replace(/\/+$/, '')
  const apiVersion = String(config?.azureOpenAiApiVersion || '').trim().toLowerCase()
  const apiStyle = String(config?.azureOpenAiApiStyle || '').trim().toLowerCase()

  return apiStyle === 'v1'
    || apiVersion === 'preview'
    || apiVersion === 'v1'
    || /\/openai\/v1$/i.test(rawEndpoint)
}

const getAzureAuthMode = (config: any, endpoint: string): AzureAuthMode => {
  const explicit = String(config?.azureOpenAiChatAuthMode || config?.azureOpenAiAuthMode || '').trim().toLowerCase()
  if (explicit === 'bearer') return 'bearer'
  if (explicit === 'api-key' || explicit === 'apikey') return 'api-key'

  // Azure AI Foundry model inference examples use Authorization: Bearer for
  // *.services.ai.azure.com/openai/v1 endpoints, while classic Azure OpenAI
  // resources commonly use api-key. Keep classic resources backward compatible.
  return /\.services\.ai\.azure\.com$/i.test(endpoint) ? 'bearer' : 'api-key'
}

const buildAzureAuthHeaders = (apiKey: string, authMode: AzureAuthMode) => ({
  ...(authMode === 'bearer' ? { Authorization: `Bearer ${apiKey}` } : { 'api-key': apiKey }),
  'Content-Type': 'application/json',
})

const getAzureChatMaxCompletionTokens = (config: any) => {
  const parsed = Number(config?.azureOpenAiChatMaxCompletionTokens || config?.azureOpenAiMaxCompletionTokens || 0)
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : undefined
}

const getAzureChatReasoningEffort = (config: any) => {
  const effort = String(config?.azureOpenAiChatReasoningEffort || config?.azureOpenAiReasoningEffort || '').trim().toLowerCase()
  return ['minimal', 'low', 'medium', 'high'].includes(effort)
    ? effort as 'minimal' | 'low' | 'medium' | 'high'
    : undefined
}

export const getEmbeddingDimensions = (config: any) => {
  const parsed = Number(
    config?.azureOpenAiEmbeddingDimensions
    || config?.openAiEmbeddingDimensions
    || config?.geminiEmbeddingDimensions
    || 1536
  )
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 1536
}

export const buildAzureChatCompletionsRequest = (config: any): AzureChatCompletionsRequest => {
  const endpoint = normalizeAzureOpenAiEndpoint(config?.azureOpenAiChatEndpoint || config?.azureOpenAiEndpoint)
  const deployment = String(config?.azureOpenAiChatDeploymentName || config?.azureOpenAiDeploymentName || '').trim()
  const apiKey = String(config?.azureOpenAiChatKey || config?.azureOpenAiKey || '').trim()
  const headers = buildAzureAuthHeaders(apiKey, getAzureAuthMode(config, endpoint))
  const maxCompletionTokens = getAzureChatMaxCompletionTokens(config)
  const reasoningEffort = getAzureChatReasoningEffort(config)

  if (!endpoint || !deployment || !apiKey) {
    throw new Error('Azure OpenAI chat credentials missing')
  }

  if (shouldUseAzureV1Api(config, 'chat')) {
    return {
      url: `${endpoint}/openai/v1/chat/completions`,
      model: deployment,
      deployment,
      usesV1Api: true,
      provider: 'azure',
      headers,
      maxCompletionTokens,
      reasoningEffort,
    }
  }

  const apiVersion = String(config?.azureOpenAiApiVersion || '2024-10-21').trim()
  return {
    url: `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`,
    model: deployment,
    deployment,
    usesV1Api: false,
    provider: 'azure',
    headers,
    maxCompletionTokens,
    reasoningEffort,
  }
}

export const buildOpenAiChatCompletionsRequest = (config: any): ChatCompletionsRequest => {
  const apiKey = String(config?.openAiApiKey || '').trim()
  const baseUrl = String(config?.openAiBaseUrl || 'https://api.openai.com').trim().replace(/\/+$/, '')
  const model = String(config?.openAiChatModel || 'gpt-4.1-mini').trim()

  if (!apiKey || !model) {
    throw new Error('OpenAI chat credentials missing')
  }

  return {
    url: `${baseUrl}/v1/chat/completions`,
    model,
    usesV1Api: true,
    provider: 'openai',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  }
}

export const buildOpenRouterChatCompletionsRequest = (config: any): ChatCompletionsRequest => {
  const apiKey = String(config?.openRouterApiKey || '').trim()
  const baseUrl = String(config?.openRouterBaseUrl || 'https://openrouter.ai/api').trim().replace(/\/+$/, '')
  const model = String(config?.openRouterChatModel || 'openai/gpt-oss-20b').trim()
  const siteUrl = String(config?.public?.siteUrl || config?.siteUrl || 'https://replysuite.app').trim()

  if (!apiKey || !model) {
    throw new Error('OpenRouter chat credentials missing')
  }

  return {
    url: `${baseUrl}/v1/chat/completions`,
    model,
    usesV1Api: true,
    provider: 'openrouter',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': siteUrl,
      'X-Title': 'ReplySuite',
    },
  }
}

export const buildGeminiChatCompletionsRequest = (config: any): ChatCompletionsRequest => {
  const apiKey = String(config?.geminiApiKey || '').trim()
  const baseUrl = String(config?.geminiOpenAiBaseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai').trim().replace(/\/+$/, '')
  const model = String(config?.geminiChatModel || 'gemini-2.5-flash').trim()

  if (!apiKey || !model) {
    throw new Error('Gemini chat credentials missing')
  }

  return {
    url: `${baseUrl}/chat/completions`,
    model,
    usesV1Api: true,
    provider: 'gemini',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  }
}

const buildChatRequestForProvider = (provider: ChatProvider, config: any) => {
  switch (provider) {
    case 'openai': return buildOpenAiChatCompletionsRequest(config)
    case 'openrouter': return buildOpenRouterChatCompletionsRequest(config)
    case 'gemini': return buildGeminiChatCompletionsRequest(config)
    case 'azure':
    default:
      return buildAzureChatCompletionsRequest(config)
  }
}

export const buildChatCompletionsRequests = (config: any): ChatCompletionsRequest[] => {
  const requests = getChatProviderOrder(config)
    .map((provider) => safeBuild(() => buildChatRequestForProvider(provider, config)))
    .filter((request): request is ChatCompletionsRequest => !!request)

  if (!requests.length) {
    throw new Error('No chat provider credentials configured')
  }

  return requests
}

export const buildChatCompletionsRequest = (config: any): ChatCompletionsRequest => buildChatCompletionsRequests(config)[0]

export const buildAzureEmbeddingsRequest = (config: any): EmbeddingsRequest => {
  const endpoint = normalizeAzureOpenAiEndpoint(config?.azureOpenAiEmbeddingEndpoint || config?.azureOpenAiEndpoint)
  const deployment = String(config?.azureOpenAiEmbeddingDeploymentName || 'text-embedding-3-large').trim()
  const apiKey = String(config?.azureOpenAiEmbeddingKey || config?.azureOpenAiKey || '').trim()
  const dimensions = getEmbeddingDimensions(config)

  if (!endpoint || !deployment || !apiKey) {
    throw new Error('Azure OpenAI embedding credentials missing')
  }

  if (shouldUseAzureV1Api(config, 'embedding')) {
    return {
      url: `${endpoint}/openai/v1/embeddings`,
      model: deployment,
      dimensions,
      usesV1Api: true,
      provider: 'azure',
      apiFormat: 'openai',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    }
  }

  const apiVersion = String(config?.azureOpenAiApiVersion || '2024-10-21').trim()
  return {
    url: `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/embeddings?api-version=${encodeURIComponent(apiVersion)}`,
    model: deployment,
    dimensions,
    usesV1Api: false,
    provider: 'azure',
    apiFormat: 'openai',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
  }
}

export const buildOpenAiEmbeddingsRequest = (config: any): EmbeddingsRequest => {
  const apiKey = String(config?.openAiApiKey || '').trim()
  const baseUrl = String(config?.openAiBaseUrl || 'https://api.openai.com').trim().replace(/\/+$/, '')
  const model = String(config?.openAiEmbeddingModel || 'text-embedding-3-large').trim()
  const dimensions = getEmbeddingDimensions(config)

  if (!apiKey || !model) {
    throw new Error('OpenAI embedding credentials missing')
  }

  return {
    url: `${baseUrl}/v1/embeddings`,
    model,
    dimensions,
    usesV1Api: true,
    provider: 'openai',
    apiFormat: 'openai',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  }
}

export const buildGeminiEmbeddingsRequest = (config: any): EmbeddingsRequest => {
  const apiKey = String(config?.geminiEmbeddingApiKey || config?.geminiApiKey || '').trim()
  const baseUrl = String(config?.geminiBaseUrl || 'https://generativelanguage.googleapis.com/v1beta').trim().replace(/\/+$/, '')
  const model = String(config?.geminiEmbeddingModel || 'gemini-embedding-001').trim().replace(/^models\//, '')
  const dimensions = getEmbeddingDimensions(config)

  if (!apiKey || !model) {
    throw new Error('Gemini embedding credentials missing')
  }

  return {
    url: `${baseUrl}/models/${encodeURIComponent(model)}:batchEmbedContents?key=${encodeURIComponent(apiKey)}`,
    model: `models/${model}`,
    dimensions,
    usesV1Api: true,
    provider: 'gemini',
    apiFormat: 'gemini',
    headers: { 'Content-Type': 'application/json' },
  }
}

const buildEmbeddingRequestForProvider = (provider: EmbeddingProvider, config: any) => {
  switch (provider) {
    case 'openai': return buildOpenAiEmbeddingsRequest(config)
    case 'gemini': return buildGeminiEmbeddingsRequest(config)
    case 'azure':
    default:
      return buildAzureEmbeddingsRequest(config)
  }
}

export const buildEmbeddingsRequests = (config: any): EmbeddingsRequest[] => {
  const requests = getEmbeddingProviderOrder(config)
    .map((provider) => safeBuild(() => buildEmbeddingRequestForProvider(provider, config)))
    .filter((request): request is EmbeddingsRequest => !!request)

  if (!requests.length) {
    throw new Error('No embedding provider credentials configured')
  }

  return requests
}

export const buildEmbeddingsRequest = (config: any): EmbeddingsRequest => buildEmbeddingsRequests(config)[0]

export const buildAzureChatCompletionsUrl = (config: any) => buildAzureChatCompletionsRequest(config).url
