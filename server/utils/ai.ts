/**
 * AI Utility for ReplySuite
 * Uses GPT-compatible providers for chat and embeddings.
 * Current production target: Azure OpenAI GPT-5.5 chat + text-embedding-3-large embeddings.
 */
import {
  buildChatCompletionsRequests,
  buildEmbeddingsRequests,
  type ChatCompletionsRequest,
  type EmbeddingsRequest,
} from './ai-provider'

export const normalizeEmbedding = (values: number[]) => {
  const magnitude = Math.sqrt(values.reduce((acc: number, val: number) => acc + val * val, 0)) || 1
  return values.map((val: number) => val / magnitude)
}

export const isLowIntentChatMessage = (message: string) => {
  const normalized = message
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized || normalized.length > 36) return false

  return /^(hi|hello|hey|yo|sup|good morning|good afternoon|good evening|bonjour|salut|amakuru|amakuru yiminsi|ok|okay|okey|k|cool|great|nice|thanks|thank you|thx|yes|yeah|yep|sure)$/.test(normalized)
}

export const buildLowIntentTurnPrompt = (alreadyGreeted = false) => [
  'The latest user message is only a greeting, acknowledgement, thanks, or very low-intent reply.',
  'Do not use knowledge-base context for this turn.',
  'Reply with one short sentence only.',
  'Do not list features, pricing, plans, setup steps, examples, or services unless the user explicitly asks.',
  alreadyGreeted
    ? 'Because the conversation has already started, do not greet again; simply ask what they want help with next.'
    : 'Give a brief friendly greeting and ask what they need help with.',
].join('\n')

export const getLowIntentDirectReply = (message: string, alreadyGreeted = false) => {
  if (!isLowIntentChatMessage(message)) return null

  const normalized = message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (/^(thanks|thank you|thx)$/.test(normalized)) {
    return 'You’re welcome — what else can I help with?'
  }

  if (/^(ok|okay|okey|k|cool|great|nice|yes|yeah|yep|sure)$/.test(normalized)) {
    return 'Sure — what would you like help with next?'
  }

  return alreadyGreeted
    ? 'How can I help you today?'
    : 'Hi! How can I help you today?'
}

const buildEmbeddingBody = (embeddingRequest: EmbeddingsRequest, texts: string[]) => {
  const inputs = texts.map((value) => value.replace(/\n/g, ' ').substring(0, 8000))

  if (embeddingRequest.apiFormat === 'gemini') {
    return {
      requests: inputs.map((input) => ({
        model: embeddingRequest.model,
        content: { parts: [{ text: input }] },
        outputDimensionality: embeddingRequest.dimensions,
      })),
    }
  }

  const body: Record<string, any> = {
    input: texts.length === 1 ? inputs[0] : inputs,
    dimensions: embeddingRequest.dimensions,
  }

  if (embeddingRequest.usesV1Api) {
    body.model = embeddingRequest.model
  }

  return body
}

const extractEmbeddingValues = (embeddingRequest: EmbeddingsRequest, data: any) => {
  if (embeddingRequest.apiFormat === 'gemini') {
    const embeddings = Array.isArray(data?.embeddings) ? data.embeddings : []
    return embeddings.map((item: any) => item?.values).filter(Array.isArray)
  }

  const embeddings = Array.isArray(data?.data) ? data.data : []
  return embeddings
    .sort((a: any, b: any) => Number(a.index || 0) - Number(b.index || 0))
    .map((item: any) => item?.embedding)
    .filter(Array.isArray)
}

const requestEmbeddings = async (embeddingRequest: EmbeddingsRequest, texts: string[]) => {
  const response = await fetch(embeddingRequest.url, {
    method: 'POST',
    headers: embeddingRequest.headers,
    body: JSON.stringify(buildEmbeddingBody(embeddingRequest, texts)),
  })

  const data: any = await response.json().catch(() => ({}))
  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || `Embedding request failed with HTTP ${response.status}`)
  }

  const values = extractEmbeddingValues(embeddingRequest, data)
  if (values.length !== texts.length || values.some((item: any) => !Array.isArray(item) || !item.length)) {
    throw new Error(`${embeddingRequest.provider} embedding response did not match requested input count.`)
  }

  return values.map((item: number[]) => normalizeEmbedding(item))
}

export const getEmbeddings = async (text: string) => {
  const config = useRuntimeConfig()
  const embeddingRequests = buildEmbeddingsRequests(config)
  const errors: string[] = []

  for (const embeddingRequest of embeddingRequests) {
    try {
      const [embedding] = await requestEmbeddings(embeddingRequest, [text])
      return embedding
    } catch (error: any) {
      errors.push(`${embeddingRequest.provider}: ${error?.message || error}`)
      console.warn(`[Embedding Fallback] ${embeddingRequest.provider} failed, trying next provider if configured:`, error?.message || error)
    }
  }

  throw new Error(`All embedding providers failed: ${errors.join(' | ')}`)
}

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

const buildChatBody = (chatRequest: ChatCompletionsRequest, messages: ChatMessage[], systemPrompt?: string) => {
  const body: Record<string, any> = {
    messages: systemPrompt ? [{ role: 'system', content: systemPrompt }, ...messages] : messages,
  }

  if (chatRequest.usesV1Api) {
    body.model = chatRequest.model
  }

  if (chatRequest.maxCompletionTokens) {
    body.max_completion_tokens = chatRequest.maxCompletionTokens
  }

  if (chatRequest.reasoningEffort) {
    body.reasoning_effort = chatRequest.reasoningEffort
  }

  return body
}

export const getChatCompletion = async (messages: ChatMessage[], options: { systemPrompt?: string, useAzure?: boolean } = {}) => {
  const config = useRuntimeConfig()
  const chatRequests = buildChatCompletionsRequests(config)
  const errors: string[] = []

  for (const chatRequest of chatRequests) {
    try {
      const response = await fetch(chatRequest.url, {
        method: 'POST',
        headers: chatRequest.headers,
        body: JSON.stringify(buildChatBody(chatRequest, messages, options.systemPrompt)),
      })

      const data: any = await response.json().catch(() => ({}))
      if (!response.ok || data?.error) {
        throw new Error(data?.error?.message || `Chat completion request failed with HTTP ${response.status}`)
      }

      return data.choices?.[0]?.message?.content || ''
    } catch (error: any) {
      errors.push(`${chatRequest.provider}: ${error?.message || error}`)
      console.warn(`[Chat Fallback] ${chatRequest.provider} failed, trying next provider if configured:`, error?.message || error)
    }
  }

  throw new Error(`All chat providers failed: ${errors.join(' | ')}`)
}

/**
 * Perform Vector Search in Supabase Knowledge Base
 * @param supabase - The Supabase client (passed from event handler)
 */
export const searchKnowledge = async (supabase: any, chatbotId: string, query: string, limit = 6) => {
  let embedding: number[]

  try {
    embedding = await getEmbeddings(query)
  } catch (error: any) {
    console.warn('[Knowledge Search] GPT embeddings unavailable, continuing without KB context:', error?.message || error)
    return []
  }

  const candidateLimit = Math.max(limit * 2, 8)
  const { data, error } = await supabase.rpc('match_embeddings', {
    query_embedding: embedding,
    match_threshold: 0.45,
    match_count: candidateLimit,
    p_chatbot_id: chatbotId
  })

  if (error) {
    console.error('[DB Error] Vector search failed:', error)
    return []
  }

  const matches = data || []
  if (!matches.length) return []

  const ids = matches.map((row: any) => row.id).filter(Boolean)
  const { data: embeddingRows } = await supabase
    .from('embeddings')
    .select('id, content, source_id, metadata')
    .in('id', ids)

  const embeddingMap = new Map((embeddingRows || []).map((row: any) => [row.id, row]))
  const sourceIds = Array.from(new Set((embeddingRows || []).map((row: any) => row.source_id).filter(Boolean)))

  let sourceMap = new Map<string, any>()
  if (sourceIds.length > 0) {
    const { data: sources } = await supabase
      .from('data_sources')
      .select('id, type, metadata')
      .in('id', sourceIds)

    sourceMap = new Map((sources || []).map((row: any) => [row.id, row]))
  }

  const perSourceCount = new Map<string, number>()
  const seenContent = new Set<string>()
  const enriched: any[] = []

  for (const match of matches) {
    const embeddingRow = embeddingMap.get(match.id)
    const sourceId = embeddingRow?.source_id || 'unknown'
    const sourceCount = perSourceCount.get(sourceId) || 0
    const content = embeddingRow?.content || match.content || ''
    const fingerprint = `${sourceId}:${content.slice(0, 280)}`

    if (!content || seenContent.has(fingerprint)) continue
    if (sourceId !== 'unknown' && sourceCount >= 2) continue

    seenContent.add(fingerprint)
    perSourceCount.set(sourceId, sourceCount + 1)

    const source = sourceMap.get(sourceId)
    enriched.push({
      id: match.id,
      content,
      similarity: match.similarity ?? match.score ?? 0,
      sourceId,
      sourceType: source?.type || embeddingRow?.metadata?.type || null,
      title: source?.metadata?.title || source?.metadata?.filename || embeddingRow?.metadata?.page_title || null,
      url: embeddingRow?.metadata?.page_url || source?.metadata?.url || null,
      metadata: embeddingRow?.metadata || {},
    })

    if (enriched.length >= limit) break
  }

  return enriched
}
