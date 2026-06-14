export type ChatProvider = 'azure' | 'openai'
export type EmbeddingProvider = 'azure' | 'openai'

export type ChatCompletionsRequest = {
  url: string
  model: string
  usesV1Api: boolean
  provider: ChatProvider
  headers: Record<string, string>
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
}

export const getPreferredChatProvider = (config: any): ChatProvider => {
  const provider = String(config?.aiChatProvider || '').trim().toLowerCase()
  return provider === 'openai' ? 'openai' : 'azure'
}

export const getPreferredEmbeddingProvider = (config: any): EmbeddingProvider => {
  const provider = String(config?.aiEmbeddingProvider || '').trim().toLowerCase()
  return provider === 'openai' ? 'openai' : 'azure'
}

export const normalizeAzureOpenAiEndpoint = (endpoint?: string | null) => {
  const normalized = String(endpoint || '').trim().replace(/\/+$/, '')
  if (!normalized) return ''

  return normalized
    .replace(/\/openai\/v\d+$/i, '')
    .replace(/\/openai$/i, '')
}

const shouldUseAzureV1Api = (config: any) => {
  const rawEndpoint = String(config?.azureOpenAiEndpoint || '').trim().replace(/\/+$/, '')
  const apiVersion = String(config?.azureOpenAiApiVersion || '').trim().toLowerCase()
  const apiStyle = String(config?.azureOpenAiApiStyle || '').trim().toLowerCase()

  return apiStyle === 'v1'
    || apiVersion === 'preview'
    || apiVersion === 'v1'
    || /\/openai\/v1$/i.test(rawEndpoint)
}

export const getEmbeddingDimensions = (config: any) => {
  const parsed = Number(config?.azureOpenAiEmbeddingDimensions || config?.openAiEmbeddingDimensions || 1536)
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 1536
}

export const buildAzureChatCompletionsRequest = (config: any): AzureChatCompletionsRequest => {
  const endpoint = normalizeAzureOpenAiEndpoint(config?.azureOpenAiEndpoint)
  const deployment = String(config?.azureOpenAiDeploymentName || '').trim()
  const apiKey = String(config?.azureOpenAiKey || '').trim()

  if (!endpoint || !deployment || !apiKey) {
    throw new Error('Azure OpenAI chat credentials missing')
  }

  if (shouldUseAzureV1Api(config)) {
    return {
      url: `${endpoint}/openai/v1/chat/completions`,
      model: deployment,
      deployment,
      usesV1Api: true,
      provider: 'azure',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    }
  }

  const apiVersion = String(config?.azureOpenAiApiVersion || '2024-10-21').trim()
  return {
    url: `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`,
    model: deployment,
    deployment,
    usesV1Api: false,
    provider: 'azure',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
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

export const buildChatCompletionsRequest = (config: any): ChatCompletionsRequest => (
  getPreferredChatProvider(config) === 'openai'
    ? buildOpenAiChatCompletionsRequest(config)
    : buildAzureChatCompletionsRequest(config)
)

export const buildAzureEmbeddingsRequest = (config: any): EmbeddingsRequest => {
  const endpoint = normalizeAzureOpenAiEndpoint(config?.azureOpenAiEndpoint)
  const deployment = String(config?.azureOpenAiEmbeddingDeploymentName || 'text-embedding-3-large').trim()
  const apiKey = String(config?.azureOpenAiKey || '').trim()
  const dimensions = getEmbeddingDimensions(config)

  if (!endpoint || !deployment || !apiKey) {
    throw new Error('Azure OpenAI embedding credentials missing')
  }

  if (shouldUseAzureV1Api(config)) {
    return {
      url: `${endpoint}/openai/v1/embeddings`,
      model: deployment,
      dimensions,
      usesV1Api: true,
      provider: 'azure',
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
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  }
}

export const buildEmbeddingsRequest = (config: any): EmbeddingsRequest => (
  getPreferredEmbeddingProvider(config) === 'openai'
    ? buildOpenAiEmbeddingsRequest(config)
    : buildAzureEmbeddingsRequest(config)
)

export const buildAzureChatCompletionsUrl = (config: any) => buildAzureChatCompletionsRequest(config).url
