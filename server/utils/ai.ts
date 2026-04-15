import { createClient } from '@supabase/supabase-js'

/**
 * AI Utility for ReplySuite
 * Supports Gemini (Primary) and Azure (Secondary/Gold fallback)
 * Built for Cloudflare Pages Compatibility (Edge-ready)
 */

export const getEmbeddings = async (text: string) => {
  const config = useRuntimeConfig()
  const apiKey = config.geminiApiKey
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY in runtimeConfig')

  const input = text.replace(/\n/g, ' ').substring(0, 8000)

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text: input }] },
        output_dimensionality: 1536
      })
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message)
    
    // Normalize vectors (required when using truncated output_dimensionality)
    const values = data.embedding.values
    const magnitude = Math.sqrt(values.reduce((acc: number, val: number) => acc + val * val, 0))
    return values.map((val: number) => val / magnitude)
  } catch (error) {
    console.error('[AI Error] Embeddings failed:', error)
    throw error
  }
}

export const getChatCompletion = async (messages: any[], options: { systemPrompt?: string, useAzure?: boolean } = {}) => {
  // If explicitly requested Azure, use it
  if (options.useAzure) {
    return getAzureCompletion(messages, options.systemPrompt)
  }
  
  // Otherwise, try Gemini first, fallback to Azure on failure
  try {
    return await getGeminiCompletion(messages, options.systemPrompt)
  } catch (error: any) {
    const isRateLimit = error.message?.includes('429') || error.message?.toLowerCase().includes('resource exhausted')
    
    if (isRateLimit) {
      console.warn('[AI Fallback] Gemini rate limited. Switching to Azure GPT-4...')
    } else {
      console.error('[AI Error] Gemini failed, attempting Azure fallback...', error.message)
    }

    try {
      return await getAzureCompletion(messages, options.systemPrompt)
    } catch (azureError: any) {
      console.error('[AI Error] Azure fallback also failed:', azureError.message)
      throw new Error(`AI Completion failed (Gemini: ${error.message}, Azure: ${azureError.message})`)
    }
  }
}

async function getGeminiCompletion(messages: any[], systemPrompt?: string) {
  const config = useRuntimeConfig()
  const apiKey = config.geminiApiKey
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY in runtimeConfig')

  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }))

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
        contents
      })
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message)
    
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  } catch (error) {
    console.error('[AI Error] Gemini Completion failed:', error)
    throw error
  }
}

async function getAzureCompletion(messages: any[], systemPrompt?: string) {
  const config = useRuntimeConfig()
  const apiKey = config.azureOpenAiKey
  const endpoint = config.azureOpenAiEndpoint
  const deployment = config.azureOpenAiDeploymentName

  if (!apiKey || !endpoint || !deployment) {
    throw new Error('Azure OpenAI credentials missing in runtimeConfig')
  }

  // Clean endpoint: remove trailing /openai/v1 or slashes if exists
  const cleanEndpoint = endpoint
    .replace(/\/+$/, '')
    .replace(/\/openai\/v1$/, '')

  const apiVersion = '2024-02-15-preview'
  const url = `${cleanEndpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`

  const azureMessages = systemPrompt 
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({ 
        messages: azureMessages,
        temperature: 0.7
      })
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message)

    return data.choices?.[0]?.message?.content || ''
  } catch (error: any) {
    console.error('[AI Error] Azure Completion failed:', error.message)
    throw error
  }
}

/**
 * Perform Vector Search in Supabase Knowledge Base
 */
export const searchKnowledge = async (chatbotId: string, query: string, limit = 3) => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const embedding = await getEmbeddings(query)

  // Use the match_embeddings RPC call (assumes this custom function exists in Postgres/Supabase)
  // We'll need to create this function in Phase 1 migration.
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
