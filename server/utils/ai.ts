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
export const searchKnowledge = async (supabase: any, chatbotId: string, query: string, limit = 3) => {
  const embedding = await getEmbeddings(query)

  const { data, error } = await supabase.rpc('match_embeddings', {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: limit,
    p_chatbot_id: chatbotId
  })

  if (error) {
    console.error('[DB Error] Vector search failed:', error)
    return []
  }

  return data || []
}
