/**
 * AI Utility for ReplySuite
 * Supports Gemini (Primary) and Azure (Secondary/Gold fallback)
 * Hardened for SSR Stability: No top-level Supabase imports.
 */

export const getEmbeddings = async (text: string) => {
  const config = useRuntimeConfig()
  const apiKey = config.geminiApiKey
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY in runtimeConfig')

  const input = text.replace(/\n/g, ' ').substring(0, 8000)

  // 1. Try Gemini Embeddings with different model aliases
  const models = ['text-embedding-004', 'embedding-001', 'gemini-embedding-2', 'gemini-embedding-001']
  let lastError = ''

  for (const model of models) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text: input }] },
          output_dimensionality: 1536
        })
      })

      if (!response.ok) {
        lastError = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errData = await response.json()
          if (errData.error?.message) lastError = errData.error.message
        } catch(e) { /* ignore JSON parsing error on 404s */ }
        continue
      }

      const data = await response.json()
      if (!data.error && data.embedding) {
        const values = data.embedding.values
        const magnitude = Math.sqrt(values.reduce((acc: number, val: number) => acc + val * val, 0))
        return values.map((val: number) => val / magnitude)
      }
      lastError = data.error?.message || 'Unknown embedding error'
    } catch (err: any) {
      lastError = err.message
    }
  }

  throw new Error(`Embedding generation failed: ${lastError}. NOTE: Azure fallback is disabled for embeddings to prevent vector mismatches with the database.`)
}

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export const getChatCompletion = async (messages: ChatMessage[], options: { systemPrompt?: string, useAzure?: boolean } = {}) => {
  const config = useRuntimeConfig()

  // Helper for Gemini
  async function getGemini(msgs: ChatMessage[], sys?: string) {
    const apiKey = config.geminiApiKey
    if (!apiKey) throw new Error('Gemini API Key missing')
    
    const contents = msgs.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp']
    let lastError = ''

    for (const model of models) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: sys ? { parts: [{ text: sys }] } : undefined,
            contents
          })
        })

        const data = await response.json()
        if (!data.error) {
          return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        }
        lastError = data.error.message
        console.warn(`[AI Utils] Model ${model} failed:`, lastError)
      } catch (err: any) {
        lastError = err.message
      }
    }

    throw new Error(`Gemini Error: ${lastError}`)
  }

  // Helper for Azure
  async function getAzure(msgs: ChatMessage[], sys?: string) {
    const apiKey = config.azureOpenAiKey
    const endpoint = config.azureOpenAiEndpoint
    const deployment = config.azureOpenAiDeploymentName
    if (!apiKey || !endpoint || !deployment) throw new Error('Azure credentials missing')

    const azureUrl = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-15-preview`
    const body = {
      messages: sys ? [{ role: 'system', content: sys }, ...msgs] : msgs
    }

    const response = await fetch(azureUrl, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message)
    return data.choices?.[0]?.message?.content || ''
  }

  if (options.useAzure) {
    return await getAzure(messages, options.systemPrompt)
  }

  try {
    return await getGemini(messages, options.systemPrompt)
  } catch (err: any) {
    console.warn('[AI Fallback] Gemini failed, trying Azure:', err.message)
    return await getAzure(messages, options.systemPrompt)
  }
}

/**
 * Perform Vector Search in Supabase Knowledge Base
 * @param supabase - The Supabase client (passed from event handler)
 */
export const searchKnowledge = async (supabase: any, chatbotId: string, query: string, limit = 6) => {
  const embedding = await getEmbeddings(query)

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
